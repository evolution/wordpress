# Snapshots configuration

* [Local vs cloud storage](#local-vs-cloud-storage)
* [Storage method](#storage-method)
* [Storage credentials](#storage-credentials)
* [Storage container](#storage-container)
* [Backup interval](#backup-interval)
* [Backup retention](#backup-retention)

---

> See also the snapshot-specific [cap tasks](./REF-cap-tasks.md).

### Local vs Cloud Storage

Keeping backups on the local filesystem, while simpler to configure, does not make for a good disaster recovery scenario. To this end, Evolution now supports snapshots to a variety of cloud storage providers via [Apache Libcloud](https://libcloud.readthedocs.io/en/latest/).

A commented out default configuration (for local storage) can be found in your ansible group vars (`lib/ansible/group_vars/all` within your project):

```yml
# snapshots__method: local
# snapshots__credentials: ~
# snapshots__container: /home/deploy/backup/production.example.com
# snapshots__interval: 1d
# snapshots__retention: { hours: ~, days: 1, weeks: 1, months: 1, years: 1 }
# snapshots__retention_lag: true
```

To enable backups, uncomment _at least one_ of the above variables and reprovision your production remote. This will install the backup script and set up a cron job to run it regularly.

> Note: The script is run every hour, but new backups are created and old backups removed only as often as your configured `interval`.

Each backup consists of a sql dump of your database and a copy of your wordpress uploads directory, rolled into a gzipped tar archive.

### Storage Method

The default is to backup to the local filesystem, but you can use [any storage provider supported by libcloud](https://libcloud.readthedocs.io/en/latest/storage/supported_providers.html#supported-methods-storage). Just plug in the given provider's constant (case insensitive):

```yml
# Rackspace Cloud Files
snapshots__method: cloudfiles
# Google Cloud Storage
snapshots__method: google_storage
# Amazon Simple Storage Service
snapshots__method: s3
```

### Storage Credentials

For all methods but local storage, you _must_ supply authentication credentials for your cloud provider. You can do so with positional or named parameters, [as documented in the libcloud API](https://libcloud.readthedocs.io/en/latest/storage/api.html#libcloud.storage.base.StorageDriver):

```yml
# S3
snapshots__credentials:
  - "My AWS api key"
  - "My AWS secret key"
# Rackspace
snapshots__credentials:
  key: "My Rackspace username"
  secret: "My Rackspace api key"
```

### Storage Container

For local storage, the `container` serves as a path to the directory in which all backups are stored. For all other storage methods, it serves as [a container in libcloud's terminology](https://libcloud.readthedocs.io/en/latest/storage/index.html#terminology), wherein backups are stored as objects within the given container.

Typically, you would want to create a container (an S3 bucket, for example) in advance and then plug it into your group vars. That said, the backup script **will attempt to create the container if it does not already exist**. This may or may not succeed, depending on user permissions.

```yml
# Defaults to "$stage.$domain"...
snapshots__container: "local.example.com"
# Use the below named S3 bucket
snapshots__container: "My.S3.bucket.name"
```

### Backup interval

Evolution supports snapshot backups as often as _once an hour_, but the default is a more conservative _once a day_.

The interval should be a number followed by a letter indicating the unit of time, in hours, days, weeks, months or years:

```yml
# Every eight hours
snapshots__interval: 8h
# Every two days
snapshots__interval: 2d
# Every three weeks
snapshots__interval: 3w
# Every four months
snapshots__interval: 4m
# Every year
snapshots__interval: 1y
```

### Backup retention

Evolution supports a retention policy for your backups, loosely based on the [grandfather-father-son scheme](https://en.wikipedia.org/wiki/Backup_rotation_scheme#Grandfather-father-son_backup). This allows you to keep a variety of older and newer backups, without filling up your storage.

```yml
snapshots__retention:
  hours: ~
  days: 1
  weeks: 1
  months: 1
  years: 1
snapshots__retention_lag: true
```

The default retention policy (above) preserves one yearly, one monthly, one weekly, and one daily backup. The rest would be pruned over time, as more recent backups are created.

> Note: Retention can be _deliberately kept one interval unit back from the current time_ with the `retention_lag` variable, in order to retain a backup of each period. (This is turned _on_ by default!)
>
> For example, with the default interval of once a day, you would create a new backup on Sunday (the start of a new week) and be left with a "yearly" (from January 1st), a "monthly" (from the 1st of the current month), a previous "weekly" (from the previous Sunday), and _possibly_ a previous daily from Saturday.
>
> This happens because the retention calculation would believe it is still Saturday (back one "interval" day), in order to preserve the previous weekly backup. **Turning off the retention lag** would cause the previous Sunday's "weekly" to be removed, leaving you with just the yearly, monthly, and today.

This is best illustrated by running the backup script with the `--simulate` flag, which will display all backups that _would have been_ created and deleted for **one year ago from the current date and time**. (For brevity, only the retained backups are shown below.)

With retention lag turned on:

```
created on                  deleted on                  retained for       filename
--------------------------  --------------------------  -----------------  -------------------------------------------------------
2017-01-01 17:53:12.631052                              176 days, 0:00:00  production.example.com-2017-01-01_17-53-12.631052.tgz
2017-06-01 17:53:12.631052                              25 days, 0:00:00   production.example.com-2017-06-01_17-53-12.631052.tgz
2017-06-18 17:53:12.631052                              8 days, 0:00:00    production.example.com-2017-06-18_17-53-12.631052.tgz
2017-06-24 17:53:12.631052                              2 days, 0:00:00    production.example.com-2017-06-24_17-53-12.631052.tgz
2017-06-25 17:53:12.631052                              1 day, 0:00:00     production.example.com-2017-06-25_17-53-12.631052.tgz
```

And with retention_lag turned _off_:

```
created on                  deleted on                  retained for       filename
--------------------------  --------------------------  -----------------  -------------------------------------------------------
2017-01-01 17:53:17.027798                              176 days, 0:00:00  production.example.com-2017-01-01_17-53-17.027798.tgz
2017-06-01 17:53:17.027798                              25 days, 0:00:00   production.example.com-2017-06-01_17-53-17.027798.tgz
2017-06-25 17:53:17.027798                              1 day, 0:00:00     production.example.com-2017-06-25_17-53-17.027798.tgz
```

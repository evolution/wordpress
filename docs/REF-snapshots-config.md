# Snapshots configuration

* [Local vs cloud storage](#local-vs-cloud-storage)
* [Storage method](#storage-method)
* [Storage credentials](#storage-credentials)
* [Storage container](#storage-container)
* [Backup interval](#backup-interval)
* [Backup retention](#backup-retention)

---

### Local vs Cloud Storage

Keeping backups on the local filesystem, while simpler to configure, does not make for a good disaster recovery scenario. To this end, Evolution now supports snapshots to a variety of cloud storage providers via [Apache Libcloud](https://libcloud.readthedocs.io/en/latest/).

A commented out default configuration (for local storage) can be found in your ansible group vars (`lib/ansible/group_vars/all` within your project):

```yml
# snapshots__method: local
# snapshots__credentials: ~
# snapshots__container: /home/deploy/backup/production.example.com
# snapshots__interval: 1d
# snapshots__retention: { hours: ~, days: 1, weeks: 1, months: 1, years: 1 }
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
```

The default retention policy (above) preserves one yearly, one monthly, one weekly, and one daily backup. The rest would be pruned over time, as more recent backups are created:

This is best illustrated by running the backup script with the `--simulate` flag, which will display all backups that _would have been_ created and deleted for **one year ago from the current date and time**:

```
created on                  deleted on                  retained for       filename
--------------------------  --------------------------  -----------------  -------------------------------------------------------
2016-06-25 00:00:00.044872  2017-01-01 00:00:00.044872  190 days, 0:00:00  local.hardcorenudoty.com-2016-06-25_00-00-00.044872.tgz
2016-06-26 00:00:00.044872  2016-07-03 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-06-26_00-00-00.044872.tgz
2016-06-27 00:00:00.044872  2016-06-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-06-27_00-00-00.044872.tgz
2016-06-28 00:00:00.044872  2016-06-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-06-28_00-00-00.044872.tgz
2016-06-29 00:00:00.044872  2016-06-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-06-29_00-00-00.044872.tgz
2016-06-30 00:00:00.044872  2016-07-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-06-30_00-00-00.044872.tgz
2016-07-01 00:00:00.044872  2016-08-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2016-07-01_00-00-00.044872.tgz
2016-07-02 00:00:00.044872  2016-07-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-02_00-00-00.044872.tgz
2016-07-03 00:00:00.044872  2016-07-10 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-07-03_00-00-00.044872.tgz
2016-07-04 00:00:00.044872  2016-07-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-04_00-00-00.044872.tgz
2016-07-05 00:00:00.044872  2016-07-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-05_00-00-00.044872.tgz
2016-07-06 00:00:00.044872  2016-07-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-06_00-00-00.044872.tgz
2016-07-07 00:00:00.044872  2016-07-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-07_00-00-00.044872.tgz
2016-07-08 00:00:00.044872  2016-07-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-08_00-00-00.044872.tgz
2016-07-09 00:00:00.044872  2016-07-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-09_00-00-00.044872.tgz
2016-07-10 00:00:00.044872  2016-07-17 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-07-10_00-00-00.044872.tgz
2016-07-11 00:00:00.044872  2016-07-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-11_00-00-00.044872.tgz
2016-07-12 00:00:00.044872  2016-07-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-12_00-00-00.044872.tgz
2016-07-13 00:00:00.044872  2016-07-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-13_00-00-00.044872.tgz
2016-07-14 00:00:00.044872  2016-07-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-14_00-00-00.044872.tgz
2016-07-15 00:00:00.044872  2016-07-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-15_00-00-00.044872.tgz
2016-07-16 00:00:00.044872  2016-07-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-16_00-00-00.044872.tgz
2016-07-17 00:00:00.044872  2016-07-24 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-07-17_00-00-00.044872.tgz
2016-07-18 00:00:00.044872  2016-07-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-18_00-00-00.044872.tgz
2016-07-19 00:00:00.044872  2016-07-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-19_00-00-00.044872.tgz
2016-07-20 00:00:00.044872  2016-07-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-20_00-00-00.044872.tgz
2016-07-21 00:00:00.044872  2016-07-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-21_00-00-00.044872.tgz
2016-07-22 00:00:00.044872  2016-07-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-22_00-00-00.044872.tgz
2016-07-23 00:00:00.044872  2016-07-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-23_00-00-00.044872.tgz
2016-07-24 00:00:00.044872  2016-07-31 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-07-24_00-00-00.044872.tgz
2016-07-25 00:00:00.044872  2016-07-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-25_00-00-00.044872.tgz
2016-07-26 00:00:00.044872  2016-07-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-26_00-00-00.044872.tgz
2016-07-27 00:00:00.044872  2016-07-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-27_00-00-00.044872.tgz
2016-07-28 00:00:00.044872  2016-07-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-28_00-00-00.044872.tgz
2016-07-29 00:00:00.044872  2016-07-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-29_00-00-00.044872.tgz
2016-07-30 00:00:00.044872  2016-07-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-07-30_00-00-00.044872.tgz
2016-07-31 00:00:00.044872  2016-08-07 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-07-31_00-00-00.044872.tgz
2016-08-01 00:00:00.044872  2016-09-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2016-08-01_00-00-00.044872.tgz
2016-08-02 00:00:00.044872  2016-08-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-02_00-00-00.044872.tgz
2016-08-03 00:00:00.044872  2016-08-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-03_00-00-00.044872.tgz
2016-08-04 00:00:00.044872  2016-08-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-04_00-00-00.044872.tgz
2016-08-05 00:00:00.044872  2016-08-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-05_00-00-00.044872.tgz
2016-08-06 00:00:00.044872  2016-08-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-06_00-00-00.044872.tgz
2016-08-07 00:00:00.044872  2016-08-14 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-08-07_00-00-00.044872.tgz
2016-08-08 00:00:00.044872  2016-08-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-08_00-00-00.044872.tgz
2016-08-09 00:00:00.044872  2016-08-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-09_00-00-00.044872.tgz
2016-08-10 00:00:00.044872  2016-08-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-10_00-00-00.044872.tgz
2016-08-11 00:00:00.044872  2016-08-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-11_00-00-00.044872.tgz
2016-08-12 00:00:00.044872  2016-08-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-12_00-00-00.044872.tgz
2016-08-13 00:00:00.044872  2016-08-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-13_00-00-00.044872.tgz
2016-08-14 00:00:00.044872  2016-08-21 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-08-14_00-00-00.044872.tgz
2016-08-15 00:00:00.044872  2016-08-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-15_00-00-00.044872.tgz
2016-08-16 00:00:00.044872  2016-08-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-16_00-00-00.044872.tgz
2016-08-17 00:00:00.044872  2016-08-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-17_00-00-00.044872.tgz
2016-08-18 00:00:00.044872  2016-08-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-18_00-00-00.044872.tgz
2016-08-19 00:00:00.044872  2016-08-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-19_00-00-00.044872.tgz
2016-08-20 00:00:00.044872  2016-08-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-20_00-00-00.044872.tgz
2016-08-21 00:00:00.044872  2016-08-28 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-08-21_00-00-00.044872.tgz
2016-08-22 00:00:00.044872  2016-08-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-22_00-00-00.044872.tgz
2016-08-23 00:00:00.044872  2016-08-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-23_00-00-00.044872.tgz
2016-08-24 00:00:00.044872  2016-08-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-24_00-00-00.044872.tgz
2016-08-25 00:00:00.044872  2016-08-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-25_00-00-00.044872.tgz
2016-08-26 00:00:00.044872  2016-08-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-26_00-00-00.044872.tgz
2016-08-27 00:00:00.044872  2016-08-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-27_00-00-00.044872.tgz
2016-08-28 00:00:00.044872  2016-09-04 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-08-28_00-00-00.044872.tgz
2016-08-29 00:00:00.044872  2016-08-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-29_00-00-00.044872.tgz
2016-08-30 00:00:00.044872  2016-08-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-30_00-00-00.044872.tgz
2016-08-31 00:00:00.044872  2016-09-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-08-31_00-00-00.044872.tgz
2016-09-01 00:00:00.044872  2016-10-01 00:00:00.044872  30 days, 0:00:00   local.hardcorenudoty.com-2016-09-01_00-00-00.044872.tgz
2016-09-02 00:00:00.044872  2016-09-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-02_00-00-00.044872.tgz
2016-09-03 00:00:00.044872  2016-09-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-03_00-00-00.044872.tgz
2016-09-04 00:00:00.044872  2016-09-11 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-09-04_00-00-00.044872.tgz
2016-09-05 00:00:00.044872  2016-09-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-05_00-00-00.044872.tgz
2016-09-06 00:00:00.044872  2016-09-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-06_00-00-00.044872.tgz
2016-09-07 00:00:00.044872  2016-09-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-07_00-00-00.044872.tgz
2016-09-08 00:00:00.044872  2016-09-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-08_00-00-00.044872.tgz
2016-09-09 00:00:00.044872  2016-09-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-09_00-00-00.044872.tgz
2016-09-10 00:00:00.044872  2016-09-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-10_00-00-00.044872.tgz
2016-09-11 00:00:00.044872  2016-09-18 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-09-11_00-00-00.044872.tgz
2016-09-12 00:00:00.044872  2016-09-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-12_00-00-00.044872.tgz
2016-09-13 00:00:00.044872  2016-09-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-13_00-00-00.044872.tgz
2016-09-14 00:00:00.044872  2016-09-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-14_00-00-00.044872.tgz
2016-09-15 00:00:00.044872  2016-09-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-15_00-00-00.044872.tgz
2016-09-16 00:00:00.044872  2016-09-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-16_00-00-00.044872.tgz
2016-09-17 00:00:00.044872  2016-09-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-17_00-00-00.044872.tgz
2016-09-18 00:00:00.044872  2016-09-25 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-09-18_00-00-00.044872.tgz
2016-09-19 00:00:00.044872  2016-09-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-19_00-00-00.044872.tgz
2016-09-20 00:00:00.044872  2016-09-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-20_00-00-00.044872.tgz
2016-09-21 00:00:00.044872  2016-09-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-21_00-00-00.044872.tgz
2016-09-22 00:00:00.044872  2016-09-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-22_00-00-00.044872.tgz
2016-09-23 00:00:00.044872  2016-09-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-23_00-00-00.044872.tgz
2016-09-24 00:00:00.044872  2016-09-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-24_00-00-00.044872.tgz
2016-09-25 00:00:00.044872  2016-10-02 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-09-25_00-00-00.044872.tgz
2016-09-26 00:00:00.044872  2016-09-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-26_00-00-00.044872.tgz
2016-09-27 00:00:00.044872  2016-09-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-27_00-00-00.044872.tgz
2016-09-28 00:00:00.044872  2016-09-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-28_00-00-00.044872.tgz
2016-09-29 00:00:00.044872  2016-09-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-29_00-00-00.044872.tgz
2016-09-30 00:00:00.044872  2016-10-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-09-30_00-00-00.044872.tgz
2016-10-01 00:00:00.044872  2016-11-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2016-10-01_00-00-00.044872.tgz
2016-10-02 00:00:00.044872  2016-10-09 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-10-02_00-00-00.044872.tgz
2016-10-03 00:00:00.044872  2016-10-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-03_00-00-00.044872.tgz
2016-10-04 00:00:00.044872  2016-10-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-04_00-00-00.044872.tgz
2016-10-05 00:00:00.044872  2016-10-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-05_00-00-00.044872.tgz
2016-10-06 00:00:00.044872  2016-10-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-06_00-00-00.044872.tgz
2016-10-07 00:00:00.044872  2016-10-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-07_00-00-00.044872.tgz
2016-10-08 00:00:00.044872  2016-10-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-08_00-00-00.044872.tgz
2016-10-09 00:00:00.044872  2016-10-16 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-10-09_00-00-00.044872.tgz
2016-10-10 00:00:00.044872  2016-10-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-10_00-00-00.044872.tgz
2016-10-11 00:00:00.044872  2016-10-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-11_00-00-00.044872.tgz
2016-10-12 00:00:00.044872  2016-10-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-12_00-00-00.044872.tgz
2016-10-13 00:00:00.044872  2016-10-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-13_00-00-00.044872.tgz
2016-10-14 00:00:00.044872  2016-10-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-14_00-00-00.044872.tgz
2016-10-15 00:00:00.044872  2016-10-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-15_00-00-00.044872.tgz
2016-10-16 00:00:00.044872  2016-10-23 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-10-16_00-00-00.044872.tgz
2016-10-17 00:00:00.044872  2016-10-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-17_00-00-00.044872.tgz
2016-10-18 00:00:00.044872  2016-10-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-18_00-00-00.044872.tgz
2016-10-19 00:00:00.044872  2016-10-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-19_00-00-00.044872.tgz
2016-10-20 00:00:00.044872  2016-10-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-20_00-00-00.044872.tgz
2016-10-21 00:00:00.044872  2016-10-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-21_00-00-00.044872.tgz
2016-10-22 00:00:00.044872  2016-10-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-22_00-00-00.044872.tgz
2016-10-23 00:00:00.044872  2016-10-30 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-10-23_00-00-00.044872.tgz
2016-10-24 00:00:00.044872  2016-10-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-24_00-00-00.044872.tgz
2016-10-25 00:00:00.044872  2016-10-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-25_00-00-00.044872.tgz
2016-10-26 00:00:00.044872  2016-10-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-26_00-00-00.044872.tgz
2016-10-27 00:00:00.044872  2016-10-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-27_00-00-00.044872.tgz
2016-10-28 00:00:00.044872  2016-10-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-28_00-00-00.044872.tgz
2016-10-29 00:00:00.044872  2016-10-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-29_00-00-00.044872.tgz
2016-10-30 00:00:00.044872  2016-11-06 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-10-30_00-00-00.044872.tgz
2016-10-31 00:00:00.044872  2016-11-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-10-31_00-00-00.044872.tgz
2016-11-01 00:00:00.044872  2016-12-01 00:00:00.044872  30 days, 0:00:00   local.hardcorenudoty.com-2016-11-01_00-00-00.044872.tgz
2016-11-02 00:00:00.044872  2016-11-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-02_00-00-00.044872.tgz
2016-11-03 00:00:00.044872  2016-11-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-03_00-00-00.044872.tgz
2016-11-04 00:00:00.044872  2016-11-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-04_00-00-00.044872.tgz
2016-11-05 00:00:00.044872  2016-11-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-05_00-00-00.044872.tgz
2016-11-06 00:00:00.044872  2016-11-13 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-11-06_00-00-00.044872.tgz
2016-11-07 00:00:00.044872  2016-11-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-07_00-00-00.044872.tgz
2016-11-08 00:00:00.044872  2016-11-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-08_00-00-00.044872.tgz
2016-11-09 00:00:00.044872  2016-11-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-09_00-00-00.044872.tgz
2016-11-10 00:00:00.044872  2016-11-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-10_00-00-00.044872.tgz
2016-11-11 00:00:00.044872  2016-11-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-11_00-00-00.044872.tgz
2016-11-12 00:00:00.044872  2016-11-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-12_00-00-00.044872.tgz
2016-11-13 00:00:00.044872  2016-11-20 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-11-13_00-00-00.044872.tgz
2016-11-14 00:00:00.044872  2016-11-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-14_00-00-00.044872.tgz
2016-11-15 00:00:00.044872  2016-11-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-15_00-00-00.044872.tgz
2016-11-16 00:00:00.044872  2016-11-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-16_00-00-00.044872.tgz
2016-11-17 00:00:00.044872  2016-11-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-17_00-00-00.044872.tgz
2016-11-18 00:00:00.044872  2016-11-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-18_00-00-00.044872.tgz
2016-11-19 00:00:00.044872  2016-11-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-19_00-00-00.044872.tgz
2016-11-20 00:00:00.044872  2016-11-27 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-11-20_00-00-00.044872.tgz
2016-11-21 00:00:00.044872  2016-11-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-21_00-00-00.044872.tgz
2016-11-22 00:00:00.044872  2016-11-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-22_00-00-00.044872.tgz
2016-11-23 00:00:00.044872  2016-11-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-23_00-00-00.044872.tgz
2016-11-24 00:00:00.044872  2016-11-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-24_00-00-00.044872.tgz
2016-11-25 00:00:00.044872  2016-11-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-25_00-00-00.044872.tgz
2016-11-26 00:00:00.044872  2016-11-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-26_00-00-00.044872.tgz
2016-11-27 00:00:00.044872  2016-12-04 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-11-27_00-00-00.044872.tgz
2016-11-28 00:00:00.044872  2016-11-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-28_00-00-00.044872.tgz
2016-11-29 00:00:00.044872  2016-11-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-29_00-00-00.044872.tgz
2016-11-30 00:00:00.044872  2016-12-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-11-30_00-00-00.044872.tgz
2016-12-01 00:00:00.044872  2017-01-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2016-12-01_00-00-00.044872.tgz
2016-12-02 00:00:00.044872  2016-12-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-02_00-00-00.044872.tgz
2016-12-03 00:00:00.044872  2016-12-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-03_00-00-00.044872.tgz
2016-12-04 00:00:00.044872  2016-12-11 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-12-04_00-00-00.044872.tgz
2016-12-05 00:00:00.044872  2016-12-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-05_00-00-00.044872.tgz
2016-12-06 00:00:00.044872  2016-12-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-06_00-00-00.044872.tgz
2016-12-07 00:00:00.044872  2016-12-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-07_00-00-00.044872.tgz
2016-12-08 00:00:00.044872  2016-12-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-08_00-00-00.044872.tgz
2016-12-09 00:00:00.044872  2016-12-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-09_00-00-00.044872.tgz
2016-12-10 00:00:00.044872  2016-12-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-10_00-00-00.044872.tgz
2016-12-11 00:00:00.044872  2016-12-18 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-12-11_00-00-00.044872.tgz
2016-12-12 00:00:00.044872  2016-12-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-12_00-00-00.044872.tgz
2016-12-13 00:00:00.044872  2016-12-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-13_00-00-00.044872.tgz
2016-12-14 00:00:00.044872  2016-12-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-14_00-00-00.044872.tgz
2016-12-15 00:00:00.044872  2016-12-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-15_00-00-00.044872.tgz
2016-12-16 00:00:00.044872  2016-12-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-16_00-00-00.044872.tgz
2016-12-17 00:00:00.044872  2016-12-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-17_00-00-00.044872.tgz
2016-12-18 00:00:00.044872  2016-12-25 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-12-18_00-00-00.044872.tgz
2016-12-19 00:00:00.044872  2016-12-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-19_00-00-00.044872.tgz
2016-12-20 00:00:00.044872  2016-12-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-20_00-00-00.044872.tgz
2016-12-21 00:00:00.044872  2016-12-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-21_00-00-00.044872.tgz
2016-12-22 00:00:00.044872  2016-12-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-22_00-00-00.044872.tgz
2016-12-23 00:00:00.044872  2016-12-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-23_00-00-00.044872.tgz
2016-12-24 00:00:00.044872  2016-12-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-24_00-00-00.044872.tgz
2016-12-25 00:00:00.044872  2017-01-01 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2016-12-25_00-00-00.044872.tgz
2016-12-26 00:00:00.044872  2016-12-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-26_00-00-00.044872.tgz
2016-12-27 00:00:00.044872  2016-12-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-27_00-00-00.044872.tgz
2016-12-28 00:00:00.044872  2016-12-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-28_00-00-00.044872.tgz
2016-12-29 00:00:00.044872  2016-12-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-29_00-00-00.044872.tgz
2016-12-30 00:00:00.044872  2016-12-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-30_00-00-00.044872.tgz
2016-12-31 00:00:00.044872  2017-01-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2016-12-31_00-00-00.044872.tgz
2017-01-01 00:00:00.044872                              175 days, 0:00:00  local.hardcorenudoty.com-2017-01-01_00-00-00.044872.tgz
2017-01-02 00:00:00.044872  2017-01-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-02_00-00-00.044872.tgz
2017-01-03 00:00:00.044872  2017-01-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-03_00-00-00.044872.tgz
2017-01-04 00:00:00.044872  2017-01-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-04_00-00-00.044872.tgz
2017-01-05 00:00:00.044872  2017-01-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-05_00-00-00.044872.tgz
2017-01-06 00:00:00.044872  2017-01-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-06_00-00-00.044872.tgz
2017-01-07 00:00:00.044872  2017-01-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-07_00-00-00.044872.tgz
2017-01-08 00:00:00.044872  2017-01-15 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-01-08_00-00-00.044872.tgz
2017-01-09 00:00:00.044872  2017-01-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-09_00-00-00.044872.tgz
2017-01-10 00:00:00.044872  2017-01-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-10_00-00-00.044872.tgz
2017-01-11 00:00:00.044872  2017-01-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-11_00-00-00.044872.tgz
2017-01-12 00:00:00.044872  2017-01-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-12_00-00-00.044872.tgz
2017-01-13 00:00:00.044872  2017-01-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-13_00-00-00.044872.tgz
2017-01-14 00:00:00.044872  2017-01-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-14_00-00-00.044872.tgz
2017-01-15 00:00:00.044872  2017-01-22 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-01-15_00-00-00.044872.tgz
2017-01-16 00:00:00.044872  2017-01-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-16_00-00-00.044872.tgz
2017-01-17 00:00:00.044872  2017-01-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-17_00-00-00.044872.tgz
2017-01-18 00:00:00.044872  2017-01-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-18_00-00-00.044872.tgz
2017-01-19 00:00:00.044872  2017-01-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-19_00-00-00.044872.tgz
2017-01-20 00:00:00.044872  2017-01-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-20_00-00-00.044872.tgz
2017-01-21 00:00:00.044872  2017-01-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-21_00-00-00.044872.tgz
2017-01-22 00:00:00.044872  2017-01-29 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-01-22_00-00-00.044872.tgz
2017-01-23 00:00:00.044872  2017-01-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-23_00-00-00.044872.tgz
2017-01-24 00:00:00.044872  2017-01-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-24_00-00-00.044872.tgz
2017-01-25 00:00:00.044872  2017-01-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-25_00-00-00.044872.tgz
2017-01-26 00:00:00.044872  2017-01-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-26_00-00-00.044872.tgz
2017-01-27 00:00:00.044872  2017-01-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-27_00-00-00.044872.tgz
2017-01-28 00:00:00.044872  2017-01-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-28_00-00-00.044872.tgz
2017-01-29 00:00:00.044872  2017-02-05 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-01-29_00-00-00.044872.tgz
2017-01-30 00:00:00.044872  2017-01-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-30_00-00-00.044872.tgz
2017-01-31 00:00:00.044872  2017-02-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-01-31_00-00-00.044872.tgz
2017-02-01 00:00:00.044872  2017-03-01 00:00:00.044872  28 days, 0:00:00   local.hardcorenudoty.com-2017-02-01_00-00-00.044872.tgz
2017-02-02 00:00:00.044872  2017-02-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-02_00-00-00.044872.tgz
2017-02-03 00:00:00.044872  2017-02-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-03_00-00-00.044872.tgz
2017-02-04 00:00:00.044872  2017-02-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-04_00-00-00.044872.tgz
2017-02-05 00:00:00.044872  2017-02-12 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-02-05_00-00-00.044872.tgz
2017-02-06 00:00:00.044872  2017-02-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-06_00-00-00.044872.tgz
2017-02-07 00:00:00.044872  2017-02-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-07_00-00-00.044872.tgz
2017-02-08 00:00:00.044872  2017-02-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-08_00-00-00.044872.tgz
2017-02-09 00:00:00.044872  2017-02-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-09_00-00-00.044872.tgz
2017-02-10 00:00:00.044872  2017-02-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-10_00-00-00.044872.tgz
2017-02-11 00:00:00.044872  2017-02-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-11_00-00-00.044872.tgz
2017-02-12 00:00:00.044872  2017-02-19 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-02-12_00-00-00.044872.tgz
2017-02-13 00:00:00.044872  2017-02-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-13_00-00-00.044872.tgz
2017-02-14 00:00:00.044872  2017-02-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-14_00-00-00.044872.tgz
2017-02-15 00:00:00.044872  2017-02-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-15_00-00-00.044872.tgz
2017-02-16 00:00:00.044872  2017-02-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-16_00-00-00.044872.tgz
2017-02-17 00:00:00.044872  2017-02-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-17_00-00-00.044872.tgz
2017-02-18 00:00:00.044872  2017-02-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-18_00-00-00.044872.tgz
2017-02-19 00:00:00.044872  2017-02-26 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-02-19_00-00-00.044872.tgz
2017-02-20 00:00:00.044872  2017-02-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-20_00-00-00.044872.tgz
2017-02-21 00:00:00.044872  2017-02-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-21_00-00-00.044872.tgz
2017-02-22 00:00:00.044872  2017-02-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-22_00-00-00.044872.tgz
2017-02-23 00:00:00.044872  2017-02-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-23_00-00-00.044872.tgz
2017-02-24 00:00:00.044872  2017-02-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-24_00-00-00.044872.tgz
2017-02-25 00:00:00.044872  2017-02-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-25_00-00-00.044872.tgz
2017-02-26 00:00:00.044872  2017-03-05 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-02-26_00-00-00.044872.tgz
2017-02-27 00:00:00.044872  2017-02-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-27_00-00-00.044872.tgz
2017-02-28 00:00:00.044872  2017-03-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-02-28_00-00-00.044872.tgz
2017-03-01 00:00:00.044872  2017-04-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2017-03-01_00-00-00.044872.tgz
2017-03-02 00:00:00.044872  2017-03-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-02_00-00-00.044872.tgz
2017-03-03 00:00:00.044872  2017-03-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-03_00-00-00.044872.tgz
2017-03-04 00:00:00.044872  2017-03-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-04_00-00-00.044872.tgz
2017-03-05 00:00:00.044872  2017-03-12 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-03-05_00-00-00.044872.tgz
2017-03-06 00:00:00.044872  2017-03-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-06_00-00-00.044872.tgz
2017-03-07 00:00:00.044872  2017-03-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-07_00-00-00.044872.tgz
2017-03-08 00:00:00.044872  2017-03-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-08_00-00-00.044872.tgz
2017-03-09 00:00:00.044872  2017-03-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-09_00-00-00.044872.tgz
2017-03-10 00:00:00.044872  2017-03-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-10_00-00-00.044872.tgz
2017-03-11 00:00:00.044872  2017-03-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-11_00-00-00.044872.tgz
2017-03-12 00:00:00.044872  2017-03-19 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-03-12_00-00-00.044872.tgz
2017-03-13 00:00:00.044872  2017-03-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-13_00-00-00.044872.tgz
2017-03-14 00:00:00.044872  2017-03-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-14_00-00-00.044872.tgz
2017-03-15 00:00:00.044872  2017-03-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-15_00-00-00.044872.tgz
2017-03-16 00:00:00.044872  2017-03-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-16_00-00-00.044872.tgz
2017-03-17 00:00:00.044872  2017-03-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-17_00-00-00.044872.tgz
2017-03-18 00:00:00.044872  2017-03-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-18_00-00-00.044872.tgz
2017-03-19 00:00:00.044872  2017-03-26 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-03-19_00-00-00.044872.tgz
2017-03-20 00:00:00.044872  2017-03-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-20_00-00-00.044872.tgz
2017-03-21 00:00:00.044872  2017-03-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-21_00-00-00.044872.tgz
2017-03-22 00:00:00.044872  2017-03-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-22_00-00-00.044872.tgz
2017-03-23 00:00:00.044872  2017-03-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-23_00-00-00.044872.tgz
2017-03-24 00:00:00.044872  2017-03-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-24_00-00-00.044872.tgz
2017-03-25 00:00:00.044872  2017-03-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-25_00-00-00.044872.tgz
2017-03-26 00:00:00.044872  2017-04-02 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-03-26_00-00-00.044872.tgz
2017-03-27 00:00:00.044872  2017-03-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-27_00-00-00.044872.tgz
2017-03-28 00:00:00.044872  2017-03-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-28_00-00-00.044872.tgz
2017-03-29 00:00:00.044872  2017-03-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-29_00-00-00.044872.tgz
2017-03-30 00:00:00.044872  2017-03-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-30_00-00-00.044872.tgz
2017-03-31 00:00:00.044872  2017-04-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-03-31_00-00-00.044872.tgz
2017-04-01 00:00:00.044872  2017-05-01 00:00:00.044872  30 days, 0:00:00   local.hardcorenudoty.com-2017-04-01_00-00-00.044872.tgz
2017-04-02 00:00:00.044872  2017-04-09 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-04-02_00-00-00.044872.tgz
2017-04-03 00:00:00.044872  2017-04-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-03_00-00-00.044872.tgz
2017-04-04 00:00:00.044872  2017-04-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-04_00-00-00.044872.tgz
2017-04-05 00:00:00.044872  2017-04-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-05_00-00-00.044872.tgz
2017-04-06 00:00:00.044872  2017-04-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-06_00-00-00.044872.tgz
2017-04-07 00:00:00.044872  2017-04-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-07_00-00-00.044872.tgz
2017-04-08 00:00:00.044872  2017-04-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-08_00-00-00.044872.tgz
2017-04-09 00:00:00.044872  2017-04-16 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-04-09_00-00-00.044872.tgz
2017-04-10 00:00:00.044872  2017-04-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-10_00-00-00.044872.tgz
2017-04-11 00:00:00.044872  2017-04-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-11_00-00-00.044872.tgz
2017-04-12 00:00:00.044872  2017-04-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-12_00-00-00.044872.tgz
2017-04-13 00:00:00.044872  2017-04-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-13_00-00-00.044872.tgz
2017-04-14 00:00:00.044872  2017-04-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-14_00-00-00.044872.tgz
2017-04-15 00:00:00.044872  2017-04-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-15_00-00-00.044872.tgz
2017-04-16 00:00:00.044872  2017-04-23 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-04-16_00-00-00.044872.tgz
2017-04-17 00:00:00.044872  2017-04-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-17_00-00-00.044872.tgz
2017-04-18 00:00:00.044872  2017-04-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-18_00-00-00.044872.tgz
2017-04-19 00:00:00.044872  2017-04-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-19_00-00-00.044872.tgz
2017-04-20 00:00:00.044872  2017-04-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-20_00-00-00.044872.tgz
2017-04-21 00:00:00.044872  2017-04-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-21_00-00-00.044872.tgz
2017-04-22 00:00:00.044872  2017-04-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-22_00-00-00.044872.tgz
2017-04-23 00:00:00.044872  2017-04-30 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-04-23_00-00-00.044872.tgz
2017-04-24 00:00:00.044872  2017-04-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-24_00-00-00.044872.tgz
2017-04-25 00:00:00.044872  2017-04-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-25_00-00-00.044872.tgz
2017-04-26 00:00:00.044872  2017-04-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-26_00-00-00.044872.tgz
2017-04-27 00:00:00.044872  2017-04-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-27_00-00-00.044872.tgz
2017-04-28 00:00:00.044872  2017-04-29 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-28_00-00-00.044872.tgz
2017-04-29 00:00:00.044872  2017-04-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-04-29_00-00-00.044872.tgz
2017-04-30 00:00:00.044872  2017-05-07 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-04-30_00-00-00.044872.tgz
2017-05-01 00:00:00.044872  2017-06-01 00:00:00.044872  31 days, 0:00:00   local.hardcorenudoty.com-2017-05-01_00-00-00.044872.tgz
2017-05-02 00:00:00.044872  2017-05-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-02_00-00-00.044872.tgz
2017-05-03 00:00:00.044872  2017-05-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-03_00-00-00.044872.tgz
2017-05-04 00:00:00.044872  2017-05-05 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-04_00-00-00.044872.tgz
2017-05-05 00:00:00.044872  2017-05-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-05_00-00-00.044872.tgz
2017-05-06 00:00:00.044872  2017-05-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-06_00-00-00.044872.tgz
2017-05-07 00:00:00.044872  2017-05-14 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-05-07_00-00-00.044872.tgz
2017-05-08 00:00:00.044872  2017-05-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-08_00-00-00.044872.tgz
2017-05-09 00:00:00.044872  2017-05-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-09_00-00-00.044872.tgz
2017-05-10 00:00:00.044872  2017-05-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-10_00-00-00.044872.tgz
2017-05-11 00:00:00.044872  2017-05-12 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-11_00-00-00.044872.tgz
2017-05-12 00:00:00.044872  2017-05-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-12_00-00-00.044872.tgz
2017-05-13 00:00:00.044872  2017-05-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-13_00-00-00.044872.tgz
2017-05-14 00:00:00.044872  2017-05-21 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-05-14_00-00-00.044872.tgz
2017-05-15 00:00:00.044872  2017-05-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-15_00-00-00.044872.tgz
2017-05-16 00:00:00.044872  2017-05-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-16_00-00-00.044872.tgz
2017-05-17 00:00:00.044872  2017-05-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-17_00-00-00.044872.tgz
2017-05-18 00:00:00.044872  2017-05-19 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-18_00-00-00.044872.tgz
2017-05-19 00:00:00.044872  2017-05-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-19_00-00-00.044872.tgz
2017-05-20 00:00:00.044872  2017-05-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-20_00-00-00.044872.tgz
2017-05-21 00:00:00.044872  2017-05-28 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-05-21_00-00-00.044872.tgz
2017-05-22 00:00:00.044872  2017-05-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-22_00-00-00.044872.tgz
2017-05-23 00:00:00.044872  2017-05-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-23_00-00-00.044872.tgz
2017-05-24 00:00:00.044872  2017-05-25 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-24_00-00-00.044872.tgz
2017-05-25 00:00:00.044872  2017-05-26 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-25_00-00-00.044872.tgz
2017-05-26 00:00:00.044872  2017-05-27 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-26_00-00-00.044872.tgz
2017-05-27 00:00:00.044872  2017-05-28 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-27_00-00-00.044872.tgz
2017-05-28 00:00:00.044872  2017-06-04 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-05-28_00-00-00.044872.tgz
2017-05-29 00:00:00.044872  2017-05-30 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-29_00-00-00.044872.tgz
2017-05-30 00:00:00.044872  2017-05-31 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-30_00-00-00.044872.tgz
2017-05-31 00:00:00.044872  2017-06-01 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-05-31_00-00-00.044872.tgz
2017-06-01 00:00:00.044872                              24 days, 0:00:00   local.hardcorenudoty.com-2017-06-01_00-00-00.044872.tgz
2017-06-02 00:00:00.044872  2017-06-03 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-02_00-00-00.044872.tgz
2017-06-03 00:00:00.044872  2017-06-04 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-03_00-00-00.044872.tgz
2017-06-04 00:00:00.044872  2017-06-11 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-06-04_00-00-00.044872.tgz
2017-06-05 00:00:00.044872  2017-06-06 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-05_00-00-00.044872.tgz
2017-06-06 00:00:00.044872  2017-06-07 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-06_00-00-00.044872.tgz
2017-06-07 00:00:00.044872  2017-06-08 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-07_00-00-00.044872.tgz
2017-06-08 00:00:00.044872  2017-06-09 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-08_00-00-00.044872.tgz
2017-06-09 00:00:00.044872  2017-06-10 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-09_00-00-00.044872.tgz
2017-06-10 00:00:00.044872  2017-06-11 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-10_00-00-00.044872.tgz
2017-06-11 00:00:00.044872  2017-06-18 00:00:00.044872  7 days, 0:00:00    local.hardcorenudoty.com-2017-06-11_00-00-00.044872.tgz
2017-06-12 00:00:00.044872  2017-06-13 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-12_00-00-00.044872.tgz
2017-06-13 00:00:00.044872  2017-06-14 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-13_00-00-00.044872.tgz
2017-06-14 00:00:00.044872  2017-06-15 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-14_00-00-00.044872.tgz
2017-06-15 00:00:00.044872  2017-06-16 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-15_00-00-00.044872.tgz
2017-06-16 00:00:00.044872  2017-06-17 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-16_00-00-00.044872.tgz
2017-06-17 00:00:00.044872  2017-06-18 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-17_00-00-00.044872.tgz
2017-06-18 00:00:00.044872                              7 days, 0:00:00    local.hardcorenudoty.com-2017-06-18_00-00-00.044872.tgz
2017-06-19 00:00:00.044872  2017-06-20 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-19_00-00-00.044872.tgz
2017-06-20 00:00:00.044872  2017-06-21 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-20_00-00-00.044872.tgz
2017-06-21 00:00:00.044872  2017-06-22 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-21_00-00-00.044872.tgz
2017-06-22 00:00:00.044872  2017-06-23 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-22_00-00-00.044872.tgz
2017-06-23 00:00:00.044872  2017-06-24 00:00:00.044872  1 day, 0:00:00     local.hardcorenudoty.com-2017-06-23_00-00-00.044872.tgz
2017-06-24 00:00:00.044872                              1 day, 0:00:00     local.hardcorenudoty.com-2017-06-24_00-00-00.044872.tgz
```

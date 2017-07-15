# Capistrano tasks

* [deploy](#deploy)
* [wp:{command}[:subcommand[..]]](#wpcommandsubcommand)
* [evolve:update](#evolveupdate)
* [evolve:snapshot:simulate](#evolvesnapshotsimulate)
* [evolve:snapshot:force](#evolvesnapshotforce)
* [evolve:snapshot:restore](#evolvesnapshotrestore)
* [evolve:provision](#evolveprovision)
* [evolve:ssh](#evolvessh)
* [evolve:version](#evolveversion)
* [evolve:permissions](#evolvepermissions)
* [evolve:down](#evolvedown)
* [evolve:up](#evolveup)
* [evolve:db:backup](#evolvedbbackup)
* [evolve:db:exec](#evolvedbexec)
* [evolve:teardown](#evolveteardown)
* [evolve:reboot](#evolvereboot)
* [evolve:restart](#evolverestart)
* [evolve:logs:apache:error](#evolvelogsapacheerror)
* [evolve:logs:apache:sync](#evolvelogsapachesync)
* [evolve:logs:varnish](#evolvelogsvarnish)
* [evolve:logs:pound](#evolvelogspound)
* [evolve:logs:evolution](#evolvelogsevolution)

---

### deploy

Provided out of the box by Capistrano, this task connects to the remote environment via ssh, and pulls the latest codebase from your git remote.

### wp:{command}[:subcommand[..]]

Invokes [wp-cli](http://wp-cli.org/) on the remote environment, with the given command/subcommands. For example, to get the current version of wp-cli:

	bundle exec cap staging wp:cli:version

Passing parameter flags is not explicitly supported, though `--path` and `--url` are automatically supplied &mdash; additional flags _can_ be crammed into the task name:

	bundle exec cap staging wp:user:list:--format=json

### evolve:update

Invokes server-side [bash updater](https://github.com/evolution/wordpress/blob/master/lib/ansible/roles/cleanup/files/update.sh) to apply available updates for wordpress core, cli, plugins, and themes...subsequently versioning any resulting changes to your git remote.

By default, only minor wordpress core releases are applied (eg, `4.6.1` to `4.6.3`), and _all plugins and themes_ are updated.

These default behaviors can be overridden with an optional string argument:

```
# apply major updates
bundle exec cap staging evolve:update[major]
# skip plugin and theme updates
bundle exec cap staging evolve:update[plugins,themes]
# apply major updates and skip themes (but update plugins)
bundle exec cap staging evolve:update[major,themes]
```

Note that **committing updates back to git requires a deploy key with write permissions**.

### evolve:snapshot:simulate

Invokes server-side [backup script](https://github.com/evolution/wordpress/blob/master/lib/ansible/roles/snapshots/files/backup.py) to simulate snapshot history for the past year, given an interactive choice of relevant configuration values:

```
bundle exec cap production evolve:snapshot:simulate
? By what interval of time should we take snapshots? days
? And we'll take a snapshot every how many days? 1
? Retain how many hourly backups? 0
? Retain how many daily backups? 1
? Retain how many weekly backups? 1
? Retain how many monthly backups? 1
? Retain how many yearly backups? 1
? Should backup retention lag one day behind? Yes

! Simulating a backup every 1 days
! Retention policy:
! 	1 days
! 	1 weeks
! 	1 months
! 	1 years
! created on                  deleted on                  retained for       filename
--------------------------  --------------------------  -----------------  -----------------------------------------------------
2016-07-12 16:59:42.912563  2017-01-02 16:59:42.912563  174 days, 0:00:00  production.example.com-2016-07-12_16-59-42.912563.tgz
```

This is useful for estimating storage requirements, as you fine-tune your snapshotting configuration.

### evolve:snapshot:force

Invokes said backup script, forcing a backup to be created outside of the snapshot interval, and skipping retention processing.

```
bundle exec cap production evolve:snapshot:force
! Forcing backup...
Created backup 2017-07-15_18-53-51.021091
```

### evolve:snapshot:restore

Invokes aforementioned backup script, allowing you to select one from a list of existing production snapshots, and seamlessly restore it to your local or production stage:

```
bundle exec cap production evolve:snapshot:restore
? Select which backup to restore production.example.com-2017-07-12_15-43-23.292826.tgz
? To where should we restore this backup? production
```

Note that **this is destructive to the targeted stage**, and _will wipe out any existing database content or uploaded files_.

### evolve:provision

Invokes [Ansible](http://docs.ansible.com/) locally, connecting to and provisioning the remote environment.

### evolve:ssh

Opens an interactive ssh terminal to the remote environment.

### evolve:version

Outputs the version of Evolution with which the remote environment was last provisioned.

### evolve:permissions

Recursively resets file and directory permissions of the deployment release path.

### evolve:down

Syncs database and uploaded files _down_ from remote environment to local. Also supports `:down:db` and `:down:files` variants for more specific needs.

Note that **this is destructive to the _local_ environment**.

### evolve:up

Syncs database and uploaded files _up_ from local to remote environment. Also supports `:up:db` and `:up:files` variants for more specific needs.

Note that **this is destructive to the _remote_ environment**.

### evolve:db:backup

Intended for internal use by other tasks, creates and (by default) syncs down a zipped SQL backup of the remote database. Can leave said backup on the remote server, given a truthy argument:

```
bundle exec cap staging evolve:db:backup[1]
```

### evolve:db:exec

Also intended for internal use, executes the contents of a provided SQL file against the remote database:

```
bundle exec cap staging evolve:db:exec[/tmp/foo.sql]
```

### evolve:teardown

Totally removes _all_ deployments from the remote environment.

### evolve:reboot

Reboots the remote environment.

### evolve:restart

Restarts the remote environment's web stack (mysql, apache, varnish, pound, iptables). Also supports `:stop` and `:start` variants:

	bundle exec cap staging evolve:stop

### evolve:logs:apache:error

Actively tails the Apache error logs; terminate with `ctrl+c`. Also supports `:access` variant (for access logs):

	bundle exec cap staging evolve:apache:access

### evolve:logs:apache:sync

Syncs down and processes apache access logs from remote, with local installation of [AWStats](http://www.awstats.org/).

### evolve:logs:varnish

Invokes the `varnishlog` utility, for viewing shared memory logs; terminate with `ctrl+c`.

### evolve:logs:pound

Actively tails the syslog, filtered for mentions of `pound:`; terminate with `ctrl+c`.

### evolve:logs:evolution

Actively tails the log of Evolution actions performed against the remote environment; terminate with `ctrl+c`.

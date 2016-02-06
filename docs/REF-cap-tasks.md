# Capistrano tasks

* [deploy](#deploy)
* [wp:{command}[:subcommand[..]]](#wpcommandsubcommand)
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

### evolve:logs:varnish

Invokes the `varnishlog` utility, for viewing shared memory logs; terminate with `ctrl+c`.

### evolve:logs:pound

Actively tails the syslog, filtered for mentions of `pound:`; terminate with `ctrl+c`.

### evolve:logs:evolution

Actively tails the log of Evolution actions performed against the remote environment; terminate with `ctrl+c`.

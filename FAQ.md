# Frequently Asked Questions

This document lists commonly encountered issues, their likely causes, and likely solutions.

### Error establishing a database connection

Is the MySQL database not running? Restart it with `sudo service mysql restart`

Is `DB_HOST` in your wordpress configuration set to `localhost`? If so, there may be a mysql local socket issue...set it instead to `127.0.0.1` to use TCP/IP, and [see the documentation behind this known issue](http://php.net/mysql_connect#refsect1-function.mysql-connect-notes)

### Local stage hangs or never resolves in the browser

This is a [known issue](https://github.com/evolution/wordpress/issues/74) related to vagrant hostmanager not properly cleaning up `/etc/hosts` entries for destroyed virtual machines. Find and remove any hostfile entries related to your domain, and it should resolve your issue.

### Capistrano fails with "fingerprint" or "host key verification" error

```
$ bundle exec cap local evolve:restart
INFO[0223320c] Running /usr/bin/env sudo service evolution-wordpress restart on local.mytestsite.net
DEBUG[0223320c] Command: /usr/bin/env sudo service evolution-wordpress restart
cap aborted!
SSHKit::Runner::ExecuteError: Exception while executing on host local.mytestsite.net: fingerprint bd:ae:df:28:36:37:0b:6c:3c:60:57:09:2b:af:5f:5d does not match for "local.mytestsite.net,192.168.12.345"
```

This is indicative of a known server's host key changing, most commonly after rebuilding a remote server or recreating your local server in vagrant.

> Note: If you have made no such changes, you _might_ be the subject of [a MITM attack](https://en.wikipedia.org/wiki/Man-in-the-middle_attack).

First, we need to find the existing host key from your `known_hosts` file.

```
$ cat ~/.ssh/known_hosts | grep -n local.mytestsite.net
207:local.mytestsite.net,192.168.12.345 ssh-rsa AAAAB3N...
```

The output above indicates that the outdated host key is on line **207**, which you can delete with your preferred editor, or in-place with `sed`:

```
$ sed -i -e '207d' ~/.ssh/known_hosts
```

Finally, you'll need to manually start an ssh connection to said server, and accept the new host key.

> Note you don't necessarily have to _complete_ authentication, just answer yes to the prompt

```
$ ssh -i lib/ansible/files/ssh/id_rsa deploy@local.mytestsite.net
The authenticity of host 'local.mytestsite.net (192.168.12.345)' can't be established.
RSA key fingerprint is bd:ae:df:28:36:37:0b:6c:3c:60:57:09:2b:af:5f:5d.
Are you sure you want to continue connecting (yes/no)? 
```
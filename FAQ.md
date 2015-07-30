# Frequently Asked Questions

This document lists commonly encountered issues, their likely causes, and likely solutions.

### Error establishing a database connection

Is the MySQL database is not running? Restart it with `sudo service mysql restart`

Is `DB_HOST` in your wordpress configuration set to `localhost`? If so, there may be a mysql local socket issue...set it instead to `127.0.0.1` to use TCP/IP, and [see the documentation behind this known issue](http://php.net/mysql_connect#refsect1-function.mysql-connect-notes)

### Local stage hangs or never resolves in the browser

This is a [known issue](https://github.com/evolution/wordpress/issues/74) related to vagrant hostmanager not properly cleaning up `/etc/hosts` entries for destroyed virtual machines. Find and remove any hostfile entries related to your domain, and it should resolve your issue.

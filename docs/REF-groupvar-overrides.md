# Group_var overrides

This documents variables that can be overridden in your site's ansible group vars file (located in `lib/ansible/group_vars/all`) to change various evolution behaviors.

* [PHP](#php)
  * [`php__memory_limit`](#php__memory_limit)
  * [`php__version_7`](#php__version_7)
* [Apache](#apache)
  * [`apache__start_servers`](#apache__start_servers)
  * [`apache__min_spare_servers`](#apache__min_spare_servers)
  * [`apache__max_spare_servers`](#apache__max_spare_servers)
  * [`apache__max_clients`](#apache__max_clients)
  * [`apache__max_requests_per_child`](#apache__max_requests_per_child)
* [Wordpress](#wordpress)
  * [`wordpress__xmlrpc_allow`](#wordpress__xmlrpc_allow)
  * [`wordpress__xmlrpc_whitelist`](#wordpress__xmlrpc_whitelist)
* [IPTables](#iptables)
  * [`iptables__ipv6`](#iptables__ipv6)
* [Fail2ban](#fail2ban)
  * [`fail2ban__whitelist`](#)
  * [`fail2ban__ban_time`](#)
  * [`fail2ban__notification_email`](#)
  * [`fail2ban__notify_on_ban`](#)
* [Swapfile](#swapfile)
  * [`swap__path`](#swap__path)
  * [`swap__swappiness`](#swap__swappiness)
  * [`swap__vfs_cache_pressure`](#swap__vfs_cache_pressure)

---

## PHP

### `php__memory_limit`

Sets PHP's [memory_limit](http://php.net/manual/en/ini.core.php#ini.memory-limit) directive (in megabytes):

```yml
# Configure PHP with 4 gigabytes of memory
php__memory_limit: 4096
```

By default, this is [calculated during provisioning based on the server's total available memory](https://github.com/evolution/wordpress/blob/0de3498380aaf4cfd79c7588be828ae6f401aa59/lib/ansible/roles/php/tasks/main.yml#L19-L23).

### `php__version_7`

Triggers installation and use of PHP 7.1 from [a custom PPA](https://launchpad.net/~ondrej/+archive/ubuntu/php):

```yml
# Install PHP 7.1
php__version_7: true
```

By default, Ubuntu's provided packages for 5.5 are used.

## Apache

Several overrides are available for the [MPM prefork module](https://httpd.apache.org/docs/2.4/mod/prefork.html) that Apache uses with PHP.  By default, these prefork directives are [calculated during provisioning based on the server's available resources](https://github.com/evolution/wordpress/blob/0de3498380aaf4cfd79c7588be828ae6f401aa59/lib/ansible/roles/apache-prefork/templates/prefork.conf)

### `apache__start_servers`

The number of child server processes created by Apache on startup.

### `apache__min_spare_servers`

The minimum number of idle child server processes.

### `apache__max_spare_servers`

The maximum number of idle child server processes.

### `apache__max_clients`

The limit on the number of simultaneous requests that will be served.

### `apache__max_requests_per_child`

The limit on the number of connections that an individual child server process will handle.

## Wordpress

By default, access to Wordpress' XML-RPC functionality is unconditionally denied due to security concerns. There are two methods for overriding this, outlined below.

### `wordpress__xmlrpc_allow`

A truthy value for this override allows unconditional access to Wordpress' XML-RPC:

```yml
wordpress__xmlrpc_allow: true
```

This would generate the following in your virtual host configuration:

```apache
    # Enable XML-RPC unconditionally
    <files xmlrpc.php>
        Order allow,deny
        Allow from all
    </files>
```

### `wordpress__xmlrpc_whitelist`

A dictionary (key-value hash) for this override allows conditional access by way of [Apache's SetEnvIf](https://httpd.apache.org/docs/2.4/mod/mod_setenvif.html#setenvif) directive.

The key is a regular expression match (that must be unique within the whitelist), and the value is an attribute that the expression would successfully match. This, for example, would allow XML-RPC requests from the local host:

```yml
wordpress__xmlrpc_whitelist:
  '^127[.]0[.]0[.]1$': 'Remote_Addr'
```

This would generate the following in your virtual host configuration:

```apache
    # Enable XML-RPC for the following SetEnvIf conditions
    SetEnvIf Remote_Addr "^127[.]0[.]0[.]1$" allow_wp_xmlrpc
    <files xmlrpc.php>
        Order deny,allow
        Deny from all
        Allow from env=allow_wp_xmlrpc
    </files>
```

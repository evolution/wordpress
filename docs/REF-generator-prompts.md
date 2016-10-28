# Generator prompts

* [Private or Public](#private-or-public)
* [SSL Enabled](#ssl-enabled)
* [Overwrite existing SSH keys](#overwrite-existing-ssh-keys)
* [Project name](#project-name)
* [Domain name](#domain-name)
* [WWW or bare domain](#www-or-bare-domain)
* [New Relic license key](#new-relic-license-key)
* [Datadog license key](#datadog-license-key)
* [Optional features](#optional-features)
* [Wordpress version](#wordpress-version)
* [Wordpress table prefix](#wordpress-table-prefix)
* [Database credentials](#database-credentials)
* [Vagrant IP](#vagrant-ip)

---

### Private or Public

If you opt for a *public* project, the generator will configure your [`.gitignore`](http://git-scm.com/docs/gitignore) to prevent ssh keys and ssl certificates from being versioned.

**This is ideal if you plan to open-source your site on a free public repository (we recommend Github for this).**

If you opt for *private*, it will configure your [`package.json`](https://docs.npmjs.com/files/package.json) to prevent publication through npm, but *your keys and certificates will be versioned*.

**In this case, you should use a paid [private repository on Github](https://help.github.com/articles/making-a-public-repository-private/), or a free [private repository on Gitlab](http://doc.gitlab.com/ce/gitlab-basics/create-project.html).**

### SSL Enabled

Evolution supports SSL encryption through [Pound](http://www.apsis.ch/pound), and will generate self-signed certificates for you, if you enable this option.

If you plan to make heavy use of SSL, you'll almost certainly want to purchase a commercial cert from a third party CA. See [the difference between self-signed and Certificate Authorities](http://stackoverflow.com/questions/292732/self-signed-ssl-cert-or-ca#answer-292784).

On regeneration of an existing project (where SSL is already enabled), you will be prompted whether to overwrite your existing SSL certificates with new self-signed certs. **The default for this is always no.**

### Overwrite existing SSH keys

On regeneration of an existing project, you will also be prompted whether to overwrite your existing SSH keys with a newly generated keypair. **The default for this is always no.**

This comes in particularly handy when moving your project to a new server, or when you think an existing server has been compromised and you don't trust the old keys.

### Project name

This is the name of your project, and defaults to the name of the working directory.

### Domain name

This is the top level domain of your project, and defaults to the name of the working directory (if it's a valid domain name).

### WWW or bare domain

This determines the canonical home of your site, whether under a `www.` subdomain or on the bare domain.

A redirect is also created in `web/.htaccess` to send requests for your bare domain to the `www.` subdomain -- or vice versa.

### New Relic license key

When provided a license key, this will automatically set up [server monitoring](http://newrelic.com/server-monitoring) and the [PHP agent](https://docs.newrelic.com/docs/agents/php-agent/getting-started/new-relic-php) through New Relic. **The default for this is to skip New Relic installation.**

### Datadog license key

When provided a license key, this will automatically set up [the base agent](https://github.com/DataDog/ansible-datadog) for Datadog monitoring, via ansible-galaxy. **The default for this is to skip Datadog installation.**

### Optional features

This allows you disable the following features, **all of which are enabled by default**:

##### apache-prefork

This scales the settings for Apache's [prefork module](http://httpd.apache.org/docs/2.4/mod/prefork.html) based on available memory of the server being provisioned.

These values can be manually overridden in `lib/ansible/group_vars/all`.

##### php-hardened

This restricts features of PHP that are known security risks, and installs the [Suhosin](https://suhosin.org/) extension.

##### varnish

This configures a high performance [Varnish](https://www.varnish-cache.org/) reverse-proxy cache in front of your Apache webserver.

##### mail

This configures a [postfix](http://www.postfix.org/) mail server, so that Wordpress can generate outgoing email messages.

##### firewall

This configures a simple [iptables](https://en.wikipedia.org/wiki/Iptables) firewall (blocking all ports but SSH, HTTP, and HTTPS), and basic intrusion protection via [Fail2ban](http://www.fail2ban.org/wiki/index.php/Main_Page).

##### debug

This installs some command line utilities that are useful for monitoring processes and bandwidth. Namely [htop](http://hisham.hm/htop/) and [iftop](http://www.ex-parrot.com/pdw/iftop/).

### Wordpress version

This determines which version of Wordpress will be fetched and installed from Github. **The default for this is the latest tagged version.**

### Wordpress table prefix

This determines the prefix applied to Wordpress database tables. **The default for this is `wp_`.**

### Database credentials

This determines the credentials used by Wordpress to connect to MySQL.

**The defaults are:**

* Database: `wordpress`
* Username: `wordpress`
* Password: randomly generated
* Host: `127.0.0.1`

### Vagrant IP

This determines the IP address used for your local vagrant vm. **The default is a randomly computed address.**

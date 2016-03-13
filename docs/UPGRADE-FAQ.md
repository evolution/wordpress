# Upgrading from Genesis

This is an overview of necessary cleanup and issues when regenerating a [Genesis WordPress](https://github.com/genesis/wordpress) site with Evolution. You should bring over any database and uploaded files [via the Cambrian export/import process](./TUTORIAL-upgrade.md).

### Removing Genesis' leftovers

* Remove the old provisioning script: `rm bin/provision`
* Remove leftover directories created by Genesis:
  * `rm -r deployment`
  * `rm -r provisioning`
  * Typically, any subdirectory you did not _explicitly_ create, other than `bin`, `lib`, and `web`
* Remove all your old wordpress files and directories from `web`, except `wp-content` and `wp-config.php`:
  * `rm -r web/wp-{a,b,com,cr,i,l,m,s,t}*`

### Changing dependencies

* If you've added any non-standard components to `bower.json`, Evolution will overwrite them. You will need to re-add them yourself. See precisely what's changed with: `git diff bower.json`
* Capistrano was upgraded from 2 to 3, so the following files will have changed _drastically_:
  * `Capfile`
  * `Gemfile`
  * `Gemfile.lock`
* Remove any possibly outdated dependencies, and then run your installs from scratch:
  * `rm -r ./{node_modules,bower_components}`
  * `npm install; bower install; bundle install`

### Resolving updates of existing files

* Your `Vagrantfile` will be drastically different, and you may have to destroy and re-create your local vm
* Any customizations you've made to your `.gitignore` will need to be re-added, [below a demarcated line](https://github.com/evolution/wordpress-example/blob/4fd6256fb8637f912e91f56a7f30cc486dd5a056/.gitignore#L57)
* You'll see significant changes to `web/.htaccess`:
  * Forced redirects from `www.{domain}` to the bare domain (or vice versa) are standard in Evolution's htaccess
  * Most security + performance tweaks from Genesis' htaccess were moved to Apache's virtual host configuration
  * Any existing Genesis block should be _removed_

### Wordpress snafus

* Are all your links prefixed with `/wp/` and 404ing? Check that your themes and plugins use `home_url()` instead of `site_url()`

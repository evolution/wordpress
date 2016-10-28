# Evolution WordPress

[![Build Status](https://travis-ci.org/evolution/wordpress.svg)](https://travis-ci.org/evolution/wordpress)
[![Dependencies](https://david-dm.org/evolution/wordpress.svg)](https://david-dm.org/evolution/wordpress)
[![devDependencies](https://david-dm.org/evolution/wordpress/dev-status.svg)](https://david-dm.org/evolution/wordpress#info=devDependencies&view=table)

> Rapidly create, develop, & deploy WordPress across multiple environments.
> ![Generating a site](./docs/generate.gif)

Evolution lets you generate an entirely versioned, multi-environment Wordpress site in under a minute!

### Features

* Built on Ubuntu Linux 14.04
* [Vagrant](https://www.vagrantup.com/) server for local development
* Automated [Ansible](http://www.ansible.com/) provisioning
* Automated [Capistrano](http://capistranorb.com/) deployment
* Passwordless login over SSH
* Secure HTTPS encryption
* Server-side [Varnish](https://www.varnish-cache.org/) caching
* Preconfigured [iptables](http://www.netfilter.org/projects/iptables/) firewall
* Performance tuned [Apache](http://httpd.apache.org/) webserver
* [Postfix](http://www.postfix.org/) mail server

## Project Status

Evolution is stable and usable in a production environment, but features are still being added and bugs being fixed. Suggestions, bug reports, and pull requests are welcome.

This and [futher documentation](./docs/) are a constant work in progress. Contributions to documentation are _always_ welcome.

## Quick Start

Evolution is intended for use in a POSIX environment, such as Linux or Mac OS. Windows is not officially supported, but _may_ be possible with a POSIX subsystem like [Cygwin](https://www.cygwin.com/).

### Pre-requisites

You will need:

* [Vagrant](https://www.vagrantup.com/downloads.html) 1.8+
  * [VirtualBox](https://www.virtualbox.org/wiki/Downloads) 5+
  * [Hostmanager for Vagrant](https://github.com/smdahlen/vagrant-hostmanager#installation)
* [Node](https://nodejs.org/en/download/) 4.0+
* [Bundler](http://bundler.io/)
* [Ansible](http://docs.ansible.com/intro_installation.html) 2.0+
* [sshpass](https://gist.github.com/arunoda/7790979)

You can then use npm to install the Yeoman generator:

```
npm install -g yo generator-evolve
```

### Common Workflows

* [Generating a new site](./docs/TUTORIAL-NEW.md)
* [Bringing up an existing Evolution site](./docs/TUTORIAL-CLONE.md)
* [Regenerating an existing Evolution site](./docs/TUTORIAL-UPGRADE.md)
* [Rebuilding an existing Evolution server](./docs/TUTORIAL-MOVE.md)
* [Upgrading from an existing Genesis site](./docs/UPGRADE-FAQ.md)
* [Importing a non Evolution site](./docs/TUTORIAL-IMPORT.md)
* [Caveats for developing themes and plugins](./docs/REF-caveats-constants.md)

## Managing Remote Environments

Evolution exposes several commands via Capistrano for managing and supporting your remote environments.

You can sync the database and uploaded files all at once...as well as separately:

```
bundle exec cap staging evolve:up
bundle exec cap staging evolve:up:db
bundle exec cap staging evolve:up:files
```

You can SSH directly to the remote server, without username or password prompts:

```
bundle exec cap staging evolve:ssh
```

You can remotely stop and start services, or even reboot the server:

```
bundle exec cap staging evolve:stop
bundle exec cap staging evolve:start
bundle exec cap staging evolve:restart
bundle exec cap staging evolve:reboot
```

You can even remotely view logs:

```
bundle exec cap staging evolve:logs:apache:access
bundle exec cap staging evolve:logs:apache:error
bundle exec cap staging evolve:logs:varnish
bundle exec cap staging evolve:logs:pound
bundle exec cap staging evolve:logs:evolution
```

These and more can be found in the [Capistrano tasks reference](./docs/REF-cap-tasks.md).

## Troubleshooting

If you've encountered a problem, there may already be a solution in the [Frequently Asked Questions](./FAQ.md).

Failing that, check the [Github issues](https://github.com/evolution/wordpress/issues) and [pull requests](https://github.com/evolution/wordpress/pulls) to see if someone has already encountered your same problem. If no one has, then feel free to [file a new issue](https://github.com/evolution/wordpress/issues/new).

## Developing

If you'd like to help develop or test new features for Evolution, it's relatively simple to do so!

First, you'll need to clone this repo, and checkout whatever branch you're wanting to test (or create a new branch and implement a feature within it):

```
EVOLUTION_TEST_FRAMEWORK_PATH=~/git/evolution-wordpress
mkdir -p $EVOLUTION_TEST_FRAMEWORK_PATH
git clone https://github.com/evolution/wordpress.git $EVOLUTION_TEST_FRAMEWORK_PATH
cd $EVOLUTION_TEST_FRAMEWORK_PATH
git checkout -b some-existing-feature-from-origin
```

Next, go to the repo of the evolution site with which you intend to test the feature, and invoke the generator with the `framework-path` argument:

```
cd ~/git/my-testing-site.com
yo evolve wordpress --framework-path=$EVOLUTION_TEST_FRAMEWORK_PATH
```

Now, this site should be generated from the feature branch in question!

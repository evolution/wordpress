# Genesis WordPress

[![Build Status](https://travis-ci.org/genesis/wordpress.svg)](https://travis-ci.org/genesis/wordpress)
[![Dependencies](https://david-dm.org/genesis/wordpress.svg)](https://david-dm.org/genesis/wordpress)
[![devDependencies](https://david-dm.org/genesis/wordpress/dev-status.svg)](https://david-dm.org/genesis/wordpress#info=devDependencies&view=table)

> Rapidly create, develop, & deploy WordPress across multiple environments.
> ![Genesis WordPress Demo](demo.gif)

## Features

- Generate a functional WordPress site + server
- First-class local development
- Independently stage features for review
- Use production data when developing
- High-performance, zero-configuration caching out of the box
- Easily monitor remote server errors
- Instant, secure SSH access
- Automated server provisioning
- Consistent, reliable environments


## Installation

Ensure you have the latest versions of [NodeJS][9] **v0.10**, [Vagrant v1.6.*](http://www.vagrantup.com/downloads.html), & [VirtualBox v.4.2.*](https://www.virtualbox.org/wiki/Download_Old_Builds_4_2).

### Scaffolding & Development

Install [Yeoman][2] **v1**, [Bower][6] **v1.2**, [Genesis WordPress Generator][1], & [Vagrant Host Manager][4]:

    $ npm install -g yo bower generator-genesis-wordpress
    $ vagrant plugin install vagrant-hostmanager

If you get EMFILE issues, try running: `$ ulimit -n 4096`.

*(You can check your versions by running `node --version`, `npm --version`, etc.)*

### Deployment

Install [Capistrano v2.15.*][5] via [Bundler][1] & [Ansible][7]:

    $ sudo bundle install
    $ sudo easy_install pip
    $ sudo pip install ansible


## Getting Started


## Step 1 – Creating or Upgrading a Site

*Use the [Genesis WordPress Generator][1] for scaffolding.*


## Step 2 – Working Locally

First, ensure you're using the latest version of [Genesis WordPress][0] with [Bower][6]:

    $ bower update

Next, use [Vagrant][3] to create & provision your local environment:

    $ vagrant up

Now open http://local.mysite.com (or whatever your site's domain name is)!

If the site doesn't load for you, you may have to manually
provision your local machine:

    $ vagrant provision

Or, update your local `/etc/hosts` with [Vagrant Host Manager][4]:

    $ vagrant hostmanager

Finally, if things worked while you were at the office but broke when you got home, you probably need to just get Vagrant a new IP address:

    $ vagrant reload


## Step 3 – Wrapping Up

When you're done working on your site, suspend the VM to save on CPU & memory:

    $ vagrant suspend

You can destroy the VM entirely (while keeping your local files) to save on disk space:

    $ vagrant destroy


## Deployment

First, ensure your project on Github can be accessed by remote servers.  To do this,
access the project's *Settings -> Deploy Keys* in Github and add `provisioning/files/ssh/id_rsa.pub`.

Next, assuming the server has been provisioned, deploy your code on Github:

    $ bundle exec cap production deploy

The latest code is now live:

    > http://production.mysite.com/

If you deploy to `staging`, the name of the current branch (e.g. `my-feature`) is deployed:

    > http://my-feature.staging.mysite.com/

In the rare event the changes weren't supposed to go live, you can rollback to the previous release:

    $ bundle exec cap production deploy:rollback

**Note that deployments use the project's *Github repository* as the source, not your local machine!**


## Syncing Files/Database

### From Local to Remote

Suppose you have just provisioned & deployed to a new server, but the site obviously won't work without
a database or uploaded images.

You can **overwrite the remote database** with your local VM's:

    $ bundle exec cap production genesis:up:db

You can sync your local files to the remote filesystem:

    $ bundle exec cap production genesis:up:files

Or, you can perform both actions together:

    $ bundle exec cap production genesis:up

Once a site is live, you *rarely* need to sync anything up to the remote server.  If anything,
you usually sync changes *down*.


### From Remote to Local

Suppose you have a live site that you need to work on locally.  Like the previous section,
you can sync down the database, the files (e.g. uploaded images), or both:

    $ bundle exec cap production genesis:down:db
    $ bundle exec cap production genesis:down:files
    $ bundle exec cap production genesis:down


## Provisioning

The following environments are expected to exist and resolve via DNS to simplify deployment & provisioning:

- `local` (e.g. http://local.mysite.com)
- `staging` (e.g. http://staging.mysite.com/, http://my-feature.staging.mysite.com/)
- `production` (e.g. http://production.mysite.com/, http://www.mysite.com/, http://mysite.com/)

If you're deploying to a new machine (e.g. production.mysite.com), you first need to provision it:

    $ bundle exec cap production genesis:provision

If there is an error, you may be prompted to re-run the command with an explicit username/password:

    $ bundle exec cap production genesis:provision -S user=myuser -S password=mypassword

*From that point on, tasks will use a private key (`provisioning/files/ssh/id_rsa`).*

In the event you already have a live site, you can modify the settings in `deployment/stages/old.rb` to
migrate the old server to a new server:

    # Start the local VM
    $ vagrant up

    # Provision the new server
    $ bundle exec cap production provision
    $ bundle exec cap production deploy

    # Download the old site to local
    $ bundle exec cap old genesis:down

    # Upload the old site to production
    $ bundle exec cap production genesis:up

Now you can switch DNS for http://www.mysite.com/ to point to http://production.mysite.com/'s IP!

## Genesis Tasks

Most of the functionality regarding remote servers are handled by custom [Capistrano][5] tasks,
which you can see by running:

    $ bundle exec cap -T genesis
    cap genesis:down        # Downloads both remote database & syncs remote files into Vagrant
    cap genesis:down:db     # Downloads remote database into Vagrant
    cap genesis:down:files  # Downloads remote files to Vagrant
    cap genesis:logs        # Tail Apache error logs
    cap genesis:permissions # Fix permissions
    cap genesis:provision   # Runs project provisioning script on server
    cap genesis:restart     # Restart Apache + Varnish
    cap genesis:ssh         # SSH into machine
    cap genesis:start       # Start Apache + Varnish
    cap genesis:stop        # Stop Apache + Varnish
    cap genesis:up          # Uploads Vagrant database & local files into production
    cap genesis:up:db       # Uploads Vagrant database into remote
    cap genesis:up:files    # Uploads local project files to remote
    cap genesis:teardown    # Remove any existing remote deployment files; counterpart to cap's built-in deploy:setup

Now run any one of those commands against an environemnt:

    $ bundle exec cap local genesis:restart

## Troubleshooting

### SSH - Prompting for a password

If you're seeing this:

    $ bundle exec cap staging genesis:ssh
    deploy@staging.example.com's password:

Then the `deploy` user's ssh keys on your remote server *do not match* the keys in your local repository.

You should first ensure that your local repository is up to date, thereby ensuring you are using the latest versioned ssh keys.

    $ git checkout master
    $ git pull origin master
    $ bundle exec cap staging genesis:ssh

If the problem persists, this means that the keys on your remote server are out of date or otherwise incorrect, and you must re-provision by specifying a username and password:

    $ bundle exec cap staging genesis:provision -S user=userWithRootOrSudoAccess -S password=usersHopefullyStrongPassword

### SSH - Host key mismatch

If you're seeing this:

    $ bundle exec cap staging genesis:ssh
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
    Someone could be eavesdropping on you right now (man-in-the-middle attack)!
    It is also possible that a host key has just been changed.
    The fingerprint for the RSA key sent by the remote host is
    d3:4d:b4:4f:d3:4d:b4:4f:d3:4d:b4:4f:d3:4d:b4:4f.
    Please contact your system administrator.
    Add correct host key in ~/.ssh/known_hosts to get rid of this message.
    Offending RSA key in ~/.ssh/known_hosts:68
    RSA host key for staging.example.com has changed and you have requested strict checking.
    Host key verification failed.

Then you have at least one existing entry in your `~/.ssh/known_hosts` file (indicated, in the example above, to be on line 68), with a *different* key than the server is returning.

You can search for all line(s) matching the server name and/or ip address using `grep`:

    $ cat ~/.ssh/known_hosts | grep -n "staging.example.com"
    68:staging.example.com,192.168.1.42 ssh-rsa AAAAB3NzaCd34db33f...

Now, remove those lines from said file, using your text editor of choice.

### SSH - Permission denied (publickey)

If you're seeing this:

```
    servers: ["production.yourwebsite.com"]
    [production.yourwebsite.com] executing command
 ** [production.yourwebsite.com :: out] Permission denied (publickey).
 ** [production.yourwebsite.com :: out] fatal: The remote end hung up unexpectedly
```

Then you probably need to add the SSH keys to your GitHub repo. Open `provisioning/files/ssh/id_rsa.pub` and copy/paste the entire contents (the ssh-rsa key) to your repo by visiting __Settings > Deploy Keys > Add deploy key__.

For more help on this, refer to the [GitHub Docs](https://help.github.com/articles/error-permission-denied-publickey).

### SSH - SSH Authentication Failed!

If you're seeing this:

```
SSH authentication failed! This is typically caused by the public/private
keypair for the SSH user not being properly set on the guest VM. Please
verify that the guest VM is setup with the proper public key, and that
the private key path for Vagrant is setup properly as well.
```

Then you're probably missing the [Vagrant Public](https://raw.github.com/mitchellh/vagrant/master/keys/vagrant.pub) Key in your `authorized_keys`. To add it run:
`curl https://raw.github.com/mitchellh/vagrant/master/keys/vagrant.pub >> ~/.ssh/authorized_keys`

### Vagrant - Error While Executing `VBoxManage`

If you're seeing this:

```
There was an error while executing `VBoxManage`, a CLI used by Vagrant
for controlling VirtualBox. The command and stderr is shown below.

Command: ["hostonlyif", "create"]
```

The you'll need to restart VirtualBox with:
```
sudo /Library/StartupItems/VirtualBox/VirtualBox restart
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

[0]: https://github.com/genesis/wordpress/
[1]: https://github.com/genesis/generator-wordpress/
[2]: http://yeoman.io/
[3]: http://www.vagrantup.com/
[4]: https://github.com/smdahlen/vagrant-hostmanager
[5]: https://github.com/capistrano/capistrano/wiki/2.x-Getting-Started
[6]: http://bower.io/
[7]: http://www.ansibleworks.com/
[8]: https://www.virtualbox.org/
[9]: http://nodejs.org/
[10]: http://bundler.io/

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/genesis/wordpress/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


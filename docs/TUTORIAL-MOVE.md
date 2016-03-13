# Moving to a new remote server

### What you'll need

1. A local stage with data synced down from your old remote stage
  * normally, easy as `bundle exec cap production evolve:down`
2. A fresh Ubuntu server, accessible via ssh

##### Sitenote: Moving from a compromised remote stage
> If you are moving to a new server because the old one was hacked, you should either **use a backup made prior to the compromise**, or take specific action to [sanitize your data and remove any lingering malware](https://codex.wordpress.org/FAQ_My_site_was_hacked).
> 
> You should also regenerate your site, **overwriting your old ssh keys and wordpress salts** in the process. Note this likely requires _reprovisioning all_ of your stages, afterward.
> 
> Because Evolution encourages version control of your themes and plugins, you can detect and undo any unauthorized changes made to them with `git diff`.

### Setting up

It's common to want your new stage provisioned, deployed, and tested before switching DNS over from the old stage. You can do this by updating the ansible inventory file and the relevant capistrano stage configuration.

You'll need to replace the old DNS entry (eg, `production.example.com`) with either an ip address, a [hosts file entry](https://en.wikipedia.org/wiki/Hosts_(file)), or a new DNS record. For example sake, we'll use `new.example.com`.

```diff
diff --git a/lib/ansible/hosts b/lib/ansible/hosts
index c547d91..2810e62 100644
--- a/lib/ansible/hosts
+++ b/lib/ansible/hosts
@@ -2,7 +2,7 @@
 local.example stage=local
 
 [production]
-production.example.com stage=production
+new.example.com stage=production
 
 [staging]
 staging.example.com stage=staging
diff --git a/lib/capistrano/deploy/production.rb b/lib/capistrano/deploy/production.rb
index 6ea0020..24e23fa 100644
--- a/lib/capistrano/deploy/production.rb
+++ b/lib/capistrano/deploy/production.rb
@@ -1,4 +1,4 @@
-server 'production.example.com',
+server 'new.example.com',
   roles:        %w{db web},
   user:         fetch(:user),
   ssh_options:  fetch(:ssh_options)
```

Now, provision, deploy, and sync your new stage:

```
bundle exec cap production evolve:provision
bundle exec cap production deploy
bundle exec cap production evolve:up
```

### Cleaning up

Once you plug `new.example.com` into your browser and confirm it brings up your site as expected, you can switch over dns for `production.example.com` and revert the file changes above.

Enjoy your new production environment!

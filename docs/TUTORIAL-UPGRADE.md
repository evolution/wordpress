# Regenerating an existing Evolution site

### Why regenerate your site?

Non-breaking changes to Evolution are added across **patch versions** (eg, `v1.0.15` to `v1.0.16`), and are automatically pulled down on `bower install` or deployment to a remote stage.

Breaking changes are added across **minor versions** (eg `v1.0.16` to `v1.1.0`), and require running the generator against your existing site codebase

##### Sidenote: Regenerating means recreating
> It's important to have your site already versioned in git and to have any recent changes already committed before regenerating.
>
> This is because running the generator may _recreate_ certain files, and git will show you _precisely_ what will have changed in your site.

Bring up your local copy of the site, or [follow the guide](./TUTORIAL-ClONE.md#cloning-from-the-remote) if you don't already have one.

### Regenerating

Now, run the generator and follow [the prompts](./REF-generator-prompts.md) -- it should pre-select the choices for which it was already configured, and install bundler and bower dependencies automatically:

	yo evolve wordpress
	git status

Git will show you what, if anything, has changed. Add and commit them as necessary.

### Reprovisioning

You should reboot and reprovision your local environment, in case anything in the ansible playbooks have changed. This can be done in a single step:

	vagrant reload --provision

##### Sidenote: Ansible and idempotence
> The playbooks we use for provisioning are designed to be idempotent, meaning that we _should_ be able to provision a machine repeatedly and achieve the same end result.
>
> Should you ever find that reprovisioning fails, we encourage you to [file a Github issue](https://github.com/evolution/wordpress/issues/new) with the full ansible output (to help us diagnose and reproduce the problem).

You should test your local site to ensure it is working properly, after which you can reprovision and redeploy your remote environments:

	bundle exec cap staging evolve:provision
	bundle exec cap staging deploy

You _may_ also want to reboot the server:

	bundle exec cap staging evolve:reboot

### What now?

From here, you can work on the local environment or sync up/down to remote environments as you normally would.

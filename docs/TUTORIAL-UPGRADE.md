# Regenerating an existing Evolution site

### Why regenerate your site?

Non-breaking changes to Evolution are added across **patch versions** (eg, `v1.0.15` to `v1.0.16`), and are automatically pulled down on `bower install` or deployment to a remote stage.

Breaking changes are added across **minor versions** (eg `v1.0.16` to `v1.1.0`), and require running the generator against your existing site codebase

##### Sidenote: Regenerating means recreating
> It's important to have your site already versioned in git and to have any recent changes already committed before regenerating.
>
> This is because running the generator may _recreate_ certain files, and git will show you _precisely_ what will have changed in your site.

### Cloning the existing site

If you don't already have the site running locally (eg, someone else set it up), you will want to clone your own local copy:

	git clone git@yourremoteprovider.com:yourusername/Example.com.git ~/Example.com
	cd ~/Example.com

##### Sidenote: Extra step for public projects
> Since public projects don't have ssh keys or ssl certificates versioned, you would have to acquire them from whoever set up the site initially, and manually put them in the appropriate directories:
> * ssh keys go in: `lib/ansible/files/ssh/`
> * ssl certs go in: `lib/ansible/files/ssl/`

Now, run the generator and follow [the prompts](./REF-generator-prompts.md) -- it should pre-select the choices for which it was already configured, and install bundler and bower dependencies automatically:

	yo evolve wordpress
	git status

Git will show you what, if anything, has changed. Add and commit them as necessary.

##### Sidenote: Installing deps without the generator

> Should you ever need to install dependencies on a newly cloned version of the site _without_ running the generator, you'll need to:
>
	bundle install
	bower install

### Bringing up local

You can start the local environment with vagrant:

	vagrant up

And then sync down from a remote environment (staging in this case) any Wordpress configuration and content that already exists:

	bundle exec cap staging evolve:down

### What now?

From here, you can work on the local environment or sync up/down to remote environments as you normally would.

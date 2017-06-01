# Bringing up an existing Evolution site

### Cloning from the remote

If you don't already have the site running locally (eg, someone else set it up), you will want to clone your own local copy:

	git clone git@yourremoteprovider.com:yourusername/Example.com.git ~/Example.com
	cd ~/Example.com

##### Sidenote: Extra step for public projects
> Since public projects don't have ssh keys or ssl certificates versioned, you would have to acquire them from whoever set up the site initially, and manually put them in the appropriate directories:
> * ssh keys go in: `lib/ansible/files/ssh/`
> * ssl certs go in: `lib/ansible/files/ssl/`

### Installing dependencies

During generation of a new or existing site, the generator does this step for you. Manually installing dependencies is still quite simple, however:

	bundle install
	npm install

Note that npm's postinstall will automatically pull in non-breaking changes from the latest patch version of Evolution (eg, `v1.0.15` to `v1.0.16`).

### Bringing up local

You can start the local environment with vagrant:

	vagrant up

At this point, you can sync down from a remote environment (staging in this case) any Wordpress configuration and content that already exists:

	bundle exec cap staging evolve:down

### What now?

When collaborating on a site with others, be sure to pull down others' changes before commiting and pushing your own, or better yet use branches to keep incomplete features separate.

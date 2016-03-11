# Building a docker image

### Dependencies

- Python
- Jinja2
- Docker

### Prep

Run any util scripts, to generate templates:

```shell
$ (cd utils; python virtualhost.py)
```

### Build

Pull the base image:

```shell
$ docker pull ubuntu:14.04
```

Build and tag our new image:

```shell
$ docker build -t username/evolution-wordpress:1.3.8 .
```

# Using a docker container for your local image

### Getting data _into_ your docker container

You will need a dump of your site's database in the project's root folder, renamed `docker.sql`. You can obtain a gzipped backup of a remote stage with the `evolve:db:backup` [cap task](../docs/REF-cap-tasks.md#evolvedbbackup).

From here, the **db** container will automatically mount and import your `docker.sql` file, and the **web** container will mount your project root. Once the containers are loaded, your dockerized local stage is ready to use (albiet without any of the ssh/capistrano bells and whistles).

### Getting data _out of_ your docker container

Any filesystem changes (such as uploaded files, themes, plugins) will persist through the volume mount and be available on your docker host...no magic necessary!

Any _database_ changes will require a wp-cli export, run from _within the web container_. This means that you first need to [`exec`](https://docs.docker.com/engine/reference/commandline/exec/) into an interactive bash prompt on your running container:

```shell
$ docker exec -it examplecom_web_1 bash
# /usr/local/bin/wp db export /vagrant/docker.sql --opt --path="/vagrant/web/wp" --url="http://local.example.com/" --allow-root
```
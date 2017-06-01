# Testing Evolution WordPress

### Dependencies

- Composer (`$ curl -sS https://getcomposer.org/installer | php`)
- Node + npm dev dependencies
- Vagrant

### Setup

Install Composer and dependencies:

```shell
$ curl -sS https://getcomposer.org/installer | php
$ php composer.phar install
```

Install NPM dependencies:

```shell
$ npm install
```

### Testing Scaffolding

Generate test project scaffolding:

```shell
$ ./bin/mock
```

### Testing Provisioning

Start test project server:

```shell
$ (cd temp && vagrant up)
```

### Unit Tests

```shell
$ ./vendor/bin/phpunit
```

### End-User Testing

Run tests:

```shell
$ npm test
```

Tests will be ran against the new entries in `/etc/hosts`:
- local.example.com
- production.example.com
- www.example.com
- example.com

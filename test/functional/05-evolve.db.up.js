'use strict';

var assert  = require('assert');
var Browser = require('zombie');
var exec    = require('child_process').exec;

describe('cap production evolve:db:up', function(done) {
  it('should not fail', function(done) {
    this.timeout(10 * 1000);

    exec('evolution_non_interactive=1 bundle exec cap production evolve:db:up', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should tell us WHY the very next test is failing', function(done) {
    this.timeout(300 * 1000);
    exec(
      [
        'echo "......Local web dir"; ls -al /vagrant/web/',
        'echo ".......Prod web dir"; ls -al /var/www/example.com/production/master/current/web/',
        'echo "..........All sites"; ls -al /etc/apache2/sites-*/*',
        'echo "..........Databases"; mysql -u root -e "show databases;"',
        'echo "......Root prod url"; curl -vv http://production.example.com/',
        'echo "......Catchall errs"; sudo cat /var/log/apache2/error.log',
        'echo "..........Prod errs"; sudo cat /var/log/apache2/production.example.com-error.log',
        'echo "....Catchall access"; sudo cat /var/log/apache2/access.log',
        'echo "........Prod access"; sudo cat /var/log/apache2/production.example.com-access.log',
        'echo "RESTART EVERYTHING!"; bundle exec cap production evolve:restart'
      ].join('; '), {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      process.stdout.write(stdout);
      process.stdout.write(stderr);
      done();
    });
  });

  it('should be installed', function(done) {
    var browser = new Browser();

    browser
      .visit('http://production.example.com/wp/wp-admin/install.php')
      .then(function() {
        assert.equal('Log In', browser.text('a.button'));
      })
      .then(done, done)
    ;
  })
});

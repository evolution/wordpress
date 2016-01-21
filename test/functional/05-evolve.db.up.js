'use strict';

var assert  = require('assert');
var Browser = require('zombie');
var exec    = require('child_process').exec;

describe('cap production evolve:up:db', function(done) {
  it('should not fail', function(done) {
    exec('evolution_non_interactive=1 bundle exec cap production evolve:up:db', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should be installed', function(done) {
    var browser = new Browser();

    browser
      .visit('http://example.com/')
      .then(null, function() {
        assert.equal('Evolution WordPress Test – Just another WordPress site', browser.text('title'));
      })
      .then(done, done)
    ;
  });

  it('should deny access to prod installer', function(done) {
    var browser = new Browser();

    browser
      .visit('http://example.com/wp/wp-admin/install.php')
      .then(function() {
        assert(false, 'expected 403, got ' + browser.statusCode)
      })
      .catch(function(error) {
        assert.equal(browser.statusCode, 403, "should be forbidden\n" + error);
        done()
      })
    ;
  });

  it('should have remote db backup', function(done) {
    exec('vagrant ssh local -c "ls -A /var/www/example.com/production/master/backups/example_db.*.gz"', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      assert.notEqual(stdout, '')
      done();
    });
  });
});

'use strict';

var assert  = require('assert');
var Browser = require('../../lib/node/nightmare');
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
      .goto(`http://${process.env.EXAMPLE_COM}/`, {'Host':'example.com'})
      .evaluate(function() {
        return document.title;
      })
      .end()
      .then(function(title) {
        assert.equal(title, 'Evolution WordPress Test – Just another WordPress site');
        done()
      })
      .catch(function(error) {
        done(error)
      })
    ;
  });

  it('should deny access to prod installer', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/wp/wp-admin/install.php`, {'Host':'example.com'})
      .end()
      .then(function(result) {
        assert.equal(result.code, 403)
        done()
      })
      .catch(function(error) {
        done(error)
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

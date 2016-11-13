'use strict';

var assert  = require('assert');
var Browser = require('../../lib/node/nightmare');
var fs      = require('fs');
var exec    = require('child_process').exec;

var testFile = '/vagrant/web/wp-content/uploads/uploads_sync_test.jpg';
var testUrl  = `http://${process.env.EXAMPLE_COM}/wp-content/uploads/uploads_sync_test.jpg`;

describe('cap production evolve:files:up', function(done) {
  it('may need to remove uploads', function(done) {
    exec('vagrant ssh local -c "rm -f ' + testFile + '"', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should have no uploads', function(done) {
    exec('evolution_non_interactive=1 bundle exec cap production evolve:files:up', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should not exist at url', function(done) {
    var browser = new Browser();

    browser
      .goto(testUrl, {'Host':'production.example.com'})
      .end()
      .then(function(result) {
        assert.equal(404, result.code)
        done()
      })
      .catch(function(error) {
        done(error);
      })
    ;
  });

  it('may have to create upload', function(done) {
    exec('vagrant ssh local -c "touch ' + testFile + '"', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should sync uploads', function(done) {
    exec('evolution_non_interactive=1 bundle exec cap production evolve:files:up', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      done();
    });
  });

  it('should exist at url', function(done) {
    var browser = new Browser();

    browser
      .goto(testUrl, {'Host':'production.example.com'})
      .end()
      .then(function(result) {
        assert.notEqual(404, result.code)
        done();
      })
      .catch(function(error) {
        assert(error)
      })
    ;
  });
});

'use strict';

var assert  = require('assert');
var exec    = require('child_process').exec;

describe('ssl server name indication', function(done) {
  it('local host should serve local cert', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect local.example.com:443 -servername local.example.com', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=local.example.com'));
      done();
    });
  });

  it('production host should serve production cert', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect production.example.com:443 -servername production.example.com', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });
});

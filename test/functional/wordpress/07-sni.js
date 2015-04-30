'use strict';

var assert  = require('assert');
var exec    = require('child_process').exec;
var Browser = require('zombie');

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

  it('production.domain (1/3) should serve production cert', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect production.example.com:443 -servername production.example.com', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('www.domain (2/3) should serve production cert', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect www.example.com:443 -servername www.example.com', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('bare domain (3/3) should serve production cert', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect production.example.com:443 -servername production.example.com', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('not vulnerable to CVE-2014-3566 (SSLv3 POODLE)', function(done) {
    this.timeout(60 * 1000);

    exec('openssl s_client -connect local.example.com:443 -ssl3', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stderr.match('routines:SSL3_READ_BYTES:sslv3 alert handshake failure'));
      done();
    });
  });

});

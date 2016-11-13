'use strict';

var assert  = require('assert');
var exec    = require('child_process').exec;

describe('ssl server name indication', function(done) {
  it('local host should serve local cert', function(done) {
    exec(`openssl s_client -connect ${process.env.EXAMPLE_COM}:443 -servername local.example.com`, {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=local.example.com'));
      done();
    });
  });

  it('production.domain (1/3) should serve production cert', function(done) {
    exec(`openssl s_client -connect ${process.env.EXAMPLE_COM}:443 -servername production.example.com`, {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('www.domain (2/3) should serve production cert', function(done) {
    exec(`openssl s_client -connect ${process.env.EXAMPLE_COM}:443 -servername www.example.com`, {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('bare domain (3/3) should serve production cert', function(done) {
    exec(`openssl s_client -connect ${process.env.EXAMPLE_COM}:443 -servername production.example.com`, {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stdout.match('CN=example.com'));
      done();
    });
  });

  it('not vulnerable to CVE-2014-3566 (SSLv3 POODLE)', function(done) {
    exec(`openssl s_client -connect ${process.env.EXAMPLE_COM}:443 -ssl3`, {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(! stderr.match('routines:SSL3_READ_BYTES:sslv3 alert handshake failure'));
      done();
    });
  });

});

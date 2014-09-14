'use strict';

var assert  = require('assert');
var exec    = require('child_process').exec;

var nc_host;

describe('firewall ports', function(done) {
  it('should resolve host', function(done) {
    exec('php -r "echo gethostbyname(\'local.example.com.\');"', {
      cwd: process.cwd() + '/temp'
    }, function(err, stdout, stderr) {
      assert.ifError(err);
      nc_host = stdout.trim();
      done();
    });
  });

  describe('should be closed', function(done) {
    it('mysql', function(done) {
      exec('nc -z ' + nc_host + ' 3306', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err);
        done();
      });
    });

    it('apache backend', function(done) {
      exec('nc -z ' + nc_host + ' 8080', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err);
        done();
      });
    });
  });

  describe('should be open', function(done) {
    it('ssh', function(done) {
      exec('nc -z ' + nc_host + ' 22', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });

    it('http', function(done) {
      exec('nc -z ' + nc_host + ' 80', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });

    it('https', function(done) {
      exec('nc -z ' + nc_host + ' 443', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });
  });
});

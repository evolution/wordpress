'use strict';

var assert  = require('assert');
var exec    = require('child_process').exec;
var util    = require('util');

var port_cmd;

describe('firewall ports', function(done) {
  it('should resolve host', function(done) {
    if (process.env.TRAVIS) {
      port_cmd = 'sudo iptables -L -n | grep :%d';
      done();
    } else {
      exec('php -r "echo gethostbyname(\'local.example.com.\');"', {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        port_cmd = 'nc -z -w 1 ' + stdout.trim() + ' %d';
        done();
      });
    }
  });

  describe('should be closed', function(done) {
    it('mysql', function(done) {
      exec(util.format(port_cmd, '3306'), {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err);
        done();
      });
    });

    it('apache backend', function(done) {
      exec(util.format(port_cmd, '8080'), {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err);
        done();
      });
    });
  });

  describe('should be open', function(done) {
    it('ssh', function(done) {
      exec(util.format(port_cmd, '22'), {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });

    it('http', function(done) {
      exec(util.format(port_cmd, '80'), {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });

    it('https', function(done) {
      exec(util.format(port_cmd, '443'), {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ifError(err);
        done();
      });
    });
  });
});

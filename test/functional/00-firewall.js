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
      port_cmd = `nc -z -w 1 ${process.env.EXAMPLE_COM} %d`;
      done();
    }
  });

  describe('should be closed', function(done) {
    it('mysql', function(done) {
      var formatted_cmd = util.format(port_cmd, '3306');
      exec(formatted_cmd, {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err, formatted_cmd);
        done();
      });
    });

    it('apache backend', function(done) {
      var formatted_cmd = util.format(port_cmd, '8080');
      exec(formatted_cmd, {
        cwd: process.cwd() + '/temp'
      }, function(err, stdout, stderr) {
        assert.ok(err, formatted_cmd);
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

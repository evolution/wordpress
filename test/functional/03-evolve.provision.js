'use strict';

var assert  = require('assert');
var spawn   = require('child_process').spawn;

describe('cap production evolve:provision', function(done) {
  it('should not fail', function(done) {
    var output = '';

    var child = spawn('bundle', ['exec', 'cap', 'production', 'evolve:provision'], {
      cwd: process.cwd() + '/temp'
    });

    child.stdout.on('data', function (data) {
      if (process.env.TRAVIS) {
        console.log(data.toString());
      } else {
        output += data.toString();
      }
    });

    child.stderr.on('data', function (data) {
      if (process.env.TRAVIS) {
        console.log(data.toString());
      } else {
        output += data.toString();
      }
    });

    child.on('exit', function (code) {
      if (code) {
        if (!process.env.TRAVIS) {
          console.error(output);
        }
        done(new Error('exited with ' + code));
      } else {
        done();
      }
    });
  });
});

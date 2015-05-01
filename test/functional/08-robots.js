'use strict';

var assert  = require('assert');
var Browser = require('zombie');

describe.only('robots.txt', function(done) {
  it('on local, should disallow all', function(done) {
    var browser = new Browser();

    browser
      .visit('http://local.example.com/robots.txt')
      .then(function() {
        assert(!!browser.text().match('# Block everything...'));
      })
      .then(done, done)
    ;
  });
});

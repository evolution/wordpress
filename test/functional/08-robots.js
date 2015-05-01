'use strict';

var assert  = require('assert');
var Browser = require('zombie');

describe('robots.txt', function(done) {
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

  it('on public prod, should point to sitemap', function(done) {
    var browser = new Browser();

    browser
      .visit('http://example.com/robots.txt')
      .then(function() {
        assert(!!browser.text().match('# Sitemap: '));
      })
      .then(done, done)
    ;
  });
});

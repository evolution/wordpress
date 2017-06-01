'use strict';

var assert  = require('assert');
var Browser = require('../../lib/node/nightmare');

describe(`robots.txt`, function(done) {
  it('on local, should disallow all', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/robots.txt`, {'Host':'local.example.com'})
      .evaluate(function() {
        return document.body.innerText;
      })
      .end()
      .then(function(text) {
        assert(!!text.match('# Block everything...'), text);
        done()
      })
      .catch(function(error) {
        done(error)
      })
    ;
  });

  it('on public prod, should point to sitemap', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/robots.txt`, {'Host':'example.com'})
      .evaluate(function() {
        return document.body.innerText;
      })
      .end()
      .then(function(text, result) {
        console.dir(result, {colors:true});
        assert(!!text.match('# Sitemap: '), text);
        done()
      })
      .catch(function(error) {
        done(error)
      })
    ;
  });
});

'use strict';

var assert    = require('assert');
var Browser   = require('../../../lib/node/nightmare');

describe('WordPress', function() {
  it('should redirect /wp-admin to /wp/wp-admin', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/wp-admin`, {'Host':'example.com'})
      .end()
      .then(function(result) {
        assert.equal(200, result.code);
        assert.equal(0, result.url.indexOf('http://example.com/wp/wp-login'));
        done()
      })
      .catch(function(error) {
        done(err)
      })
    ;
  });
});

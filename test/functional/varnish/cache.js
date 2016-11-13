'use strict';

var assert    = require('assert');
var Browser   = require('../../../lib/node/nightmare');

describe('Varnish', function() {
  it('should access backend', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/`, {'Host':'example.com'})
      .evaluate(function() {
        return document.title;
      })
      .end()
      .then(function(title) {
        assert.equal(title, 'Evolution WordPress Test – Just another WordPress site');
        done()
      })
      .catch(function(error) {
        done(error)
      })
    ;
  });

  describe('with no cookies', function() {
    it('should cache', function(done) {
      var browser = new Browser();

      browser
        .goto(`http://${process.env.EXAMPLE_COM}/`, {'Host':'example.com'})
        .end()
        .then(function(result) {
          assert.equal(result.headers['x-cache'], 'cached')
          done()
        })
        .catch(function(error) {
          done(error)
        })
      ;
    });
  });

  describe('with WordPress cookies', function() {
    it('should not cache', function(done) {
      var browser = new Browser();

      browser
        .goto(`http://${process.env.EXAMPLE_COM}/`, {
          'Host':'example.com',
          'Cookie':'wordpress_test_cookie=WP+Cookie+check',
        })
        .end()
        .then(function(result) {
          assert.equal(result.headers['age'], '0')
          assert.equal(result.headers['x-cache'], 'uncached')
          done()
        })
        .catch(function(error) {
          done(error)
        })
      ;
    });
  });

  describe('with tracking cookies', function() {
    it('should ignore tracking cookies for cache', function(done) {
      var browser = new Browser();

      browser
        .goto(`http://${process.env.EXAMPLE_COM}/`, {
          'Host':'example.com',
          'Cookie':`_test=${new Date()}`,
        })
        .end()
        .then(function(result) {
          assert(result.headers['age'])
          assert.equal(result.headers['x-cache'], 'cached')
          done()
        })
        .catch(function(error) {
          done(error)
        })
      ;
    });
  });

  describe('with an application cookies', function() {
    var cookie  = `test=${new Date()}`;

    it('should not be cached initially', function(done) {
      var browser = new Browser();

      browser
        .goto(`http://${process.env.EXAMPLE_COM}/`, {
          'Host':'example.com',
          'Cookie':cookie,
        })
        .end()
        .then(function(result) {
          assert.equal(result.headers['age'], '0')
          assert.equal(result.headers['x-cache'], 'uncached')
          done()
        })
        .catch(function(error) {
          done(error)
        })
      ;
    });

    it('should be subsequently cached', function(done) {
      var browser = new Browser();

      browser
        .goto(`http://${process.env.EXAMPLE_COM}/`, {
          'Host':'example.com',
          'Cookie':cookie,
        })
        .end()
        .then(function(result) {
          assert(result.headers['age'])
          assert.equal(result.headers['x-cache'], 'cached')
          done()
        })
        .catch(function(error) {
          done(error)
        })
      ;
    });
  });
});

'use strict';

var assert    = require('assert');
var Browser   = require('../../lib/node/nightmare');
var fs        = require('fs');
var path      = require('path');

describe('Mock site', function() {
  it('may not be installed', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/wp/wp-admin/install.php`, {'Host':'local.example.com'})
      .select('select[name=language]', '')
      .click('form[action$="?step=1"] input[type=submit]')
      .wait('form[action$="?step=2"]')
      .click('button.wp-hide-pw')
      .type('input[name=weblog_title]', 'Evolution WordPress Test')
      .type('input[name=user_name]', 'test')
      .type('input[name=admin_password]', 'test')
      .check('input[name=pw_weak]')
      .type('input[name=admin_email]', 'test@example.com')
      .uncheck('input[name=blog_public]')
      .click('form[action$="?step=2"] input[type=submit]')
      .wait('a[href$="/wp-login.php"]')
      .end()
      .then(done)
      .catch(function(error) {
        done();
      });
    ;
  });

  it('should be installed', function(done) {
    var browser = new Browser();

    browser
      .goto(`http://${process.env.EXAMPLE_COM}/wp/wp-admin/install.php`, {'Host':'local.example.com'})
      .evaluate(function() {
        return document.querySelector('a[href$="/wp-login.php"]').href
      })
      .end()
      .then(function(link) {
        assert.equal(link, 'http://local.example.com/wp/wp-login.php');
        done();
      })
    ;
  })
});

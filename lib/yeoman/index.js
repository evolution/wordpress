'use strict';

var chalk   = require('chalk');
var crypto  = require('crypto');
var fs      = require('fs-extra');
var glob    = require('glob');
var path    = require('path');
var keygen  = require('ssh-keygen');
var request = require('request');
var yeoman  = require('yeoman-generator');
var util    = require('util');

var WordpressGenerator = yeoman.generators.Base.extend({
  init: function() {
    this.pkg      = JSON.parse(this.readFileAsString(path.join(__dirname, '../../package.json')));
    this.prompts  = [];

    this.option('dev', {
      desc: 'Dev-mode for localized development of the generator',
      defaults: false,
    });

    this.on('end', function() {
      this.installDependencies({
        bower:        true,
        npm:          false,
        skipInstall:  this.options['skip-install'],
        skipMessage:  true,
        callback:     function() {
          this.log.write();
          this.log.ok('All done! Run ' + chalk.yellow('vagrant up') + ' to get started!');
        }.bind(this)
      });
    });

    this.sourceRoot(path.join(__dirname, 'templates'));
  },

  welcome: function() {
    var message = this.readFileAsString(path.join(__dirname, 'welcome.txt'));

    message = message.replace(/./g, function(match) {
      return /\w/.test(match) ? chalk.yellow(match) : chalk.cyan(match);
    });

    this.log.writeln(message);
  },

  checkDeps: function() {
    if(process.env.CI) {
      return true;
    }

    var done    = this.async();
    var deps    = ['sshpass', 'bundler', 'ansible', 'bower', 'npm'];
    var missing = [];
    var exited  = function(dependency, err) {
      deps.pop();

      if (err) { missing.push(dependency); }

      if (!deps.length) {
        if (missing.length) {
          err = new Error('Missing prerequisites');
          this.log.error('Could not find dependencies:' + chalk.red("\n\t- "+missing.join("\n\t- ")) );
        }
        done(err);
      }
    }

    this.log.info('Checking for installed prerequisites...');
    deps.forEach(function (dependency) {
      this.emit('dependencyCheck'+dependency);

      this
        .spawnCommand('which', [dependency], {cwd: this.env.cwd, env: process.env})
        .on('error', exited.bind(this, dependency))
        .on('exit', this.emit.bind(this, 'dependencyCheck'+dependency+':end'))
        .on('exit', exited.bind(this, dependency))
      ;
    }.bind(this));
  },

  promptForPrivate: function() {
    var bowerFile = path.join(this.env.cwd, 'bower.json');
    var choices   = [
      {
        name: 'Private',
        value:  true,
      },
      {
        name:  'Public',
        value:  false,
      },
    ];
    var existing = function() {
      try {
        var bower = JSON.parse(this.readFileAsString(bowerFile));

        return !bower.private;
      } catch(e) {};
    }.bind(this);

    if(existing()) {
      choices.reverse();
    }

    this.prompts.push({
      type:     'list',
      name:     'private',
      message:  'This repository is',
      choices:  choices,
    });
  },

  promptForSsl: function() {
    var defaultSsl = true;

    try {
      var provisionYml = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'provision.yml'));
      defaultSsl = !!provisionYml.match(/^\s*-\s+pound/m);
    } catch(e) {};

    var choices  = [
      {
        name:   'Yes, HTTPS (SSL)',
        value:  true,
      },
      {
        name:   'No, HTTP-only',
        value:  false,
      },
    ];

    if(!defaultSsl) {
      choices.reverse();
    }

    this.prompts.push({
      type:     'list',
      name:     'ssl',
      message:  'Will this site serve HTTPS (SSL) traffic?',
      choices:  choices
    });

    if(glob.sync('lib/ansible/files/ssl/*.pem').length) {
      this.prompts.push({
        type:     'list',
        name:     'sslOverwrite',
        message:  'Overwrite existing SSL certificates?',
        when:     function (props) {
          return props.ssl;
        },
        choices:  [
          {
            name:   'Do not overwrite',
            value:  false,
          },
          {
            name:   'Overwrite',
            value:  true,
          },
        ]
      });
    }
  },

  promptForSSHOverwrite: function() {
    if(glob.sync('lib/ansible/files/ssh/id_rsa*').length) {
      this.prompts.push({
        type:     'list',
        name:     'sshOverwrite',
        message:  'Overwrite existing SSH keys?',
        choices:  [
          {
            name:   'Do not overwrite',
            value:  false,
          },
          {
            name:   'Overwrite',
            value:  true,
          },
        ]
      });
    }
  },

  promptForName: function() {
    var existing = function() {
      try {
        var bower = JSON.parse(this.readFileAsString(path.join(this.env.cwd, 'bower.json')));

        return bower.name;
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'name',
      message:  'Repository name (e.g. MySite)',
      default:  function() {
        return existing() || path.basename(this.env.cwd);
      }.bind(this)
    });
  },

  promptForDomain: function() {
    var existing = function() {
      try {
        var match = this.readFileAsString(path.join(this.env.cwd, 'Vagrantfile'))
          .match(/box.vm.hostname[ ]*=[ ]*"local.([^"]+)"/);

        return match[1];
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'domain',
      message:  'Domain name (e.g. mysite.com)',
      default:  function () {
        return existing() || path.basename(this.env.cwd).toLowerCase();
      }.bind(this),
      validate: function(input) {
        if (/^[\w-]+\.\w+(?:\.\w{2,3})?$/.test(input)) {
          return true;
        } else if (!input) {
          return "Domain is required";
        }

        return chalk.yellow(input) + ' does not appear to be a domain';
      }
    });
  },

  promptForWww: function() {
    var choices = [
      {
        name:   'No, just the domain',
        value:  false,
      },
      {
        name:   'Yes, www is preferred',
        value:  true,
      },
    ];
    var existing = function() {
      try {
        var match = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
          .match(/www[ ]*:[ ]*(true)/i);

        return match[1];
      } catch(e) {};
    }.bind(this);

    if(existing()) {
      choices.reverse();
    }

    this.prompts.push({
      required: true,
      type:     'list',
      name:     'www',
      message:  'Should this site enforce a www subdomain in production? (e.g. www.mysite.com)',
      choices:  choices
    });
  },

  promptForNewrelic: function() {
    var existing = function() {
      try {
        var match = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
          .match(/newrelic[ ]*:[ ]*(?:'|")?([^'"\s]+)/i);

        return match[1];
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'newrelic',
      message:  'New Relic license key (leave blank to disable)',
      default:  function () {
        return existing() || '';
      }.bind(this)
    });
  },

  promptForDatadog: function() {
    var existing = function() {
      try {
        var match = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
          .match(/datadog_api_key[ ]*:[ ]*(?:'|")?([^'"\s]+)/i);

        return match[1];
      } catch(e) {};
    }.bind(this);

    this.prompts.push({
      required: true,
      type:     'text',
      name:     'datadog',
      message:  'Datadog license key (leave blank to disable)',
      default:  function () {
        return existing() || '';
      }.bind(this)
    });
  },

  promptForRoles: function() {
    // populate choices based on static roles array
    var choices = [];
    WordpressGenerator.roles.forEach(function (role) {
      choices.push({
        name:    WordpressGenerator.padRight(role.name, 14) + ' - ' + role.desc,
        value:   role.name,
        checked: role.default,
      });
    });

    try {
      var provisionYml = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'provision.yml'));

      // detect roles in simple or expanded yaml form
      // TODO: parse as yaml & evaluate data, instead of brittle string/regex matches
      choices.forEach(function (role, index) {
        var simple = new RegExp('^\\s*-\\s+' + role.value, 'm');
        var expanded = new RegExp('^\\s*-\\s*[{][^}]*?role:\\s*' + role.value, 'm');

        if (!simple.exec(provisionYml) && !expanded.exec(provisionYml)) {
          choices[index].checked = false;
        }
      });
    } catch(e) {};

    this.prompts.push({
      required: true,
      type:     'checkbox',
      name:     'roles',
      message:  'Optional features',
      choices:  choices,
    });
  },

  promptForWordPress: function() {
    var existing = function() {
      try {
        var file    = this.readFileAsString(path.join(this.env.cwd, 'web', 'wp', 'wp-includes', 'version.php'));
        var version = file.match(/\$wp_version\s=\s['"]([^'"]+)/);

        if (version.length) {
          return version[1];
        }
      } catch(e) {}
    }.bind(this);

    var done = this.async();

    WordpressGenerator.latest('wordpress', 'wordpress', function(err, tag) {
      this.prompts.push({
        type:     'text',
        name:     'wordpress',
        message:  'WordPress version',
        default:  function() {
          return existing() || tag || '4.7';
        }
      });

      done();
    }.bind(this));
  },

  promptForAutoUpdate: function() {
    var choices  = [
      {
        name:   'No',
        value:  false,
      },
      {
        name:   'Yes, but only minor releases (eg, 4.6.1 => 4.6.3)',
        value:  'minor',
      },
      {
        name:   'Yes, including major releases (eg, 4.6.1 => 4.7.1)',
        value:  'major',
      },
    ];

    var existing = function() {
      try {
        var match = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
          .match(/wordpress__autoupdate[ ]*:[ ]*(?:'|")?(minor|major)/i);
        return match[1];
      } catch(e) {};
    }.bind(this);

    var majority = existing();
    if (majority == 'major') {
      choices[0] = choices.splice(2, 1, choices[0])[0];
    } else if (majority == 'minor') {
      choices.push(choices.shift());
    }

    this.prompts.push({
      required: true,
      type:     'list',
      name:     'wp_autoupdate',
      message:  'Autuomatically apply (and commit to git) WordPress updates, including plugins and themes?',
      choices:  choices
    });
  },

  promptForTablePrefix: function() {
    var existing = function() {
      try {
        var config = this.readFileAsString(path.join(this.env.cwd, 'web', 'wp-config.php'));
        var prefix = config.match(/\$table_prefix\s*=\s*['"]([^'"]+)/);

        if (prefix.length) {
          return prefix[1];
        }
      } catch(e) {}
    }.bind(this);

    this.prompts.push({
      type:     'text',
      name:     'prefix',
      message:  'WordPress table prefix',
      default:  function() {
        return existing() || 'wp_';
      }
    });
  },

  promptForDatabase: function() {
    var done      = this.async();
    var existing  = function(constant) {
      try {
        var config = this.readFileAsString(path.join(this.env.cwd, 'web', 'wp-config.php'));
        var regex   = new RegExp(constant + '[\'"],\\s*[\\w:(]*[\'"]([^\'"]+)');
        var matches = regex.exec(config);

        return matches && matches[1];
      } catch(e) {}
    }.bind(this);

    crypto.randomBytes(12, function(err, buffer) {
      this.prompts.push({
        type:     'text',
        name:     'DB_NAME',
        message:  'Database name',
        default:  function() { return existing('DB_NAME') || 'wordpress'; }
      });

      this.prompts.push({
        type:     'text',
        name:     'DB_USER',
        message:  'Database user',
        default:  function() { return existing('DB_USER') || 'wordpress'; }
      });

      this.prompts.push({
        type:     'text',
        name:     'DB_PASSWORD',
        message:  'Database password',
        default:  function() { return existing('DB_PASSWORD') || buffer.toString('base64'); }
      });

      this.prompts.push({
        type:     'text',
        name:     'DB_HOST',
        message:  'Database host',
        default:  function() { return existing('DB_HOST') || '127.0.0.1'; }
      });

      done();
    }.bind(this));
  },

  promptForIp: function() {
    // Private IP blocks
    var blocks = [
      ['192.168.0.0', '192.168.255.255'],
      ['172.16.0.0',  '172.31.255.255'],
      ['10.0.0.0',    '10.255.255.255']
    ];

    // Long IP ranges
    var ranges = blocks.map(function(block) {
      return block.map(function(ip) {
        var parts = ip.split('.');

        return parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3] >>> 0;
      });
    });

    // Randomize IP addresses
    var ips = ranges.map(function(range) {
      return Math.random() * (range[1] - range[0]) + range[0];
    }).map(function(ip) {
      return [
        (ip & (0xff << 24)) >>> 24,
        (ip & (0xff << 16)) >>> 16,
        (ip & (0xff << 8)) >>> 8,
        (ip & (0xff << 0)) >>> 0
      ].join('.');
    });

    try {
      var vagrant = this.readFileAsString('Vagrantfile').match(/ip:\s['"]([\d\.]+)['"]/);

      if (vagrant.length) {
        ips.unshift(vagrant[1]);
      }
    } catch(e) {}

    this.prompts.push({
      required: true,
      type:     'list',
      name:     'ip',
      message:  'Vagrant IP',
      pattern:  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      choices:  ips
    });
  },

  ask: function() {
    var done = this.async();

    this.prompt(this.prompts, function(props) {
      this.props = props;

      done();
    }.bind(this));
  },

  promptForLocalVarnish: function() {
    // test whether varnish role is used in the first place
    var doVarnish = this.props.roles.filter(function (value) {
      return value == 'varnish';
    });

    // prompt for local varnish bypass, as necessary
    if (doVarnish.length) {
      var choices = [
        {
          name:   'Yes, enable varnish locally',
          value:  true,
        },
        {
          name:   'No, just on staging and production',
          value:  false,
        },
      ];

      try {
        var provisionYml = this.readFileAsString(path.join(this.env.cwd, 'lib', 'ansible', 'provision.yml'));

        if (provisionYml.indexOf("{ role: varnish, when: stage != 'local' }") != -1) {
          choices.reverse();
        }
      } catch(e) {};

      var done = this.async();

      this.prompt(
        [
          {
            required: true,
            type:     'list',
            name:     'varnishLocal',
            message:  'Enable varnish on your local stage?',
            choices:  choices,
          }
        ], function(props) {
        this.props.varnishLocal = props.varnishLocal;

        done();
      }.bind(this));
    } else {
      this.props.varnishLocal = true;
    }
  },

  prepareReadme: function() {
    try {
      this.readmeFile = this.readFileAsString(path.join(this.env.cwd, 'README.md'));
      this.readmeFile = this.readmeFile
        .replace(/^(?:\[[^\]\r\n]+\]){1,2}(?:\([^\)\r\n]+\))?[\r\n]+=+[\r\n]+> Powered by \[(?:Genesis|Evolution)[^\r\n]+[\r\n]+/i, '')
        .replace(/[\r\n]\[[^\]\r\n]+\]:\s*http[^\r\n]+[\r\n]+\[(?:genesis|evolution)-wordpress\]:\s*http[^\r\n]+[\r\n]*$/i, '')
      ;
    } catch(e) {
      this.readmeFile = '';
    }
  },

  prepareHtaccess: function() {
    try {
      this.htaccessFile = this.readFileAsString(path.join(this.env.cwd, 'web', '.htaccess'));
      this.htaccessFile = this.htaccessFile.replace(/# BEGIN Evolution WordPress(?:.|[\r\n]+)+?# END Evolution WordPress[\r\n]*/i, '').trim();

      this.htaccessWpBlock = !!this.htaccessFile.match(/# BEGIN WordPress(?:.|[\r\n]+)+?# END WordPress[\r\n]*/i);
    } catch(e) {
      this.htaccessFile = '';
      this.htaccessWpBlock = false;
    }
  },

  prepareGitignore: function () {
    try {
      this.gitignoreFile = this.readFileAsString(path.join(this.env.cwd, '.gitignore'));
      this.gitignoreFile = this.gitignoreFile.match(/[\r\n]+# Generated file, don't edit above this line[\r\n]*([\S\s]*?)[\r\n]*$/i)[1];
    } catch(e) {
      this.gitignoreFile = '';
    }
  },

  prepareRoles: function() {
    this.props.roles = WordpressGenerator.roles.map(function(role) {
      var checked = !!~this.props.roles.indexOf(role.name);

      role.value = (checked ? '-' : '#') + ' ';

      if (role.name == 'varnish' && !this.props.varnishLocal) {
        role.value += "{ role: varnish, when: stage != 'local' }";
      } else {
        role.value += WordpressGenerator.padRight(role.name, 17);
      }

      role.value += ' # (Optional) ' + role.desc;

      return role;
    }.bind(this));
  },

  prepareSalts: function() {
    var done = this.async();

    request('https://api.wordpress.org/secret-key/1.1/salt/', function(err, response, salts) {
      if (err) {
        throw err;
      }

      this.props.salts = salts;
      done();
    }.bind(this));
  },

  prepareSshKeys: function() {
    if (typeof(this.props.sshOverwrite) !== 'undefined' && this.props.sshOverwrite !== true) {
      this.log.skip('SSH keys exist, skipping keygen...');
      return false;
    }

    var done      = this.async();
    var location  = path.join(this.env.cwd, 'lib', 'ansible', 'files', 'ssh', 'id_rsa');

    this.log.info('Creating SSH keys...');

    this.mkdir(path.dirname(location));

    keygen({
      location: location,
      comment:  'deploy@' + this.props.domain,
      read: false
    }, done);
  },

  prepareTemplates: function() {
    this.templates = this.expandFiles('**/*', {
      cwd: this.sourceRoot(),
    });
  },

  ready: function() {
    this.log.write('\n');
    this.log.info(chalk.green('Here we go!'));
  },

  symlinkEvolutionWordPress: function() {
    if (!this.options.dev) {
      return false;
    }

    this.log.info(chalk.green('Symlinking local Evolution WordPress as dependency...'));

    var srcpath = '../../../wordpress';
    var dstpath = path.join(this.env.cwd, 'bower_components', 'evolution-wordpress');

    this.mkdir(path.dirname(dstpath));

    fs.symlinkSync(srcpath, dstpath);
  },

  /**
   * Specify project dependencies (e.g. WordPress, Evolution, etc.) via `bower.json`
   */
  copyBower: function() {
    this.template('bower.json', 'bower.json');
    this.template('_bowerrc', '.bowerrc');
  },

  /**
   * Install project dependencies (e.g. WordPress, Evolution) for later usage by the generator
   */
  runBower: function() {
    var done = this.async();

    this.log.info(chalk.green('Installing project dependencies...'));

    this.bowerInstall(null, null, done);
  },

  /**
   * Bower's `postInstall` can only be ran after all other dependencies have been installed
   */
  copyBowerrc: function() {
    this.template('_bowerrc', '.bowerrc');
  },

  prepareWpConfig: function() {
    this.wpConfigFile = this.readFileAsString(path.join(this.env.cwd, 'web', 'wp', 'wp-config-sample.php'));
  },

  scaffold: function() {
    this.log.info(chalk.green('Scaffolding...'));

    this.templates.forEach(function(file) {
      this.template(file, file.replace(/(^|\/)_/, '$1.'));
    }.bind(this));
  },

  generateSslCert: function() {
    if (!this.props.ssl) {
      return false;
    }

    if (typeof(this.props.sslOverwrite) !== 'undefined' && this.props.sslOverwrite !== true) {
      this.log.skip('SSL certificates exist, skipping creation...');
      return false;
    }

    var done      = this.async();
    var location  = path.join(this.env.cwd, 'lib', 'ansible', 'files', 'ssl');
    var stages    = ['local', 'staging', 'production'];
    var exited    = function (err) {
      stages.pop();

      if (err || !stages.length) {
        done(err);
      }
    };

    this.log.info('Creating self-signed SSL certificate...');

    this.mkdir(path.dirname(location));

    stages.forEach(function (stage) {
      this.emit('sslInstall'+stage);

      var cert = path.join(location, stage + '.' + this.props.domain + '.pem');
      var cfg  = path.join(location, stage + '.cfg');

      this
        .spawnCommand('openssl', [
          'req',
          '-x509',
          '-nodes',
          '-days',
          '365',
          '-newkey',
          'rsa:2048',
          '-keyout',
          cert,
          '-out',
          cert,
          '-config',
          cfg
        ], {
          cwd: this.env.cwd,
        })
        .on('error', exited)
        .on('exit', this.emit.bind(this, 'sslInstall'+stage+':end'))
        .on('exit', function (err) {
          if (err === 127) {
            this.log.error('Could not generate SSL certificate for '+stage);
          }

          exited(err);
        }.bind(this))
      ;
    }.bind(this));
  },

  symlinkBowerComponents: function() {
    var bowerPath = path.join(this.env.cwd, 'web', 'bower_components');

    if (fs.existsSync(bowerPath)) {
      this.log.info(chalk.yellow('Removing `bower_components` symlink from `web`...'));

      fs.unlinkSync(bowerPath);
    }

    this.log.info(chalk.green('Symlinking `bower_components` into `web`...'));

    fs.symlinkSync('../bower_components', bowerPath);
  },

  fixPermissions: function() {
    fs.chmodSync(path.join(this.env.cwd, 'lib', 'ansible', 'files', 'ssh', 'id_rsa'), '600');
  },

  installGems: function() {
    var done      = this.async();
    var installer = 'bundle';

    this.log.info(chalk.green('Installing Gems...'));

    this.emit(installer + 'Install');

    this
      .spawnCommand(installer, ['install'], done)
      .on('error', done)
      .on('exit', this.emit.bind(this, installer + 'Install:end'))
      .on('exit', function (err) {
        if (err === 127) {
          this.log.error('Could not run bundler. Please install with `sudo ' + installer + ' install`.');
        }

        done(err);
      }.bind(this))
    ;
  },
});

WordpressGenerator.roles = [
  {
    name:     'apache-prefork',
    desc:     'Dynamic Apache performance tuning',
    default:  true,
  },
  {
    name:     'php-hardened',
    desc:     'Security-minded restrictions on PHP userland',
    default:  true,
  },
  {
    name:     'varnish',
    desc:     'High-performance reverse-proxy cache',
    default:  true,
  },
  {
    name:     'mail',
    desc:     'Ability to send e-mails from the server (i.e. PHP)',
    default:  true,
  },
  {
    name:     'firewall',
    desc:     'Simple intrusion protection via Fail2ban + iptables',
    default:  true,
  },
  {
    name:     'debug',
    desc:     'Tools to monitor processes & debug when on the server',
    default:  true,
  },
  {
    name:     'awstats',
    desc:     'HTTP log analyzer',
    default:  true,
  },
  {
    name:     'snapshots      - Recurring interval backups',
    value:    'snapshots         # (Optional) Recurring interval backups',
    checked:  true,
  },
];

WordpressGenerator.padRight = function(str, len, char) {
  if (str.length < len) {
    return str + Array(len - str.length + 1).join(char||" ");
  } else {
    return str;
  }
};

WordpressGenerator.latest = function(username, repo, fn) {
  request({
    url: 'https://api.github.com/repos/' + username + '/' + repo + '/git/refs/tags/',
    headers: { 'user-agent': 'https://github.com/request/request' }
  }, function (err, res, body) {
    if(!(/^200/).test(res.headers.status))
      return fn(new Error(res.headers.status));

    try {
      var fuzzyver = /^\s*v?(\d+)\.(\d+)(?:\.(\d+))?\s*$/;
      var tags = JSON.parse(body)
        .map(function(item){
          return item.ref.split('/').pop();
        })
        .filter(RegExp.prototype.test.bind(fuzzyver))
        .sort(function (a, b) {
          var ma = a.match(fuzzyver);
          var mb = b.match(fuzzyver);

          if (ma[1] == mb[1]) {
            if (ma[2] == mb[2]) {
              ma[3] = ma[3] || '0';
              mb[3] = mb[3] || '0';
              if (ma[3] == mb[3])
                return 0;
              else if (parseInt(ma[3]) > parseInt(mb[3]))
                return 1;
              else
                return -1;
            }
            else if (parseInt(ma[2]) > parseInt(mb[2]))
              return 1;
            else
              return -1;
          }
          else if (parseInt(ma[1]) > parseInt(mb[1]))
            return 1;
          else
            return -1;
        });
    } catch (e) {
      return fn(e);
    }

    fn(null, tags.pop());
  });
};

module.exports = WordpressGenerator;

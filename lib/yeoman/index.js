'use strict'

var chalk   = require('chalk');
var crypto  = require('crypto');
var fs      = require('fs-extra');
var glob    = require('glob');
var keygen  = require('ssh-keygen');
var path    = require('path');
var request = require('request');
var semver  = require('semver');
var util    = require('util');
var yeoman  = require('yeoman-generator');

var WordpressGenerator = yeoman.Base.extend({
  initializing: {
    init: function() {
      this.pkg      = this.fs.readJSON(path.join(__dirname, '../../package.json'));
      this.prompts  = [];

      this.option('dev', {
        desc: 'Dev-mode for localized development of the generator',
        defaults: false,
      });

      this.on('end', function() {
        this.installDependencies({
          bower:        false,
          npm:          true,
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
      var message = this.fs.read(path.join(__dirname, 'welcome.txt'));

      message = message.replace(/./g, function(match) {
        return /\w/.test(match) ? chalk.yellow(match) : chalk.cyan(match);
      });

      this.log.writeln(message);
    },

    checkDeps: function() {
      if(process.env.CI) {
        return true;
      }

      // binaries, args, and callbacks for determining dependencies
      var deps = [
        {bin: 'ansible', args: ['--version'], test: /ansible\s+2[.]/},
        {bin: 'bundler', args: ['--version']},
        {bin: 'npm',     args: ['--version']},
        {bin: 'sshpass', args: ['-V']},
      ];

      var done    = this.async();
      var missing = [];
      var exited  = function(dependency, proc, err) {
        deps.pop();

        // on error, note missing dep
        if (err) {
          missing.push('Could not find ' + dependency.bin);
        }
        // run test, when provided, against stdout/err
        else {
          if (dependency.hasOwnProperty('test')) {
            var output = proc.stdout.read() + proc.stderr.read();
            output = output.replace(/\s+/g, ' ');

            if (!dependency.test.test(output)) {
              missing.push('Insufficient version of ' + dependency.bin + ': ' + output);
            }
          }
        }

        if (!deps.length) {
          if (missing.length) {
            err = new Error('Unsatisfied dependencies');
            this.log.error('Could not satisfy dependencies:' + chalk.red("\n\t- "+missing.join("\n\t- ")) );
          }
          done(err);
        }
      }

      this.log.info('Checking for installed prerequisites...');
      deps.forEach(function (dependency) {
        this.emit('dependencyCheck'+dependency.bin);

        var proc = this.spawnCommand(dependency.bin, dependency.args, {cwd: this.env.cwd, env: process.env, stdio: 'pipe'});
        proc
          .on('error', exited.bind(this, dependency, null))
          .on('exit', this.emit.bind(this, 'dependencyCheck'+dependency.bin+':end'))
          .on('exit', exited.bind(this, dependency, proc))
        ;
      }.bind(this));
    },
  },

  prompting: {
    promptForPrivate: function() {
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
          var contents = this.fs.read(path.join(this.env.cwd, '.gitignore'));

          return contents.match(/lib\/ansible\/files\/ss(?:h|l)/);
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
        var provisionYml = this.fs.read(path.join(this.env.cwd, 'lib', 'ansible', 'provision.yml'));
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
          var match = this.fs.read(path.join(this.env.cwd, 'lib/capistrano/deploy.rb'))
            .match(/set :application,[ ]*["']([^"']+)/);

          return match[1];
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
          var match = this.fs.read(path.join(this.env.cwd, 'Vagrantfile'))
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
          var match = this.fs.read(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
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
          var match = this.fs.read(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
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
          var match = this.rs.read(path.join(this.env.cwd, 'lib', 'ansible', 'group_vars', 'all'))
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
      try {
        var provisionYml = this.fs.read(path.join(this.env.cwd, 'lib', 'ansible', 'provision.yml'));

        WordpressGenerator.roles.forEach(function (role, index) {
          var regex = new RegExp('^\\s*-\\s+' + role.value.split(' ')[0], 'm');

          if (!regex.exec(provisionYml)) {
            WordpressGenerator.roles[index].checked = false;
          }
        });
      } catch(e) {};

      this.prompts.push({
        required: true,
        type:     'checkbox',
        name:     'roles',
        message:  'Optional features',
        choices:  WordpressGenerator.roles,
      });
    },

    promptForWordPress: function() {
      var existing = function() {
        try {
          var file    = this.fs.read(path.join(this.env.cwd, 'web', 'wp', 'wp-includes', 'version.php'));
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
            return existing() || tag || '4.2';
          }
        });

        done();
      }.bind(this));
    },

    promptForTablePrefix: function() {
      var existing = function() {
        try {
          var config = this.fs.read(path.join(this.env.cwd, 'web', 'wp-config.php'));
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
          var config = this.fs.read(path.join(this.env.cwd, 'web', 'wp-config.php'));
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
        var vagrant = this.fs.read('Vagrantfile').match(/ip:\s['"]([\d\.]+)['"]/);

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
  },

  configuring: {
    prepareReadme: function() {
      try {
        this.readmeFile = this.fs.read(path.join(this.env.cwd, 'README.md'));
        this.readmeFile = this.readmeFile
          .replace(/^(?:\[[^\]\r\n]+\]){1,2}(?:\([^\)\r\n]+\))?[\r\n]+=+[\r\n]+> Powered by \[(?:Genesis|Evolution)[^\r\n]+[\r\n]+/i, '')
          .replace(/(?:^|[\r\n])\[[^\]\r\n]+\]:\s*http[^\r\n]+[\r\n]+\[(?:genesis|evolution)-wordpress\]:\s*http[^\r\n]+[\r\n]*$/i, '')
        ;
      } catch(e) {
        this.readmeFile = '';
      }
    },

    prepareHtaccess: function() {
      try {
        this.htaccessFile = this.fs.read(path.join(this.env.cwd, 'web', '.htaccess'));
        this.htaccessFile = this.htaccessFile.replace(/# BEGIN Evolution WordPress(?:.|[\r\n]+)+?# END Evolution WordPress[\r\n]*/i, '').trim();

        this.htaccessWpBlock = !!this.htaccessFile.match(/# BEGIN WordPress(?:.|[\r\n]+)+?# END WordPress[\r\n]*/i);
      } catch(e) {
        this.htaccessFile = '';
        this.htaccessWpBlock = false;
      }
    },

    prepareGitignore: function () {
      try {
        this.gitignoreFile = this.fs.read(path.join(this.env.cwd, '.gitignore'));
        this.gitignoreFile = this.gitignoreFile.match(/[\r\n]+# Generated file, don't edit above this line[\r\n]*([\S\s]*?)[\r\n]*$/i)[1];
      } catch(e) {
        this.gitignoreFile = '';
      }
    },

    prepareRoles: function() {
      this.props.roles = WordpressGenerator.roles.map(function(role) {
        role.checked = !!~this.props.roles.indexOf(role.value);

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

      fs.mkdirsSync(path.dirname(location));

      keygen({
        location: location,
        comment:  'deploy@' + this.props.domain,
        read: false
      }, done);
    },

    prepareTemplates: function() {
      this.templates = glob.sync('**/*', {
        cwd: this.sourceRoot(),
        nodir: true,
      });
    },
  },

  ready: function() {
    this.log.write('\n');
    this.log.info(chalk.green('Here we go!'));
  },

  cleanupBower: function () {
    // remove old bower postinstall
    try {
      var rcfile = path.join(this.env.cwd, '.bowerrc');
      var rcContents = this.fs.readJSON(rcfile);
      if (rcContents.scripts.postinstall == './bower_components/evolution-wordpress/lib/yeoman/bin/postinstall') {
        delete rcContents.scripts.postinstall;
        fs.writeFileSync(rcfile, JSON.stringify(rcContents, null, 2));
      }
    } catch (e) {};

    // remove old bower deps
    try {
      var bowerfile = path.join(this.env.cwd, 'bower.json');
      var bowerContents = this.fs.readJSON(bowerfile);
      var isChanged = false;
      if (bowerContents.dependencies.hasOwnProperty('evolution-wordpress')) {
        delete bowerContents.dependencies['evolution-wordpress'];
        isChanged = true;
      }
      if (bowerContents.dependencies.hasOwnProperty('wordpress')) {
        delete bowerContents.dependencies.wordpress;
        isChanged = true;
      }
      if (isChanged) {
        fs.writeFileSync(bowerfile, JSON.stringify(bowerContents, null, 2));
      }
    } catch (e) {};

    // remove old bower components
    try {
      fs.removeSync(path.join(this.env.cwd, 'bower_components/evolution-wordpress'));
    } catch (e) {};
  },

  symlinkEvolutionWordPress: function() {
    if (!this.options.dev) {
      return false;
    }

    this.log.info(chalk.green('Symlinking local Evolution WordPress as dependency...'));

    var srcpath = path.join(__dirname, '../../../wordpress');
    var dstpath = path.join(this.env.cwd, 'node_modules', 'evolution-wordpress');

    this.log.info(chalk.red(srcpath), '~>', chalk.blue(dstpath));

    fs.mkdirsSync(path.dirname(dstpath));
    fs.ensureSymlinkSync(srcpath, dstpath);
  },

  postInstallWordpress: function () {
    var done = this.async();
    var file = path.join(__dirname, '../../bin/postinstall');

    this
      .spawnCommand('node', [file, this.props.wordpress], {cwd: this.env.cwd, env: process.env})
      .on('error', done)
      .on('exit', done)
    ;
  },

  prepareWpConfig: function() {
    this.wpConfigFile = this.fs.read(path.join(this.env.cwd, 'web', 'wp', 'wp-config-sample.php'));
  },

  writing: function() {
    this.log.info(chalk.green('Scaffolding...'));

    this.templates.forEach(function(file) {
      this.template(file, file.replace(/(^|\/)_/, '$1.'));
    }.bind(this));
  },

  install: {
    generateSslCerts: function() {
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

      fs.mkdirsSync(path.dirname(location));

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

    fixPermissions: function() {
      fs.chmodSync(path.join(this.env.cwd, 'lib', 'ansible', 'files', 'ssh', 'id_rsa'), '600');
    },

    installGems: function() {
      var done      = this.async();
      var installer = 'bundle';

      this.log.info(chalk.green('Installing Gems...'));

      this.emit(installer + 'Install');

      this
        .spawnCommand(installer, ['install'])
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
  },
});

WordpressGenerator.roles = [
  {
    name:     'apache-prefork - Dynamic Apache performance tuning',
    value:    'apache-prefork    # (Optional) Dynamic Apache performance tuning',
    checked:  true,
  },
  {
    name:     'php-hardened   - Security-minded restrictions on PHP userland',
    value:    'php-hardened      # (Optional) Security-minded restrictions on PHP userland',
    checked:  true,
  },
  {
    name:     'varnish        - High-performance reverse-proxy cache',
    value:    'varnish           # (Optional) High-performance reverse-proxy cache',
    checked:  true,
  },
  {
    name:     'mail           - Ability to send e-mails from the server (i.e. PHP)',
    value:    'mail              # (Optional) Ability to send e-mails from the server (i.e. PHP)',
    checked:  true,
  },
  {
    name:     'firewall       - Simple intrusion protection via Fail2ban + iptables',
    value:    'firewall          # (Optional) Simple intrusion protection via Fail2ban + iptables',
    checked:  true,
  },
  {
    name:     'debug          - Tools to monitor processes & debug when on the server',
    value:    'debug             # (Optional) Tools to monitor processes & debug when on the server',
    checked:  true,
  },
  {
    name:     'awstats        - HTTP log analyzer',
    value:    'awstats           # (Optional) HTTP log analyzer',
    checked:  true,
  },
];

WordpressGenerator.latest = function(username, repo, fn) {
  request({
    url: 'https://api.github.com/repos/' + username + '/' + repo + '/git/refs/tags/',
    headers: { 'user-agent': 'https://github.com/request/request' }
  }, function (err, res, body) {
    if(!(/^200/).test(res.headers.status))
      return fn(new Error(res.headers.status));

    try {
      var tags = JSON.parse(body)
        .map(function(item){
          // fake two segment versions (X.Y) as semvers (X.Y.0)
          var tag = item.ref.split('/').pop();
          if (/^\s*[v=]?\d+\.\d+\s*$/.test(tag)) {
            return {raw: tag, sem: tag.trim()+'.0'};
          }
          return {sem: tag};
        })
        // filter out anything that's not a valid semver
        .filter(function (item) {
          return semver.valid(item.sem);
        })
        // sort semvers from high to low
        .sort(function (a, b) {
          return semver.rcompare(a.sem, b.sem);
        });
    } catch (e) {
      return fn(e);
    }

    if (!tags.length) {
      return fn(new Error('Could not find latest matching version'));
    }

    return fn(null, tags[0].hasOwnProperty('raw') ? tags[0].raw : tags[0].sem);
  });
};

module.exports = WordpressGenerator;

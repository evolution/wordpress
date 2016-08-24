# Loads custom tasks from `lib/capistrano/tasks' if you have any defined.
Dir.glob(File.expand_path(File.dirname(__FILE__)) + '/tasks/*.rake').each { |r| import r }

# Infer Git repository from current repo
set :repo_url, proc { `git config --get remote.origin.url`.strip! }

# This is the fastest way to deploy, once the branch is live
set :deploy_via, :remote_cache

# Files will be owned by deploy:www-data
set :group_writable, true

# Keep 1 previous releases, used with deploy:cleanup
set :keep_releases, 1

# Set default user & publickey for deployment
set :user,        "deploy"
set :ssh_options, {
  keys:           %w(./lib/ansible/files/ssh/id_rsa),
  forward_agent:  true,
  auth_methods:   %w(publickey),
}

# Auto-detect DB_* constants from wp-config.php
set :wp_config, Hash[File
  .read('./web/wp-config.php')
  .scan(/DB_(\w+)(?:'|"),[^\'\"]+(?:'|")([^\'\"]*)/)
  .map { |match| [match[0].downcase, match[1]] }
]

# Path for wp-cli on local vagrant
set :local_wp_path,   "/vagrant/web/wp"

# fix permissions before deployment
namespace :deploy do
  before :started, :release_permissions do
    invoke "evolve:permissions"
  end

  after :finished, :release_permissions do
    invoke "evolve:permissions"
  end
end


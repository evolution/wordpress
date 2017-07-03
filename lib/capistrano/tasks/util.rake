namespace :evolve do
  task :launch_browser, :url do |task, args|
    require 'launchy'
    Launchy.open(args[:url]) do |exception|
      puts "Failed to open #{args[:url]} because #{exception}"
    end
  end

  task :calc_wp_path, :is_local do |task, args|
    # short circuit when local wp_path is needed
    if args[:is_local]
      set :working_wp_path, fetch(:local_wp_path)
    else
      # fetch branch and initial wp_path
      branch  = fetch(:branch).to_s
      wp_path = fetch(:wp_path).to_s

      on release_roles(:db) do
        # test wp path exists and correct as necessary
        unless branch == 'master'
          unless test "[ -d #{wp_path} ]"
            wp_path.sub!("/#{branch}/", '/master/')
          end
        end

        raise "WP path '#{wp_path}' does not exist on #{fetch(:stage)}" unless test "[ -d #{wp_path} ]"
      end

      set :working_wp_path, wp_path
    end
    Rake::Task['evolve:calc_wp_path'].reenable
  end

  task :confirm, :message do |task, args|
    # interpret env values of blank, "false", or "0" as falsey
    if ENV.has_key?('evolution_non_interactive')
      do_prompt = !! (ENV['evolution_non_interactive'] =~ /^(false|0)?$/i)
    else
      do_prompt = true
    end

    if do_prompt
      fence = "=" * (args[:message].length + 20)
      warn <<-WARN

      #{fence}

          WARNING: #{args[:message]}

      #{fence}

WARN

      ask :confirmation, "Enter YES to continue"
      if fetch(:confirmation) != 'YES' then
        warn "Aborted!"
        exit
      end

      Rake::Task['evolve:confirm'].reenable
    end
  end

  task :retrieve_groupvars do |task|
    require 'yaml'
    set :group_vars, YAML.load_file('lib/ansible/group_vars/all')
  end

  task :log, :success, :message do |task, args|
    require 'etc'
    require 'socket'
    require 'shellwords'

    logdir   = '/var/log/evolution'
    filename = 'wordpress.log'
    logfile  = logdir + '/' + filename
    status   = args[:success] ? 'Success' : 'Failure'
    stamp    = DateTime.now.strftime('%c')
    user     = Etc.getlogin + '@' + Socket.gethostname

    message  = [ stamp, user, args[:message], status ].join("\t")

    on roles(:web) do |host|
      unless test "[ -f #{logfile} ] && [ $(stat -c %U #{logfile}) == '#{fetch(:user)}' ]"
        execute :sudo, :mkdir, '-p', logdir
        execute :sudo, :chown, '-R', fetch(:user), logdir
        execute :touch, '-a', logfile
      end

      execute :echo, Shellwords.escape(message), '>>', logfile
    end

    Rake::Task['evolve:log'].reenable
  end

  task :prepare_key do
    set :ssh_keyfile, fetch(:ssh_options)[:keys].last

    run_locally do
      execute "chmod 600 #{fetch(:ssh_keyfile)}"
    end
  end
end

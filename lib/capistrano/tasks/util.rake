namespace :evolve do
  task :sync_log do |task|
    begin
      raise "Cannot sync logs down from local!" if fetch(:stage) == 'local'

      log_dir = '/var/log/apache2'
      log_sync_prefix = 'apache2-remote-access.log'
      log_gzip_file = DateTime.now.strftime("#{log_sync_prefix}.%Y-%m-%d.%H%M%S.tar.gz")

      on release_roles(:db) do
        logfiles = capture(:sudo, :bash, '-c', "'cd #{log_dir} && ls -x ./*#{fetch(:domain)}-access.log*'").split
        raise "No matching logs in #{fetch(:stage)}, to sync down" if logfiles.empty?

        execute :sudo, :bash, '-c', "'cd #{log_dir} && tar -czvf /tmp/#{log_gzip_file} #{logfiles.join(' ')}'"
        download! "/tmp/#{log_gzip_file}", "#{log_gzip_file}"
        execute :sudo, :rm, "/tmp/#{log_gzip_file}"
      end

      run_locally do
        execute :mkdir, '-p', "./#{log_sync_prefix}/"
        execute :tar, '-C', "./#{log_sync_prefix}/", '-xvzf', log_gzip_file
        execute :vagrant, :up
        execute :vagrant, :ssh, :local,  "-c 'sudo /usr/share/awstats/tools/logresolvemerge.pl /vagrant/#{log_sync_prefix}/* > /tmp/#{log_sync_prefix}'"
        execute :rm, '-rf', "./#{log_sync_prefix}/"
        execute :rm, log_gzip_file
        execute :vagrant, :ssh, :local, "-c 'sudo /usr/lib/cgi-bin/awstats.pl -config=#{fetch(:domain)} -update'"
        execute :vagrant, :ssh, :local, "-c 'sudo rm /tmp/#{log_sync_prefix}'"
      end

      invoke "evolve:launch_browser", "http://local.#{fetch(:domain)}/awstats/awstats.pl"

      success=true
    ensure
      invoke "evolve:log", success, task.name
    end
  end

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

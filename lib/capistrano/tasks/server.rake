namespace :evolve do
  task :service, :action do |task, args|
    on release_roles(:web) do
      execute :sudo, "service evolution-wordpress #{args[:action]}"
    end
  end

  desc "Stop installed evolution web services"
  task :stop do
    invoke "evolve:service", "stop"
  end

  desc "Start installed evolution web services"
  task :start do
    invoke "evolve:service", "start"
  end

  desc "Restart installed evolution web services"
  task :restart do
    invoke "evolve:service", "restart"
  end

  desc "Reboot provisioned server"
  task :reboot do
    invoke "evolve:service", "reboot"
  end

  desc "Return provisioned evolution version"
  task :version do
    invoke "evolve:service", "version"
  end

  namespace :logs do
    namespace :apache do
      task :tail, :action do |task, args|
        on release_roles(:web) do
          execute :sudo, "tail -f /var/log/apache2/#{fetch(:stage)}.#{fetch(:domain)}-#{args[:action]}.log"
        end
      end

      desc "Tail apache access log"
      task :access do
        invoke "evolve:logs:apache:tail", "access"
      end

      desc "Tail apache error log"
      task :error do
        invoke "evolve:logs:apache:tail", "error"
      end

      desc "Pull remote apache logs for analysis"
      task :sync do |task|
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
    end

    desc "View varnishlog"
    task :varnish do
      on release_roles(:web) do
        execute :sudo, "varnishlog"
      end
    end

    desc "Tail pound syslog"
    task :pound do
      on release_roles(:web) do
        execute :sudo, "tail -f /var/log/syslog | grep --line-buffered 'pound:'"
      end
    end

    desc "Tail evolution log"
    task :evolution do
      on release_roles(:web) do
        execute :sudo, "tail -f /var/log/evolution/wordpress.log"
      end
    end
  end

  desc "Fix remote filesystem permissions"
  task :permissions do
    on release_roles(:web) do
      if test :ls, "#{deploy_to}/releases/*/web"
        # Ensure directories are group-owned by apache & group executable; SGID
        execute :sudo, "find -L #{deploy_to}/releases/*/web -type d -exec chown :www-data {} \\; -exec chmod 775 {} \\; -exec chmod g+s {} \\;"
        # Ensure files are group readable
        execute :sudo, "find -L #{deploy_to}/releases/*/web -type f -exec chmod 664 {} \\;"

        if test :ls, "#{deploy_to}/releases/*/web/wp-content"
          # Ensure wp-content directories are owned by deploy
          execute :sudo, "find -L #{deploy_to}/releases/*/web/wp-content -type d -exec chown deploy {} \\;"
        end
      end
    end
  end

  desc "Remove remote deployments"
  task :teardown do |task|
    begin
      invoke "evolve:confirm", "You are about to permanently remove everything within #{deploy_to}"

      on release_roles(:web) do
        execute :sudo, "rm -rf #{deploy_to}"
      end

      success=true
    ensure
      invoke "evolve:log", success, task.name
    end
  end
end

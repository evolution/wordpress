namespace :evolve do
  namespace :db do
    desc "Create backup of remote DB"
    task :backup, :skip_download do |task, args|
      set :db_backup_file, DateTime.now.strftime("#{fetch(:wp_config)['name']}.%Y-%m-%d.%H%M%S.sql")
      set :db_gzip_file, "#{fetch(:db_backup_file)}.gz"

      on release_roles(:db) do |host|
        backups_path = "#{deploy_to}/backups"
        execute :mkdir, '-p', backups_path

        within backups_path do
          execute :wp, :db, :export, fetch(:db_backup_file), "--opt", "--path=\"#{fetch(:wp_path)}\"", "--url=\"http://#{fetch(:stage)}.#{fetch(:domain)}/\""
          execute :gzip, fetch(:db_backup_file)

          if args[:skip_download]
            backups = capture(:ls, '-x', backups_path).split
            if backups.count >= fetch(:keep_releases)
              info 'Keeping %s of %s database backups on %s' % [ fetch(:keep_releases), backups.count, host.to_s ]
              files = (backups - backups.last(fetch(:keep_releases)))
              if files.any?
                files_str = files.map do |backup|
                  backups_path + '/' + backup
                end.join(' ')
                execute :rm, '-rf', files_str
              else
                info 'No old database backups (keeping newest %s) on %s' % [ fetch(:keep_releases), host.to_s ]
              end
            end
          else
            download! "#{backups_path}/#{fetch(:db_gzip_file)}", fetch(:db_gzip_file)
            execute :rm, fetch(:db_gzip_file)
          end

        end
      end
    end

    task :down do |task|
      begin
        invoke "evolve:db:backup"

        run_locally do
          execute :gzip, "-d", fetch(:db_gzip_file)
          execute :vagrant, :up
          execute :vagrant, :ssh, :local,  "-c 'cd /vagrant && mysql -uroot -D \"#{fetch(:wp_config)['name']}_local\" < #{fetch(:db_backup_file)}'"
          execute :rm, fetch(:db_backup_file)
        end

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end

    task :up do |task|
      begin
        invoke "evolve:confirm", "You are about to destroy & override the \"#{fetch(:stage)}\" database!"
        invoke "evolve:db:backup", true

        run_locally do
          execute :vagrant, :up
          execute :vagrant, :ssh, :local, "-c 'cd /vagrant && mysqldump -uroot --opt \"#{fetch(:wp_config)['name']}_local\" > #{fetch(:db_backup_file)}'"
          execute :gzip, fetch(:db_backup_file)
        end

        on release_roles(:db) do
          upload! fetch(:db_gzip_file), "/tmp/#{fetch(:db_gzip_file)}"
          execute :gzip, "-d", "/tmp/#{fetch(:db_gzip_file)}"

          within fetch(:wp_path) do
            execute :wp, :db, :import, "/tmp/#{fetch(:db_backup_file)}", "--path=\"#{fetch(:wp_path)}\"", "--url=\"http://#{fetch(:stage)}.#{fetch(:domain)}/\""
          end

          execute :rm, "/tmp/#{fetch(:db_backup_file)}"
        end

        run_locally do
          execute :rm, fetch(:db_gzip_file)
        end

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end
  end
end

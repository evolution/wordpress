namespace :evolve do
  namespace :files do
    task :prepare, :path_from, :path_to, :skip_ssh do |task, args|
      ssh_creds = ''
      unless args[:skip_ssh]
        invoke "evolve:prepare_key"
        ssh_creds = "-e \"ssh -i #{fetch(:ssh_keyfile)}\""
      end

      set :rsync_cmd, "rsync #{ssh_creds} -avvru --delete --copy-links --progress #{args[:path_from]}/ #{args[:path_to]}/"
    end

    task :import, :source_stage, :target_stage, :source_path do |task, args|
      source_stage = args[:source_stage].to_s
      target_stage = args[:target_stage].to_s

      # default upload paths (unless overridden via :source_path)
      local_uploads = "#{Dir.pwd}/web/wp-content/uploads"
      remote_uploads = "#{release_path}/web/wp-content/uploads"

      # predefine some common bool checks
      uploads_exist = false
      local_source = source_stage == 'local'
      local_target = target_stage == 'local'

      # determine source and target upload paths, given args and stages
      source_path = args[:source_path] ? args[:source_path] : (local_source ? local_uploads : remote_uploads)
      target_path = local_target ? local_uploads : remote_uploads

      # predefine source path existence check
      uploads_test = "[ -d #{source_path} ]"

      # test uploads locally/remotely
      if (args[:source_path] && local_target) || (!args[:source_path] && local_source)
        run_locally do
          uploads_exist = test uploads_test
        end
      else
        on roles(:web) do |host|
          uploads_exist = test uploads_test
        end
      end

      # without uploads, bail early from this task
      unless uploads_exist
        warn "!! No uploads to rsync from #{source_path}...skipping"
        next
      end

      # without a source path override, wrap non-local path with "user@host:" ssh creds
      unless args[:source_path]
        ssh_host = ''
        on roles(:web) do |host|
          ssh_host = host
        end
        if local_source
          target_path = "#{fetch(:user)}@#{ssh_host}:#{target_path}"
        else
          source_path = "#{fetch(:user)}@#{ssh_host}:#{source_path}"
        end
      end

      # fix remote permissions before sync
      invoke "evolve:permissions" unless local_target

      # derive :skip_ssh from whether :source_path is defined
      invoke "evolve:files:prepare", source_path, target_path, args[:source_path]

      # execute rsync against the appropriate environment (control or remote)
      if (args[:source_path] && local_target) || !args[:source_path]
        run_locally do
          execute fetch(:rsync_cmd)
        end
      else
        on roles(:web) do |host|
          execute fetch(:rsync_cmd)
        end
      end

      # fix again after sync
      invoke "evolve:permissions" unless local_target

    end

    task :down do |task|
      begin
        raise "Cannot sync files down from local!" if fetch(:stage).to_s == 'local'

        invoke "evolve:files:import", fetch(:stage), 'local'

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end

    task :up do |task|
      begin
        raise "Cannot sync files up to local!" if fetch(:stage).to_s == 'local'

        invoke "evolve:confirm", "You are about to overwrite \"#{fetch(:stage)}\" files!"
        invoke "evolve:files:import", 'local', fetch(:stage)

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end
  end
end

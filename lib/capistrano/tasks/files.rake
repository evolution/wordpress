namespace :evolve do
  namespace :files do
    task :prepare, :path_from, :path_to do |task, args|
      invoke "evolve:prepare_key"
      set :rsync_cmd, "rsync -e \"ssh -i #{fetch(:ssh_keyfile)}\" -avvru --delete --copy-links --progress #{args[:path_from]}/ #{args[:path_to]}/"
    end

    task :down do |task|
      begin
        raise "Cannot sync files down from local!" if fetch(:stage) == 'local'

        local_uploads = "#{Dir.pwd}/web/wp-content/uploads"
        remote_uploads = "#{release_path}/web/wp-content/uploads"
        uploads_exist = false

        on roles(:web) do |host|
          uploads_exist = test "[ -d #{remote_uploads} ]"
        end

        if uploads_exist
          on roles(:web) do |host|
            invoke "evolve:files:prepare", "#{fetch(:user)}@#{host}:#{remote_uploads}", local_uploads
            run_locally do
              execute fetch(:rsync_cmd)
            end
          end
        else
          warn "!! No remote uploads to sync...skipping"
        end

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end

    task :up do |task|
      begin
        raise "Cannot sync files up to local!" if fetch(:stage) == 'local'

        invoke "evolve:confirm", "You are about to overwrite \"#{fetch(:stage)}\" files!"

        local_uploads = "#{Dir.pwd}/web/wp-content/uploads"
        remote_uploads = "#{release_path}/web/wp-content/uploads"
        uploads_exist = false

        run_locally do
          uploads_exist = test "[ -d #{local_uploads} ]"
        end

        if uploads_exist
          invoke "evolve:permissions"

          on roles(:web) do |host|
            invoke "evolve:files:prepare", local_uploads, "#{fetch(:user)}@#{host}:#{remote_uploads}"
            run_locally do
              execute fetch(:rsync_cmd)
            end
          end
        else
          warn "!! No local uploads to sync...skipping"
        end

        success=true
      ensure
        invoke "evolve:log", success, task.name
      end
    end
  end
end

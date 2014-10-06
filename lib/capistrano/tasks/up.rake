namespace :evolve do
  desc "Export local DB & files to remote"
  task :up do
    invoke "evolve:db:up"
    invoke "evolve:files:up"
  end

  namespace :up do
    desc "Export local DB to remote"
    task :db do
      invoke "evolve:db:up"
    end
    desc "Uploads local uploads to remote"
    task :files do
      invoke "evolve:files:up"
    end
  end
end

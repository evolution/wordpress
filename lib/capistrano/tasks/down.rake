namespace :evolve do
  desc "Import remote DB & files to local"
  task :down do
    invoke "evolve:db:down"
    invoke "evolve:files:down"
  end

  namespace :down do
    desc "Import remote DB to local"
    task :db do
      invoke "evolve:db:down"
    end
    desc "Download remote uploads to Vagrant"
    task :files do
      invoke "evolve:files:down"
    end
  end
end

namespace :evolve do
  desc "Import remote DB & files to local"
  task :down do
    invoke "evolve:db:down"
    invoke "evolve:files:down"
  end

  namespace :down do
    task :db do
      invoke "evolve:db:down"
    end
    task :files do
      invoke "evolve:files:down"
    end
  end
end

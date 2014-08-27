namespace :evolve do
  desc "Import remote DB & files to local"
  task :down do
    invoke "evolve:db:down"
    invoke "evolve:files:down"
  end
end

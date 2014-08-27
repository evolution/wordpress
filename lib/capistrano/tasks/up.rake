namespace :evolve do
  desc "Export local DB & files to remote"
  task :up do
    invoke "evolve:db:up"
    invoke "evolve:files:up"
  end
end

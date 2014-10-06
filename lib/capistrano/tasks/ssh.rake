namespace :evolve do
  desc "SSH into remote machine"
  task :ssh do |host|
    invoke "evolve:prepare_key"

    on roles(:web) do |host|
      system("ssh #{fetch(:user)}@#{host} -i #{fetch(:ssh_keyfile)}")
    end
  end
end

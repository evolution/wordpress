namespace :evolve do
  task :update, :majority do |task, args|
    invoke "evolve:calc_wp_path", fetch(:stage) == 'local'

    # updater binary
    wp_updater = '/usr/local/bin/wp-update'

    # default to minor updates
    majority = ''
    if args[:majority] == 'major'
      majority = '--major'
    end

    on roles(:web) do |host|
      updater_exists = test "[ -f #{wp_updater} ]"
      raise "Missing wp-update binary! You may need to reprovision this server" unless updater_exists

      execute wp_updater, '--verbose', majority, fetch(:working_wp_path), "http://#{fetch(:stage)}.#{fetch(:domain)}/"
    end
  end
end

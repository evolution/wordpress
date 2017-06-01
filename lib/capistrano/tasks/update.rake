namespace :evolve do
  task :update, :flags do |task, args|
    invoke "evolve:calc_wp_path", fetch(:stage) == 'local'

    # updater binary
    wp_updater = '/usr/local/bin/wp-update'

    # handle supplemental flags
    majority = args[:flags].downcase.include?('major')  ? '--major'        : ''
    plugins  = args[:flags].downcase.include?('plugin') ? '--skip-plugins' : ''
    themes   = args[:flags].downcase.include?('theme')  ? '--skip-themes'  : ''

    on roles(:web) do |host|
      updater_exists = test "[ -f #{wp_updater} ]"
      raise "Missing wp-update binary! You may need to reprovision this server" unless updater_exists

      execute wp_updater, '--verbose', majority, plugins, themes, fetch(:working_wp_path), "http://#{fetch(:stage)}.#{fetch(:domain)}/"
    end
  end
end

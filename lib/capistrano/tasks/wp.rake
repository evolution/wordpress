namespace :wp do
  desc "Execute WP-CLI command remotely"
  rule /^wp\:/ do |task|
    begin
      invoke "evolve:calc_wp_path", fetch(:stage) == 'local'

      on release_roles(:db) do
        within fetch(:working_wp_path) do
          execute "#{task.name.split(":").join(" ")} --path=\"#{fetch(:working_wp_path)}\" --url=\"http://#{fetch(:stage)}.#{fetch(:domain)}/\""
        end
      end

      success=true
    ensure
      invoke "evolve:log", success, task.name
    end
  end
end

namespace :evolve do
  desc "Provisions remote machine via Ansible"
  task :provision do |task|
    begin
      invoke "evolve:prepare_key"
      run_locally do
        def ansible_execute(command)
           puts "Running " + command.yellow + " on " + "localhost".blue
           return system(command)
        end

        ansible_path = Dir.pwd + "/lib/ansible"

        galaxy_reqs = "#{ansible_path}/galaxy.yml"
        if File.exists?(galaxy_reqs)
          unless File.read(galaxy_reqs).strip.empty?
            system("ansible-galaxy install -r #{galaxy_reqs} --force")
          end
        end

        play = "ansible-playbook -e stage=#{fetch(:stage)}"

        success = ansible_execute("#{play} --user=#{fetch(:user)} #{ansible_path}/provision.yml")

        unless success
          error "\n\nUnable to provision with SSH publickey for \"#{fetch(:user)}\" user"

          set :provision_user, ask('user to provision as', 'root')

          ansible_execute("#{play} --user=#{fetch(:provision_user)} --ask-pass --ask-sudo-pass #{ansible_path}/user.yml")
          ansible_execute("#{play} --user=#{fetch(:user)} #{ansible_path}/provision.yml")
        end
      end

      success=true
    ensure
      invoke "evolve:log", success, task.name
    end
  end
end

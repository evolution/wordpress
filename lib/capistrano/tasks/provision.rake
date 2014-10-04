namespace :evolve do
  desc "Provisions remote machine via Ansible"
  task :provision do |task|
    begin
      invoke "evolve:prepare_key"
      run_locally do
        ansible_path = Dir.pwd + "/lib/ansible"
        play = "cd #{ansible_path} && ansible-playbook -e stage=#{fetch(:stage)}"

        success = system("#{play} --user=#{fetch(:user)} provision.yml")

        unless success
          error "\n\nUnable to provision with SSH publickey for \"#{fetch(:user)}\" user"

          set :provision_user, ask('user to provision as', 'root')

          puts "password:"

          system("#{play} --user=#{fetch(:provision_user)} --ask-pass --ask-sudo-pass user.yml")
          system("#{play} --user=#{fetch(:user)} provision.yml")
        end
      end

      success=true
    ensure
      invoke "evolve:log", success, task.name
    end
  end
end

namespace :evolve do
  task :confirm, :message do |task, args|
    # interpret env values of blank, "false", or "0" as falsey
    if ENV.has_key?('evolution_non_interactive')
      do_prompt = !! (ENV['evolution_non_interactive'] =~ /^(false|0)?$/i)
    else
      do_prompt = true
    end

    if do_prompt
      fence = "=" * (args[:message].length + 20)
      warn <<-WARN

      #{fence}

          WARNING: #{args[:message]}

      #{fence}

WARN

      ask :confirmation, "Enter YES to continue"
      if fetch(:confirmation) != 'YES' then
        warn "Aborted!"
        exit
      end

      Rake::Task['evolve:confirm'].reenable
    end
  end

  task :log, :success, :message do |task, args|
    require 'etc'
    require 'socket'
    require 'shellwords'

    logdir   = '/var/log/evolution'
    filename = 'wordpress.log'
    logfile  = logdir + '/' + filename
    status   = args[:success] ? 'Success' : 'Failure'
    stamp    = DateTime.now.strftime('%c')
    user     = Etc.getlogin + '@' + Socket.gethostname

    message  = [ stamp, user, args[:message], status ].join("\t")

    on roles(:web) do |host|
      unless test "[ -f #{logfile} ] && [ $(stat -c %U #{logfile}) == 'deploy' ]"
        execute :sudo, :mkdir, '-p', logdir
        execute :sudo, :chown, '-R', fetch(:user), logdir
        execute :touch, '-a', logfile
      end

      execute :echo, Shellwords.escape(message), '>>', logfile
    end

    Rake::Task['evolve:log'].reenable
  end
end

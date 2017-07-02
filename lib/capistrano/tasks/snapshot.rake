namespace :evolve do
  namespace :snapshot do
    desc "Restore a backup to the remote"
    task :restore do |task|
      # need to retrieve a list of existing backups
      # provide list and let user select one
    end

    desc "Prompt for and simulate a backup schedule"
    task :simulate do |task|
      # for interval and retention periods
      units = ['hour', 'day', 'week', 'month', 'year']

      # load vars from group_vars, or default values
      require 'yaml'
      group_vars = YAML.load_file('lib/ansible/group_vars/all')
      group_vars['snapshots__method'] = 'local' unless group_vars.key?('snapshots__method')
      group_vars['snapshots__credentials'] = '' unless group_vars.key?('snapshots__credentials')
      group_vars['snapshots__container'] = "/home/deploy/backup/production.#{fetch(:domain)}" unless group_vars.key?('snapshots__container')
      group_vars['snapshots__interval'] = '1d' unless group_vars.key?('snapshots__interval')
      group_vars['snapshots__retention'] = {'days'=>1, 'weeks'=>1, 'months'=>1, 'years'=>1} unless group_vars.key?('snapshots__retention')
      group_vars['snapshots__retention_lag'] = true unless group_vars.key?('snapshots__retention_lag')

      # prompt for relevant values
      require 'inquirer'

      # first, prompt for and construct a snapshot interval (value + unit)
      interval_unit = Inquirer.prompt([{
        :name    => :interval_unit,
        :type    => :list,
        :message => 'By what interval of time should we take snapshots?',
        :choices => units.map{ |s| {:name => s+'s', :value => s[0,1]} },
        :default => group_vars['snapshots__interval'].match(/^\d+([hdwmy])$/)[1],
      }])
      interval_unit = interval_unit[:interval_unit]

      full_unit = units.each.detect{ |s| s.start_with?(interval_unit) }
      interval_val = Inquirer.prompt([{
        :name     => :interval_val,
        :type     => :input,
        :message  => "And we'll take a snapshot every how many #{full_unit}s?",
        :default  => group_vars['snapshots__interval'].match(/^(\d+)[hdwmy]$/)[1],
        :validate => lambda { |s| s.match(/^\d+$/) }
      }])
      interval_val = interval_val[:interval_val]

      group_vars['snapshots__interval'] = interval_val.to_s + interval_unit

      # next, prompt for and construct retention periods
      periods = {}
      units.each_with_index do |unit, idx|
        display_unit = unit.end_with?('y') ? unit[0..-2]+'ily' : unit+'ly'
        period_val = Inquirer.prompt([{
          :name => :period_val,
          :type => :input,
          :message => "Retain how many #{display_unit} backups?",
          :default => group_vars['snapshots__retention'].fetch(unit+'s', 0).to_s,
          :validate => lambda { |s| s.match(/^\d+$/) }
        }])
        periods[unit+'s'] = period_val[:period_val]
      end

      group_vars['snapshots__retention'] = periods

      # finally, prompt for retention lag
      lag_val = Inquirer.prompt([{
        :name => :lag_val,
        :type => :confirm,
        :message => "Should backup retention lag one #{full_unit} behind?",
        :default => group_vars['snapshots__retention_lag']
      }])

      group_vars['snapshots__retention_lag'] = lag_val[:lag_val]

      # invoke backup script with --simulate and group_vars matching /^snapshots__/
      require 'json'
      config = Hash[group_vars.select{|key, value| key.match(/^snapshots__/) }.map{|key, val| [key.match(/^snapshots__(.+)$/)[1] , val] } ]
      config['stage'] = fetch(:stage)
      config['domain'] = fetch(:domain)
      config['dbname'] = group_vars['mysql']['name']
      config['releasepath'] = fetch(:deploy_to)

      on roles(:web) do |host|
        execute "/usr/local/bin/snapshot-backup.py", "-vvv", "-s", "-c", "'#{JSON.dump(config)}'"
      end
    end

  end
end

import re
import subprocess
import sys

class ActionClass:
    def __init__(self, evolve):
        extra_vars = {
            'stage': evolve.stage,
            'deploy_mode': 'deploy'
        }

        # use branch from extra_vars, if given
        if evolve.arguments.extra_vars and 'branch' in evolve.arguments.extra_vars:
            extra_vars['branch'] = evolve.arguments.extra_vars['branch']
        # otherwise, for non-prod stages, infer currently checked out branch
        elif evolve.stage != 'production':
            result = evolve.bg_call(['git', 'branch'])
            matched = re.search(r'^[*] (\S+)\s', result['stdout'], re.M)
            if matched and matched.group(1) != 'master':
                extra_vars['branch'] = matched.group(1)

        # infer git remote from currently checked out repo
        git_remote = evolve.bg_call(['git', 'config', '--get', 'remote.origin.url'])
        extra_vars['git_remote'] = git_remote['stdout'].strip(),

        # kick off ansistrano
        evolve.playbook('deploy.yml', extra_vars, ['--user=deploy', '--limit=%s' % evolve.stage])

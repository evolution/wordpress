import re
import subprocess
import sys

class ActionClass:
    def __init__(self, evolve):
        extra_vars = evolve.get_extra_vars()
        extra_vars['deploy_mode'] = 'deploy'

        # infer git remote from currently checked out repo
        git_remote = evolve.bg_call(['git', 'config', '--get', 'remote.origin.url'])
        extra_vars['git_remote'] = git_remote['stdout'].strip(),

        # kick off ansistrano
        evolve.playbook('deploy.yml', extra_vars, ['--user=deploy', '--limit=%s' % evolve.stage])

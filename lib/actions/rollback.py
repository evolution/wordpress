import re
import subprocess
import sys

class ActionClass:
    def __init__(self, evolve):
        extra_vars = evolve.get_extra_vars()
        extra_vars['deploy_mode'] = 'rollback'

        # kick off ansistrano
        evolve.playbook('deploy.yml', extra_vars, ['--user=deploy', '--limit=%s' % evolve.stage])

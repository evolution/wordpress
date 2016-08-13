import re
import subprocess

class ActionClass:
    def __init__(self, evolve):
        # TODO: implement `invoke "evolve:prepare_key"`

        extra_vars = {
            'stage': evolve.stage
        }

        try:
            evolve.playbook('provision.yml', extra_vars, '--user=deploy')
        except subprocess.CalledProcessError as err:
            # only prompt for user reprovisioning if host failed or unreachable
            if any(x in err for x in ['returned non-zero exit status 3', 'returned non-zero exit status 2']):
                evolve.announce('Unable to provision with SSH publickey for deploy user')

                # connect as intermediate user, and set up deploy user
                username = evolve.single_input('user to provision as (root)', lambda u: not u or re.match(r"^[a-z_][a-z0-9_-]*[$]?", u, re.I)) or 'root'
                evolve.playbook('user.yml', extra_vars, ['--user=%s' % username, '--ask-pass', '--ask-sudo-pass'])

                # provision as usual
                evolve.playbook('provision.yml', extra_vars, '--user=deploy')
            else:
                raise err

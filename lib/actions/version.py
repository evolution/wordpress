import json
import os
import os.path

class ActionClass:
    def __init__(self, evolve):
        extra_vars = evolve.get_extra_vars()

        # inject generated version (from group vars)
        extra_vars['generated_version'] = evolve.group_vars['evolve_version']

        # inject installed version (from bower_components)
        with open(os.path.join(evolve.working_path, 'bower_components/evolution-wordpress/package.json'), 'r') as package_json:
            extra_vars['local_version'] = json.load(package_json)['version']

        # call playbook to gather and display all three versions
        evolve.playbook('version.yml', extra_vars=extra_vars)

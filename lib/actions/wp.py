
class ActionClass:
    def __init__(self, evolve):
        extra_vars = evolve.get_extra_vars()

        if not evolve.command:
            raise RuntimeError('wp action requires a command string');

        ssh_module = evolve.import_action('ssh')

        evolve.command = ' '.join([
            '/usr/local/bin/wp',
            evolve.command,
            '--path="%s"' % evolve.group_vars['wp_path'],
            '--url="http://%s.%s/"' % (extra_vars['stage'], evolve.group_vars['domain']),
            '--color',
        ])

        evolve.init_action(ssh_module)

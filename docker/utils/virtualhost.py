#!/usr/bin/env python

from jinja2 import Template
from os import path

input_filename = path.join(path.dirname(__file__), '../../lib/ansible/roles/apache/templates/virtualhost')
with open(input_filename, 'r') as input_file:
    input_contents=input_file.read()

template = Template(input_contents)
output = template.render({
  'domain': 'WORDPRESS_DOMAIN',
  'apache_version': {'stdout':'2.4'},
  'item': {'key_0': 'local', 'key_1': 0, 'value': 'local'}
})

output_filename = path.join(path.dirname(__file__), '../virtualhost.conf')
with open(output_filename, 'w') as output_file:
    output_file.write(output)

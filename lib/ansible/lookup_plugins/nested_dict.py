# add current dir to import path
import sys
import os
sys.path.append(os.path.dirname(__file__))

# import the right plugin for the right ansible major version
from ansible import __version__ as ansible_version
if ansible_version.startswith('2.'):
    from ansible2_nested_dict import LookupModule
elif ansible_version.startswith('1.'):
    from ansible1_nested_dict import LookupModule

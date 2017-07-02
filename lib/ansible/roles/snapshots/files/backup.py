#!/usr/bin/env python

from __future__ import print_function
from argparse import ArgumentParser
from calendar import SUNDAY
from datetime import datetime, timedelta
from grandfatherson import to_delete
from libcloud.storage.types import Provider
from libcloud.storage.providers import get_driver
from pprint import pprint, pformat
from tabulate import tabulate
from tempfile import mkdtemp

import json
import os
import pipes
import re
import shutil
import subprocess
import sys

class BackupManager:
    # static properties
    TIME_UNITS = {'h':'hours', 'd':'days', 'w':'weeks', 'm':'months', 'y':'years'}
    date_format = '%Y-%m-%d_%H-%M-%S.%f'
    backup_format = 'tgz'
    backup_mode = 0700

    def __init__(self):
        # command line interface
        raw_args = list(sys.argv)

        parser = ArgumentParser(prog='backup')
        parser.add_argument('-v','--verbose', action='count', help='increase verbosity')
        parser.add_argument('-q','--quiet', action='store_true', help='limit output to warnings/errors (ignores verbose)')
        parser.add_argument('-s','--simulate', action='store_true', help='simulate backup creation and retention for the past year')
        parser.add_argument('-c','--config', action='append', help='provide key=value pairs or JSON document', required=True)
        self.arguments = parser.parse_args()

        if self.arguments.quiet:
            self.arguments.verbose = 0

        self.announce_verbose('Raw args:', raw_args)
        self.announce_verbose('Parsed args:', self.arguments)

        # build config from json and/or key=val pairs
        self.config = {}
        for pair in self.arguments.config:
            matched = re.match(r'^([\w-]+)=(.+)$', pair)
            if matched:
                self.config[matched.group(1)] = matched.group(2)
            else:
                try:
                    parsed = json.loads(pair)
                except ValueError as err:
                    raise ValueError('%s: %s' % (err, pair))
                parsed = {k: v for k, v in parsed.items() if v != ''}
                self.config.update(parsed)

        # show parsed config
        self.announce_verbose('Starting config:', self.config)

        # absolutely required config values
        for key in ['stage', 'domain', 'dbname', 'releasepath']:
            if key not in self.config:
                raise RuntimeError('Missing %s' % key)

        # misc parameters
        self.slug = '%s.%s' % (self.config['stage'], self.config['domain'])
        self.backup_pattern = r'^%s-([\d_.-]+)[.]%s$' % (re.escape(self.slug), re.escape(self.backup_format))

        # default to local filesystem backups
        if not 'method' in self.config:
            self.config['method'] = 'local'

        # verify given method
        if self.config['method'].lower() != 'local' and not hasattr(Provider, self.config['method'].upper()):
            raise RuntimeError('Unknown storage method %s' % self.config['method'])

        # no credentials to be defaulted
        if not 'credentials' in self.config:
            self.config['credentials'] = None

        # init storage driver with credentials
        if not self.arguments.simulate and self.config['method'].lower() != 'local':
            storage_driver = get_driver(getattr(Provider, self.config['method'].upper()))
            if isinstance(self.config['credentials'], (dict)):
                self.driver = storage_driver(**self.config['credentials'])
            elif  isinstance(self.config['credentials'], (list, tuple)):
                self.driver = storage_driver(*self.config['credentials'])
            else:
                raise RuntimeError('Unknown credentials: %s' % pformat(self.config['credentials']))

        # default a container name or filesystem path
        if not 'container' in self.config:
            if self.config['method'].lower() != 'local':
                self.config['container'] = self.slug
            else:
                self.config['container'] = '/home/deploy/backup/%s' % self.slug

        # create or retrieve container (or recursively create directory for local)
        if not self.arguments.simulate:
            if self.config['method'].lower() != 'local':
                # create container, as necessary
                available_containers = self.driver.list_containers()
                container_exists = False
                for container in available_containers:
                    if container.name == self.config['container']:
                        container_exists = True
                        break

                if container_exists == False:
                    self.container = self.driver.create_container(container_name)
                else:
                    self.container = self.driver.get_container(container_name)
            else:
                if not os.path.exists(self.config['container']):
                    os.makedirs(self.config['container'], self.backup_mode)

        # a sane interval to make backups
        if not 'interval' in self.config:
            self.config['interval'] = '1d'

        # inventory existing backups (if any), where key is timestamp and value is libcloud object / local filename
        backups_by_timestamp = {}
        backup_now = False

        if not self.arguments.simulate:
            if self.config['method'].lower() != 'local':
                for backup in self.driver.list_container_objects(self.container):
                    matched = re.match(self.backup_pattern, backup.name)
                    if matched:
                        backups_by_timestamp[matched.group(1)] = backup
            else:
                for backup in os.listdir(self.config['container']):
                    matched = re.match(self.backup_pattern, backup)
                    if matched:
                        backups_by_timestamp[matched.group(1)] = backup

            # based on backup interval and last backup made, determine whether a new backup is needed
            # if no backups currently exist, then make one right this damn second
            if not backups_by_timestamp:
                backup_now = True
            else:
                backup_timestamps = backups_by_timestamp.keys()
                backup_timestamps.sort()
                latest_backup = datetime.strptime(backup_timestamps[-1], self.date_format)
                next_backup = datetime.now() - timedelta(**self.interval_to_units(self.config['interval']))

                if next_backup > latest_backup:
                    backup_now = True

            # do the actual backing up...and subsequently upload newly created backup
            if backup_now:
                self.make_backup(backups_by_timestamp)
            else:
                self.announce('Skipping backup...')

        # minimal levels of retention
        if not 'retention' in self.config:
            self.config['retention'] = dict(hours=0, days=1, weeks=1, months=1, years=1)
        else:
            self.config['retention'] = self.validate_retention(self.config['retention'])

        # default retention lag, as necessary
        if not 'retention_lag' in self.config:
            self.config['retention_lag'] = True

        # apply retention rules to list of backups
        if not self.arguments.simulate:
            # ...only if we've made a new backup
            if backup_now:
                self.apply_retention(backups_by_timestamp)
        else:
            self.simulate()

    def make_backup(self, backups_by_timestamp):
        '''
        Create a new backup, and add it to the given dict
        '''
        # make tempdir in which to roll the backup
        working_dir = mkdtemp(prefix='evolution_backup')
        os.mkdir('%s/tarball' % working_dir)

        # dump database to sql file
        verbosity = '--verbose' if self.arguments.verbose > 1 else None
        self.call(['mysqldump', '--opt', verbosity, '--user=root', '--databases', '%s_%s' % (self.config['dbname'], self.config['stage']), '--result-file', '%s/tarball/db.sql' % working_dir])

        # rsync uploads to subdir
        uploads_src = '%s/current/web/wp-content/uploads' % self.config['releasepath']
        uploads_dest = '%s/tarball/uploads' % working_dir
        os.mkdir(uploads_dest)
        verbosity = '-q' if self.arguments.quiet else ('-v' if self.arguments.verbose > 1 else None)
        self.call(['rsync', '-a', verbosity, '%s/' % uploads_src, uploads_dest])

        # tar + gzip backup
        timestamp = datetime.now().strftime(self.date_format)
        backup_name = '%s-%s.%s' % (self.slug, timestamp, self.backup_format)
        backup_path = '%s/%s' % (working_dir, backup_name)
        verbosity = '-cvzf' if self.arguments.verbose > 1 else '-czf'
        self.call(['tar', verbosity, backup_path, '-C', '%s/tarball' % working_dir, '.'])

        # move backup to destination (local or cloud)
        if self.config['method'].lower() != 'local':
            self.driver.upload_object(backup_path, self.container, backup_name)
        else:
            shutil.move(backup_path, '%s/%s' % (self.config['container'], backup_name))
            os.chmod('%s/%s' % (self.config['container'], backup_name), self.backup_mode)

        # add backup to dict and clean up after ourselves (tmp files)
        backups_by_timestamp[timestamp] = backup_name
        shutil.rmtree(working_dir)

    def apply_retention(self, backups_by_timestamp):
        '''
        Prune backups from the given dict, according to our retention policy
        '''
        # determine the "now" for retention...
        relative_now = datetime.now()
        if self.config['retention_lag']:
            relative_now = relative_now - timedelta(**self.interval_to_units(self.config['interval']))

        # convert our string timestamps into datetime objs, before providing them to grandfatherson
        backup_datetimes = [datetime.strptime(timestamp, self.date_format) for timestamp in backups_by_timestamp.keys()]
        datetimes_to_delete = to_delete(backup_datetimes, firstweekday=SUNDAY, now=relative_now, **self.config['retention'])
        del backup_datetimes[:]

        # convert returned datetime objects back into string timestamps
        timestamps_to_delete = [dt_object.strftime(self.date_format) for dt_object in datetimes_to_delete]
        datetimes_to_delete.clear()

        # remove backups by timestamp
        for timestamp in timestamps_to_delete:
            self.announce('Removing backup %s' % timestamp)
            if self.config['method'].lower() != 'local':
                self.driver.delete_object(backups_by_timestamp[timestamp])
            else:
                os.remove('%s/%s' % (self.config['container'], backups_by_timestamp[timestamp]))

    def validate_retention(self, retention):
        '''
        Ensure we have a usable retention policy
        '''
        if not retention or not any(retention.values()):
            raise RuntimeError('Expected retention periods. Found none')

        for key in retention.keys():
            if retention[key] is None:
                retention[key] = 0
            else:
                retention[key] = int(retention[key])

        return retention

    def announce(self, message):
        '''
        Prints a announcement to the terminal (unless quiet mode)
        '''
        if not self.arguments.quiet:
            print("\n! %s" % message)

    def announce_verbose(self, label, *args):
        '''
        Prints an announcement to the terminal, only if very verbose mode
        '''
        if self.arguments.verbose > 1:
            print(label, *args)

    def call(self, *args):
        '''
        Prints and runs a command, or piped series of commands, inheriting standard input/output and returning after completion.
        Throws subprocess.CalledProcessError if returncode was nonzero.
        Calls bg_call instead, if quiet mode.
        '''
        if self.arguments.quiet:
            return self.bg_call(*args)

        command = self._normalize_commands(args)
        print("$ %s\n" % command)
        return subprocess.check_call(command, shell=True)

    def bg_call(self, *args):
        '''
        Runs a command, or piped series of commands, ignoring standard input/output and returning a returncode after completion.
        '''
        command = self._normalize_commands(args)
        self.announce_verbose('Background process:', "$ %s" % command)

        proc = subprocess.Popen(command, shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        output = proc.communicate()

        result = { 'stdout': output[0], 'returncode': proc.returncode }
        self.announce_verbose('Background result:', result)

        return result

    def _normalize_commands(self, args):
        '''
        Normalizes and escapes one or more commands (as lists), piping each into the command following it.
        '''
        groups = []

        for command in args:
            # remove any None args
            command = filter(lambda a: a != None, command)
            # quote each arg for shell metacharacters
            command = map(pipes.quote, command)
            # flatten args to string command
            groups.append(' '.join(command))

        # flatten commands to pipe chain
        return ' | '.join(groups)

    def simulate(self):
        '''
        Simulate when backups would be created, retained, and deleted from one year in the past to now
        '''
        units = self.interval_to_units(self.config['interval'])
        self.announce('Simulating a backup every %s %s' % (units[units.keys()[0]], units.keys()[0]))

        self.announce('Retention policy:')
        for unit in ['hours', 'days', 'weeks', 'months', 'years']:
            if unit in self.config['retention'] and self.config['retention'][unit]:
                self.announce('\t%s %s' % (self.config['retention'][unit], unit))

        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)

        created = dict()
        deleted = dict()
        existing = dict()
        filename = dict()

        for current_date in self.perdelta(start_date, end_date, self.config['interval']):
            # simulate backup creation
            current_date_key = str(current_date)
            created[current_date_key] = current_date
            existing[current_date_key] = current_date
            filename[current_date_key] = '%s-%s.%s' % (self.slug, current_date.strftime(self.date_format), self.backup_format)

            # simulate backup deletions
            relative_now = current_date
            if self.config['retention_lag']:
                relative_now = relative_now - timedelta(**units)
            for datestamp in to_delete(existing.values(), now=relative_now, firstweekday=SUNDAY, **self.config['retention']):
                datestamp_key = str(datestamp)
                if existing.has_key(datestamp_key):
                    del existing[datestamp_key]
                    deleted[datestamp_key] = current_date

        tabulated_results = list()

        for date_key in sorted(created.keys()):
            new_row = list()

            new_row.append(created[date_key])
            new_row.append(deleted[date_key] if deleted.has_key(date_key) else None)
            new_row.append((deleted[date_key] if deleted.has_key(date_key) else end_date) - created[date_key])
            new_row.append(filename[date_key])

            tabulated_results.append(new_row)

        self.announce(tabulate(tabulated_results, headers=["created on", "deleted on", "retained for", "filename"]))

    def perdelta(self, start_date, end_date, delta):
        '''
        Given start and end dates, adnd a timedelta, generate every date between them by the delta's interval
        '''
        if not isinstance(delta, timedelta):
            delta = timedelta(**self.interval_to_units(delta))
        curr = start_date
        while curr < end_date:
            yield curr
            curr += delta

    def interval_to_units(self, interval):
        """
        Given an interval string (ex "8h"), converts to a dict of unit and quantity (ex {"hours":8})
        """
        quantity = int(interval[:-1])
        unit = interval[-1]
        return { self.TIME_UNITS[unit] : quantity }

if __name__ == "__main__":
    BackupManager()

#!/bin/bash

set -eo pipefail

# require a domain
if [ -z "$WORDPRESS_DOMAIN" ]; then
  echo >&2 'error: missing WORDPRESS_DOMAIN environment variable'
  exit 1
else
  # tweak some domain-reliant apache configs
  echo -e "UseCanonicalName On\nServerName $WORDPRESS_DOMAIN\n" > /etc/apache2/conf-enabled/canonical-servername.conf
  sed -i 's/WORDPRESS_DOMAIN/'"$WORDPRESS_DOMAIN"'/g' /etc/apache2/sites-available/000-default.conf
fi

WEB_ROOT="/vagrant/web"
if [ ! -d "$WEB_ROOT" ]; then
  echo >&2 'error: missing web root at '"$WEB_ROOT"
  echo >&2 '  Did you forget to mount your site like: --volume Example.com/:/vagrant/'
  exit 1
fi

SQL_IMPORT="/vagrant/docker.sql"
if [ ! -f "$SQL_IMPORT" ]; then
  echo >&2 'error: missing db dump at '"$SQL_IMPORT"
  echo >&2 '  Did you forget to include your sql file?'
  exit 1
fi

exec /usr/sbin/apache2ctl -D FOREGROUND

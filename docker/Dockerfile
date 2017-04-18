FROM ubuntu:14.04

MAINTAINER Evan Kaufman (evan@digitalflophouse.com)

EXPOSE 80

# Update apt cache
RUN apt-get update

# Install necessary apache + php deps
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl \
    apache2 \
    libapache2-mod-php5 \
    php-pear \
    php5 \
    php5-cli \
    php5-common \
    php5-curl \
    php5-gd \
    php5-mcrypt \
    php5-mysql \
    mysql-client

# Enable/disable apache mods
RUN a2enmod expires && \
    a2enmod headers && \
    a2enmod rewrite && \
    a2enmod deflate && \
    a2enmod setenvif && \
    a2enmod filter && \
    a2enmod mime && \
    a2dismod autoindex

# Disable php error control operator
RUN pecl install scream-0.1.0 && \
    echo "extension=scream.so" > /etc/php5/mods-available/scream.ini

# Update php ini settings
RUN sed -i 's|^;\(date\.timezone =\)\s*|\1 "America/Chicago"|' /etc/php5/apache2/php.ini
RUN sed -i 's|^\(memory_limit =\)[ 0-9A-Z]*|\1 -1|' /etc/php5/apache2/php.ini
RUN sed -i 's|^\(upload_max_filesize =\)[ 0-9A-Z]*|\1 16M|' /etc/php5/apache2/php.ini

# Install wp-cli
RUN curl -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
RUN chmod 0755 /usr/local/bin/wp

# Copy virtualhost into place
COPY virtualhost.conf /etc/apache2/sites-available/000-default.conf

# Copy entrypoint script into place, and ensure executable
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod 0755 /entrypoint.sh

# Working directory and mount volume
WORKDIR /vagrant
VOLUME /vagrant

ENTRYPOINT ["/entrypoint.sh"]

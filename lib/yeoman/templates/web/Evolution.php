<?php

class Evolution
{
    const DOMAIN = '<%= props.domain %>';

    public static function getDbName($name)
    {
        return sprintf('%s_%s', $name, static::getEnv());
    }

    public static function getHostname()
    {
        $env = self::getEnv();

        if (in_array($env, array('local', 'staging'))) {
            return $env.'.'.self::DOMAIN;
        }
        else {
            return self::DOMAIN;
        }
    }

    public static function getEnv()
    {
        preg_match('/(?:(local|staging|production)\.)?'.preg_quote(self::DOMAIN).'$/', $_SERVER['SERVER_NAME'], $matches);

        $match = count($matches) > 1 ? array_pop($matches) : 'production';
        $known = array('local', 'staging', 'production');

        return in_array($match, $known) ? $match : 'production';
    }

    public static function initEnv()
    {
        // Set environment to the last sub-domain (e.g. foo.staging.site.com => 'staging')
        if (!defined('WP_ENV')) {
            define('WP_ENV', Evolution::getEnv());
        }

        return WP_ENV;
    }

}

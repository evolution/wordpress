<?php

class Evolution
{
    const DOMAIN = '<%= props.domain %>';

    public static $hostname;
    public static $env;

    public static function getDbName($name)
    {
        return sprintf('%s_%s', $name, static::getEnv());
    }

    public static function getHostname()
    {
        if (isset(self::$hostname)) {
            return self::$hostname;
        }

        $env = self::getEnv();

        if (in_array($env, array('local', 'staging'))) {
            self::$hostname = $env.'.'.self::DOMAIN;
        }
        else {
            $content = file_get_contents(dirname(__FILE__).'/lib/ansible/group_vars/all');

            if (preg_match('/www[ ]*:[ ]*(true)/', $content)) {
                self::$hostname = 'www.'.self::DOMAIN;
            }
            else {
                self::$hostname = self::DOMAIN;
            }
        }

        return self::$hostname;
    }

    public static function getEnv()
    {
        if (isset(self::$env)) {
            return self::$env;
        }

        preg_match('/(?:(local|staging|production)\.)?'.preg_quote(self::DOMAIN).'$/', $_SERVER['SERVER_NAME'], $matches);

        $match = count($matches) > 1 ? array_pop($matches) : 'production';
        $known = array('local', 'staging', 'production');

        self::$env = in_array($match, $known) ? $match : 'production';

        return self::$env;
    }

    public static function initEnv()
    {
        // Set environment to the last sub-domain (e.g. foo.staging.site.com => 'staging')
        if (!defined('WP_ENV')) {
            define('WP_ENV', Evolution::getEnv());
        }

        return WP_ENV;
    }

    public static function rewriteUrls()
    {
        if (!function_exists('is_blog_installed') || !is_blog_installed()) {
            return false;
        }

        $old_url = '://' . self::getHostname();
        $new_url = '://' . htmlspecialchars($_SERVER['HTTP_HOST']);

        if ($old_url === $new_url) {
            return false;
        }

        // Remove domain from uploads
        update_option('upload_path', null);

        // Ensure internal WordPress functions map correctly to new url (but don't want to persist in the DB)
        add_filter('option_home',             function($value) use ($old_url, $new_url) { return str_replace($old_url, $new_url, $value); });
        add_filter('option_siteurl',          function($value) use ($old_url, $new_url) { return str_replace($old_url, $new_url, $value); });
        add_filter('option_upload_path',      function($value) use ($old_url, $new_url) { return str_replace($old_url, $new_url, $value); });
        add_filter('option_upload_url_path',  function($value) use ($old_url, $new_url) { return str_replace($old_url, $new_url, $value); });
        add_filter('wp_get_attachment_url',   function($value) use ($old_url, $new_url) { return str_replace($old_url, $new_url, $value); });

        // Override URLs in output with local environment URL
        ob_start( function( $output ) use ( $old_url, $new_url ) {
            return str_replace( $old_url, $new_url, $output );
        } );

        register_shutdown_function( function() use ( $old_url, $new_url ) {
            @ob_end_flush();
        } );
    }

}

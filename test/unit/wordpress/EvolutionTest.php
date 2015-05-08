<?php

if (!defined('EVOLUTION_WWW_MODE')) {
    $content = file_get_contents(dirname(__FILE__).'/../../../temp/lib/ansible/group_vars/all');
    define('EVOLUTION_WWW_MODE', preg_match('/www[ ]*:[ ]*(true)/', $content) ? 'www.' : '');
}

class EvolutionTest extends PHPUnit_Framework_TestCase
{
    public function testGetDbName()
    {
        $_SERVER['SERVER_NAME'] = 'local.'.Evolution::DOMAIN;

        $this->assertEquals('test_local', Evolution::getDbName('test'));
    }

    /**
     * @dataProvider serverNameProvider
     */
    public function testGetEnv($servername, $env, $hostname)
    {
        $_SERVER['SERVER_NAME'] = $servername;

        $this->assertEquals($env, Evolution::getEnv());
    }

    /**
     * @dataProvider serverNameProvider
     */
    public function testInitEnv($servername, $env, $hostname)
    {
        $_SERVER['SERVER_NAME'] = $servername;

        Evolution::initEnv();

        $this->assertTrue(defined('WP_ENV'), '`Evolution::initEnv()` should define `WP_ENV`');
        $this->assertEquals($env, WP_ENV);
    }

    /**
     * @dataProvider serverNameProvider
     */
    public function testGetHostname($servername, $env, $hostname)
    {
        $_SERVER['SERVER_NAME'] = $servername;

        $this->assertEquals($hostname, Evolution::getHostname());
    }

    public function serverNameProvider()
    {
        return array(
            array(Evolution::DOMAIN,                'production',  EVOLUTION_WWW_MODE . Evolution::DOMAIN),
            array('www.'.Evolution::DOMAIN,         'production',  EVOLUTION_WWW_MODE . Evolution::DOMAIN),
            array('local.'.Evolution::DOMAIN,       'local',       'local.'.Evolution::DOMAIN),
            array('staging.'.Evolution::DOMAIN,     'staging',     'staging.'.Evolution::DOMAIN),
            array('production.'.Evolution::DOMAIN,  'production',  EVOLUTION_WWW_MODE . Evolution::DOMAIN),
            array('local.thewrongdomain.com',       'production',  EVOLUTION_WWW_MODE . Evolution::DOMAIN)
        );
    }
}

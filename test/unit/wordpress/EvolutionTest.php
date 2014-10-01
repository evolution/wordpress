<?php

class EvolutionTest extends PHPUnit_Framework_TestCase
{
    public function testGetDbName()
    {
        $_SERVER['HTTP_HOST'] = 'local.example.com';

        $this->assertEquals('test_local', Evolution::getDbName('test'));
    }

    /**
     * @dataProvider httpHostProvider
     */
    public function testGetEnv($host, $expected)
    {
        $_SERVER['HTTP_HOST'] = $host;

        $this->assertEquals($expected, Evolution::getEnv());
    }

    /**
     * @dataProvider httpHostProvider
     */
    public function testInitEnv($host, $expected)
    {
        $_SERVER['HTTP_HOST'] = $host;

        Evolution::initEnv();

        $this->assertTrue(defined('WP_ENV'), '`Evolution::initEnv()` should define `WP_ENV`');
        $this->assertEquals($expected, WP_ENV);
    }

    public function httpHostProvider()
    {
        return array(
            array('example.com',              'production'),
            array('example.net',              'production'),
            array('example.org',              'production'),
            array('example.co.uk',            'production'),
            array('www.example.com',          'production'),
            array('www.example.org',          'production'),
            array('www.example.net',          'production'),
            array('www.example.co.uk',        'production'),
            array('local.example.com',        'local'),
            array('local.example.net',        'local'),
            array('local.example.org',        'local'),
            array('local.example.co.uk',      'local'),
            array('staging.example.com',      'staging'),
            array('staging.example.net',      'staging'),
            array('staging.example.org',      'staging'),
            array('staging.example.co.uk',    'staging'),
            array('production.example.com',   'production'),
            array('production.example.net',   'production'),
            array('production.example.org',   'production'),
            array('production.example.co.uk', 'production'),
        );
    }
}

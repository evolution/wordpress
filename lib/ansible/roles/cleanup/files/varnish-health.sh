#!/usr/bin/env bash

# expect a required positional argument
STAGE_DOMAIN="$1"

# display usage, if necessary
if [ -z "$STAGE_DOMAIN" ]; then
    echo "
Usage: $0 <domain>

Arguments:
 domain    Stage and domain at which varnish should be checked, eg 'production.example.com'
"
    exit 1
fi

# generate verbose output? (for debugging)
VERBOSE=

# minimum amount of seconds between service kicks
KICK_THRESHOLD=300

# current timestamp
NOW=$(date +%s)

STAMP_FILE="/tmp/varnish-check.${STAGE_DOMAIN}"

function vprint {
    if [ -n "$VERBOSE" ]; then
        echo $@
    fi
}

function health_check {
    local http_status=$(/usr/bin/curl -Is -m 1 --max-redirs 0 -w %{http_code} "http://${STAGE_DOMAIN}/varnish-status" -o /dev/null)
    vprint "Health check returned $http_status"
    [ "$http_status" != "200" ]
}

function health_kick {
    vprint "Kicking varnish"
    sudo service varnish restart > /dev/null 2>&1

    if health_check; then
        vprint "Kick unsuccessful, writing a timestamp"
        echo -n "$NOW" > "$STAMP_FILE"
    else
        rm -f "$STAMP_FILE"
    fi
}

function time_diff {
    if [ -e "$STAMP_FILE" ]; then
        local threshold=$1

        vprint "Previous timestamp exists..."

        LAST_RESTART=$(cat "$STAMP_FILE")
        TIME_DIFF=$(echo "$NOW - $LAST_RESTART" | bc)

        vprint "$TIME_DIFF seconds since last unsuccessful health kick"

        if [ "$TIME_DIFF" -ge "$threshold" ]; then
            vprint "Past threshold of $threshold"
            return 0
        else
            return 1
        fi
    else
        return 0
    fi
}

# if health check fails...
if health_check; then
    # kick service if longer than $threshold since last restart...
    if time_diff $KICK_THRESHOLD; then
        health_kick
    fi
fi

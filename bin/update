#!/usr/bin/env bash

# ansi colors if we're in a terminal
if [ -t 1 ]; then
    RED="\e[31m\e[1m"
    GREEN="\e[32m\e[1m"
    YELLOW="\e[33m\e[1m"
    BLUE="\e[34m\e[1m"
    RESET="\e[0m"
else
    export {RED,GREEN,YELLOW,BLUE,RESET}=""
fi

# alias full path to wp-cli executable
PATH="/usr/local/bin:$PATH"

# print nothing when verbosity is off
function vecho {
    if [ -n "$VERBOSITY" ]; then
        echo -e "$@"
    fi
}

# redirect command's stdout (but not stderr) when verbosity is off
function vexec {
    if [ -n "$VERBOSITY" ]; then
        echo -e "${BLUE}\$ $@${RESET}"
        "$@"
    else
        "$@" > /dev/null
    fi
}

# define defaults
HELP=""
MAJORITY="--minor"
VERBOSITY=""
WP_URL=""
WP_PATH=""

# parse optstrings
OPTS=$(getopt -o hmv -l help,major,verbose -n '$0' -- "$@")
if [ $? != 0 ] ; then echo "Failed parsing options." >&2 ; exit 1 ; fi

eval set -- "$OPTS"

# interpret optstrings
while true ; do
    case "$1" in
        -h | --help )    HELP="1" ; shift ;;
        -m |--major )    MAJORITY="--major" ; shift ;;
        -v | --verbose ) VERBOSITY="1" ; shift ;;
        -- )             shift ; break ;;
        *)               break ;;
    esac
done

# interpret positional args
while (( "$#" )); do
    # detect and validate path, if necessary
    if [ -z "$WP_PATH" ] && [ -e "$1/wp-admin" ]; then
        WP_PATH="$1"
    # detect url, if necessary
    elif [ -z "$WP_URL" ] && [ "${1:0:4}" == "http" ]; then
        WP_URL="$1"
    fi
    shift
done

# display usage, if necessary
if [ -n "$HELP" ] || [ -z "$WP_URL" ] || [ -z "$WP_PATH" ]; then
    echo "
Usage: $0 [-h|--help] [-m|--major] [-v|--verbose] -- <path> <url>

Arguments:
 path               Local filesystem path to wordpress files
 url                URL at which wordpress can be reached

Options:
 -h, --help         Display this usage statement
 -m, --major        Update wordpress across major releases
                    (e.g. 4.3 to 4.4.2 instead of 4.3.3)
 -v, --verbose      Display informative, non-critical output
"
    exit 1
fi

# dump vars
vecho "${BLUE}Working values:

HELP='${HELP}'
MAJORITY='${MAJORITY}'
VERBOSITY='${VERBOSITY}'
WP_URL='${WP_URL}'
WP_PATH='${WP_PATH}'

${RESET}"

# update wp-cli phar, as necessary
CLI_UPDATE=$(wp cli check-update --quiet --format=count)
if [ -n "$CLI_UPDATE" ]; then
    vecho "${GREEN}Updating WP-CLI (${CLI_UPDATE})${RESET}"
    if [ -n "$VERBOSITY" ]; then
        wp cli check-update
    fi
    vexec sudo -u deploy -i -- wp cli update --yes
else
    vecho "${YELLOW}WP-CLI is latest available${RESET}"
fi

# check wordpress is installed in the first place
wp core is-installed --path="$WP_PATH" --url="$WP_URL" >/dev/null 2>&1
WP_INSTALLED=$?

# update wordpress core & database, as necessary
if [ $WP_INSTALLED -eq 0 ]; then
    vecho "${GREEN}Wordpress installed...${RESET}"
    WP_UPDATE=$(wp core check-update --path="$WP_PATH" --url="$WP_URL" $MAJORITY --quiet --format=count)
    if [ -n "$WP_UPDATE" ]; then
        vecho "${GREEN}Updating Wordpress (${WP_UPDATE})${RESET}"
        if [ -n "$VERBOSITY" ]; then
            wp core check-update --path="$WP_PATH" --url="$WP_URL" $MAJORITY
        fi

        vexec wp core update --path="$WP_PATH" --url="$WP_URL" ${MAJORITY//--major/}
        vexec wp core update-db --path="$WP_PATH" --url="$WP_URL"

        # update wordpress version in bower.json
        WP_VERSION=$(wp core version --path="$WP_PATH" --url="$WP_URL")
        sed -i "s/\(\"wordpress\" *: *\)\"[0-9.]*\"/\1\"${WP_VERSION}\"/" $WP_PATH/../../bower.json
    else
        vecho "${YELLOW}Wordpress is latest available${RESET}"
    fi

    # update plugins and themes, as necessary
    vecho "${GREEN}Updating themes and plugins${RESET}"
    vexec wp plugin update --all --path="$WP_PATH" --url="$WP_URL"
    vexec wp theme update --all --path="$WP_PATH" --url="$WP_URL"

    # determine deployment root (relative to wp path)
    DEPLOY_ROOT="${WP_PATH}/../.."
    CHECKOUT_ROOT="/tmp/wp-update"

    # determine branch name and origin url
    if [ -e "${DEPLOY_ROOT}/.git" ]; then
        # for local stage nfs mounts
        GIT_BRANCH=$(cd $DEPLOY_ROOT; git rev-parse --abbrev-ref HEAD)
        GIT_ORIGIN=$(cd $DEPLOY_ROOT; git config --get remote.origin.url)
    else
        # for staging/prod deployments from a bare repo
        GIT_BRANCH=$(cd $DEPLOY_ROOT/..; basename $(pwd))
        GIT_ORIGIN=$(cd $DEPLOY_ROOT/../repo; git config --get remote.origin.url)
    fi

    # ensure a fresh clone of target branch
    rm -rf $CHECKOUT_ROOT
    vexec git clone -b $GIT_BRANCH $GIT_ORIGIN $CHECKOUT_ROOT

    # copy any updates to be staged
    cp -a $DEPLOY_ROOT/bower.json $CHECKOUT_ROOT/bower.json
    cp -a $DEPLOY_ROOT/web/wp-content/plugins/. $CHECKOUT_ROOT/web/wp-content/plugins/
    cp -a $DEPLOY_ROOT/web/wp-content/themes/. $CHECKOUT_ROOT/web/wp-content/themes/

    # stage that ish
    (\
        cd $CHECKOUT_ROOT ;\
        git add -A ./bower.json ;\
        git add -A ./web/wp-content/plugins/ ;\
        git add -A ./web/wp-content/themes/ \
    )

    # commit and push any staged changes
    if (cd $CHECKOUT_ROOT ; git diff-index --quiet HEAD --); then
        rm -rf $CHECKOUT_ROOT
    else
        (\
            cd $CHECKOUT_ROOT ;\
            vexec git commit -m "Automatic ${MAJORITY//--/} wordpress update at $(date)" ;\
            vexec git push origin $GIT_BRANCH \
        )
        vecho "${GREEN}Update committed and pushed${RESET}"
    fi
else
    vecho "${RED}Wordpress is not installed${RESET}"
fi

# display ending cli and core versions, as necessary
vecho "${GREEN}\nDone!${RESET}"
if [ -n "$VERBOSITY" ]; then
    wp cli version
    if [ -n "$WP_VERSION" ]; then
        echo $WP_VERSION
    else
        wp core version --path="$WP_PATH" --url="$WP_URL"
    fi
fi

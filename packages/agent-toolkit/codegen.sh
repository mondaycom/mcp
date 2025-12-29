#!/bin/bash
TYPE=${1:-all}


if [ "$TYPE" == "default" ] || [ "$TYPE" == "all" ]; then
    graphql-codegen --config codegen.yml --project default
elif [ "$TYPE" == "dev" ] || [ "$TYPE" == "all" ]; then
    graphql-codegen --config codegen.yml --project dev
else
    echo "Unknown type: $TYPE. Use 'dev', 'default', or 'all'."
    exit 1
fi


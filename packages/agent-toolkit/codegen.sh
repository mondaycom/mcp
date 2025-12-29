#!/bin/bash
TYPE=${1:-all}


if [ "$TYPE" == "default" ] || [ "$TYPE" == "all" ]; then
    graphql-codegen --config codegen.yml --project default
fi
if [ "$TYPE" == "dev" ] || [ "$TYPE" == "all" ]; then
    graphql-codegen --config codegen.yml --project dev
fi



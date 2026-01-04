#!/bin/bash
TYPE=${1:-all}
API_VERSION=$(grep -o "API_VERSION = '[^']*'" src/utils/version.utils.ts | cut -d "'" -f 2)

if [ "$TYPE" == "default" ] || [ "$TYPE" == "all" ]; then
    echo "Fetching default schema (version: $API_VERSION)..."
    curl "https://api.monday.com/v2/get_schema?format=sdl&version=$API_VERSION" -o src/monday-graphql/schema.graphql
fi

if [ "$TYPE" == "dev" ] || [ "$TYPE" == "all" ]; then
    echo "Fetching dev schema..."
    curl "https://api.monday.com/v2/get_schema?format=sdl&version=dev" -o src/monday-graphql/schema.dev.graphql
fi

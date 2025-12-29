#!/bin/bash

# Extract API version from shared constants file
API_VERSION=$(grep -o "API_VERSION = '[^']*'" src/utils/version.utils.ts | cut -d "'" -f 2)

curl "https://api.monday.com/v2/get_schema?format=sdl&version=$API_VERSION" -o src/monday-graphql/schema.graphql
curl "https://api.monday.com/v2/get_schema?format=sdl&version=dev" -o src/monday-graphql/schema-dev.graphql
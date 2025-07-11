#!/bin/bash
API_VERSION="dev"
SCHEMA_PATH="src/monday-graphql/schema.graphql"
curl --fail "https://api.monday.com/v2/get_schema?format=sdl&version=${API_VERSION}" -o ${SCHEMA_PATH}
#!/bin/bash
  curl "https://api.monday.com/v2/get_schema?format=sdl&version=dev&schema_type=public" -o src/monday-graphql/schema.graphql
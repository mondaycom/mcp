#!/bin/bash
  curl "https://api.monday.com/v2/get_schema?format=sdl&version=current" -o src/monday-graphql/schema.graphql
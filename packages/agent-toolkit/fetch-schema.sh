#!/bin/bash
curl "https://api.monday.com/v2/get_schema?format=sdl&version=2026-01" -o src/monday-graphql/schema.graphql
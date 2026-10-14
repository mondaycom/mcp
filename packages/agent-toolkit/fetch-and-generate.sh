#!/bin/bash
TYPE=${1:-all}
bash fetch-schema.sh "$TYPE"
bash codegen.sh "$TYPE"


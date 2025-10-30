#!/bin/bash

# Extract version from fetch-schema.sh
VERSION=$(grep -oP 'version=\K[^"]+' fetch-schema.sh)

# If grep -P doesn't work (macOS), use this alternative:
if [ -z "$VERSION" ]; then
  VERSION=$(grep -o 'version=[^"]*' fetch-schema.sh | cut -d'=' -f2)
fi

# Write to version.utils.ts
cat > src/utils/version.utils.ts << EOF
// AUTO-GENERATED
export const DEFAULT_API_VERSION = '$VERSION';
EOF

echo "Updated version.utils.ts with version: $VERSION"


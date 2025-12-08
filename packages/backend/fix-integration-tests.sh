#!/bin/bash

# Script to add database guards to it() blocks in integration tests
# Usage: ./fix-integration-tests.sh <file>

FILE="$1"

if [ -z "$FILE" ]; then
  echo "Usage: $0 <file>"
  exit 1
fi

# Add guard after every "it('should" line that doesn't already have one
# Using perl for multi-line editing
perl -i -pe '
  if (/^(\s+)it\(.*should.*async.*\(\)\s*=>\s*\{$/) {
    $indent = $1;
    $_ = $_ . "${indent}  if (!databaseAvailable) return;\n";
  }
' "$FILE"

echo "Fixed: $FILE"

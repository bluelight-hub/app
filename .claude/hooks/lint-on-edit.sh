#!/bin/bash
# Runs Biome lint check on the edited/written file after each Edit/Write tool call.
# Receives tool call JSON on stdin.

FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only lint TypeScript/JavaScript files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
pnpm exec biome check "$FILE_PATH" 2>&1 | head -15
exit 0

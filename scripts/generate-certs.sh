#!/bin/bash
set -e

# Define paths
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="$REPO_ROOT/certs"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ Error: mkcert is not installed."
    echo "Please install mkcert first:"
    echo "  brew install mkcert         # macOS"
    echo "  choco install mkcert        # Windows"
    echo "  sudo apt install mkcert     # Linux (requires certutil)"
    echo "Then run 'mkcert -install' to trust the CA."
    exit 1
fi

# Create certs directory
if [ ! -d "$CERTS_DIR" ]; then
    echo "📂 Creating certs directory at $CERTS_DIR..."
    mkdir -p "$CERTS_DIR"
fi

# Generate certificates
echo "🔐 Generating certificates..."
cd "$CERTS_DIR"
mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1

echo "✅ Certificates generated successfully in $CERTS_DIR"
echo "   - localhost.pem"
echo "   - localhost-key.pem"

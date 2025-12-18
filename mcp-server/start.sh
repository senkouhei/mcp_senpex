#!/bin/bash

# Start MCP Server and keep it running in foreground
cd "$(dirname "$0")"

echo "🚀 Starting Senpex MCP Server..."
echo "================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start server
exec node server.js

# The 'exec' command replaces the shell with node,
# ensuring the process stays in foreground



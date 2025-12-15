#!/bin/bash

# Senpex MCP Server Setup Script
# This script helps you quickly set up the server

set -e

echo "🚀 Senpex MCP Server Setup"
echo "=========================="
echo ""

# Check Node.js installation
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18 or higher from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required (found v$NODE_VERSION)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment configuration..."
    cp env.example .env
    echo "✅ Created .env file from template"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and add your Senpex credentials:"
    echo "   - SENPEX_CLIENT_ID"
    echo "   - SENPEX_SECRET_ID"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Prompt for operation mode
echo "🎯 How would you like to run the server?"
echo ""
echo "1) MCP Stdio Mode (for Claude Desktop, IDEs)"
echo "2) HTTP API Mode (for web deployment)"
echo "3) Skip (I'll run it manually)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Starting MCP Stdio Server..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm run start:mcp
        ;;
    2)
        echo ""
        echo "🌐 Starting HTTP API Server..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm start
        ;;
    3)
        echo ""
        echo "📚 Setup complete! Next steps:"
        echo ""
        echo "For MCP Stdio Mode:"
        echo "  npm run start:mcp"
        echo ""
        echo "For HTTP API Mode:"
        echo "  npm start"
        echo ""
        echo "For development with auto-reload:"
        echo "  npm run dev:mcp  (MCP mode)"
        echo "  npm run dev      (HTTP mode)"
        echo ""
        echo "📖 Documentation:"
        echo "  - QUICKSTART.md  - Get started in 5 minutes"
        echo "  - README.md      - Full documentation"
        echo "  - DEPLOYMENT.md  - Deploy to cloud"
        echo "  - EXAMPLES.md    - Usage examples"
        echo ""
        ;;
    *)
        echo "Invalid choice. Run the script again."
        exit 1
        ;;
esac


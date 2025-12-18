#!/bin/bash

# Development Setup Script for Senpex AI Agent
# This script sets up all services for local development

set -e

echo "🚀 Setting up Senpex AI Agent Development Environment"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from env.example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✓ .env created. Please edit it with your credentials."
    else
        echo "❌ env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Setup MCP Server (Node.js)
print_status "Setting up MCP Server (Node.js)..."
cd mcp-server
if [ ! -d "node_modules" ]; then
    npm install
    print_success "MCP Server dependencies installed"
else
    print_success "MCP Server dependencies already installed"
fi
cd ..

# Setup Agent API (Python)
print_status "Setting up Agent API (Python)..."
cd agent-core
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    print_success "Agent API virtual environment created and dependencies installed"
else
    print_success "Agent API virtual environment already exists"
fi
cd ..

# Setup Chainlit UI (Python)
print_status "Setting up Chainlit UI (Python)..."
cd chainlit-ui
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    print_success "Chainlit UI virtual environment created and dependencies installed"
else
    print_success "Chainlit UI virtual environment already exists"
fi
cd ..

# Setup Streamlit UI (Python)
print_status "Setting up Streamlit UI (Python)..."
cd streamlit-ui
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    deactivate
    print_success "Streamlit UI virtual environment created and dependencies installed"
else
    print_success "Streamlit UI virtual environment already exists"
fi
cd ..

echo ""
echo "======================================================"
echo "✅ Development environment setup complete!"
echo ""
echo "To start services:"
echo ""
echo "1️⃣  MCP Server:"
echo "   cd mcp-server && npm start"
echo ""
echo "2️⃣  Agent API:"
echo "   cd agent-core && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8080"
echo ""
echo "3️⃣  Chainlit UI:"
echo "   cd chainlit-ui && source venv/bin/activate && chainlit run app.py -h 0.0.0.0 -p 8000"
echo ""
echo "4️⃣  Streamlit UI:"
echo "   cd streamlit-ui && source venv/bin/activate && streamlit run app.py --server.port 8501"
echo ""
echo "OR use Docker Compose:"
echo "   docker-compose up"
echo ""
echo "======================================================"



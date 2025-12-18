# Agent Core API

FastAPI backend that serves as the single source of truth for the AI Agent.

## Quick Start

### Option 1: Using start script (Easiest)

```bash
./start.sh
```

### Option 2: Manual activation

```bash
# Activate virtual environment
source venv/bin/activate

# Start server
uvicorn main:app --host 0.0.0.0 --port 8080
```

### Option 3: Development mode (auto-reload)

```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

## First Time Setup

If you haven't set up the virtual environment yet:

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Activating Virtual Environment

**Linux/macOS:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

**Deactivate:**
```bash
deactivate
```

## Environment Variables

Create a `.env` file in the project root (not in agent-core):

```bash
MCP_SERVER_URL=http://localhost:3000/sse
OPENAI_API_KEY=sk-xxx  # Optional
```

## API Endpoints

Once running (default port 8080):

- **GET** `/` - API information
- **GET** `/health` - Health check
- **POST** `/agent/message` - Process user message
- **GET** `/agent/session/{id}` - Get session details
- **GET** `/agent/sessions` - List all sessions
- **GET** `/agent/tools/logs` - Get tool execution logs
- **DELETE** `/agent/session/{id}` - Delete session

## Interactive API Docs

When the server is running, visit:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

## Testing

```bash
# Test health endpoint
curl http://localhost:8080/health

# Send a test message
curl -X POST http://localhost:8080/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "ping"}'

# List sessions
curl http://localhost:8080/agent/sessions

# Get tool logs
curl http://localhost:8080/agent/tools/logs
```

## Development

### Install new packages

```bash
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
```

### Run tests

```bash
source venv/bin/activate
pytest
```

## Troubleshooting

### Virtual environment not activated

**Symptoms:** `ModuleNotFoundError` or wrong Python version

**Solution:**
```bash
source venv/bin/activate
# You should see (venv) in your prompt
```

### Port already in use

```bash
# Find process on port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or use different port
uvicorn main:app --host 0.0.0.0 --port 8081
```

### Can't connect to MCP server

**Check MCP server is running:**
```bash
curl http://localhost:3000/health
```

**Update MCP_SERVER_URL in .env:**
```bash
MCP_SERVER_URL=http://localhost:3000/sse
```

## Architecture

The Agent API:
1. Receives messages from Chainlit and Streamlit UIs
2. Analyzes user intent
3. Calls appropriate MCP tools
4. Manages sessions and logs
5. Returns formatted responses

## Dependencies

- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **HTTPx**: Async HTTP client
- **Pydantic**: Data validation
- **python-dotenv**: Environment variables

## Production Deployment

See `DEPLOYMENT.md` in the project root for Render deployment instructions.

## Stopping the Server

- **Foreground**: Press `Ctrl+C`
- **Background**: `pkill -f "uvicorn main:app"`



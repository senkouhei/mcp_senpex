# Senpex AI Agent - Production Architecture

A complete AI agent system with MCP tools, dual UIs (Chainlit & Streamlit), and n8n integration.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Chainlit UI    │────▶│                 │
│  (Chat, Port    │     │   Agent API     │
│   8000)         │     │  (FastAPI)      │
└─────────────────┘     │   Port 8080     │     ┌──────────────┐
                        │                 │────▶│  MCP Server  │──▶  n8n
┌─────────────────┐     │                 │     │  (Node.js)   │
│  Streamlit UI   │────▶│                 │     │  Port 3000   │
│  (Ops, Port     │     └─────────────────┘     └──────────────┘
│   8501)         │              │
└─────────────────┘              ▼
                         Session & Tool Logs
```

## 📁 Project Structure

```
mcp_senpex/
├── agent-core/          # FastAPI business logic
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── mcp-server/          # MCP tools (Node.js)
│   ├── index.js
│   ├── mcp-server.js
│   ├── package.json
│   └── Dockerfile
│
├── chainlit-ui/         # Chat interface
│   ├── app.py
│   ├── requirements.txt
│   ├── .chainlit
│   └── Dockerfile
│
├── streamlit-ui/        # Ops dashboard
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml   # Local development
```

## 🚀 Quick Start

### Local Development (Docker Compose)

```bash
# Clone and setup
git clone <your-repo>
cd mcp_senpex

# Create .env file
cat > .env << EOF
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id
OPENAI_API_KEY=sk-xxx
EOF

# Start all services
docker-compose up

# Access UIs
# Chainlit (Chat):  http://localhost:8000
# Streamlit (Ops):  http://localhost:8501
# Agent API:        http://localhost:8080
# MCP Server:       http://localhost:3000
```

### Run Individual Services

#### 1. MCP Server

```bash
cd mcp-server
npm install
npm start
# Runs on http://localhost:3000
```

#### 2. Agent API

```bash
cd agent-core
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
# Runs on http://localhost:8080
```

#### 3. Chainlit UI

```bash
cd chainlit-ui
pip install -r requirements.txt
chainlit run app.py -h 0.0.0.0 -p 8000
# Runs on http://localhost:8000
```

#### 4. Streamlit UI

```bash
cd streamlit-ui
pip install -r requirements.txt
streamlit run app.py --server.port 8501
# Runs on http://localhost:8501
```

## 🌐 Deploy to Render

### Option 1: Individual Web Services

Create **4 separate Web Services** on Render:

#### 1. MCP Server
- **Name:** `mcp-senpex`
- **Root Directory:** `mcp-server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Port:** `3000`
- **Env Vars:**
  ```
  SENPEX_CLIENT_ID=xxx
  SENPEX_SECRET_ID=xxx
  ```

#### 2. Agent API
- **Name:** `senpex-agent-api`
- **Root Directory:** `agent-core`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8080`
- **Port:** `8080`
- **Env Vars:**
  ```
  MCP_SERVER_URL=https://mcp-senpex.onrender.com/sse
  OPENAI_API_KEY=sk-xxx
  ```

#### 3. Chainlit UI
- **Name:** `senpex-chat`
- **Root Directory:** `chainlit-ui`
- **Docker Build:** Use Dockerfile
- **Port:** `8000`
- **Env Vars:**
  ```
  AGENT_API_URL=https://senpex-agent-api.onrender.com
  ```

#### 4. Streamlit UI
- **Name:** `senpex-ops`
- **Root Directory:** `streamlit-ui`
- **Docker Build:** Use Dockerfile
- **Port:** `8501`
- **Env Vars:**
  ```
  AGENT_API_URL=https://senpex-agent-api.onrender.com
  ```

### Option 2: Docker Compose (Single VM)

For internal use or testing:

```yaml
# Use the provided docker-compose.yml
docker-compose up -d
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```bash
# Senpex API
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id

# OpenAI (optional, for future LLM integration)
OPENAI_API_KEY=sk-xxx

# Service URLs (for production)
MCP_SERVER_URL=https://mcp-senpex.onrender.com/sse
AGENT_API_URL=https://senpex-agent-api.onrender.com
```

## 📡 API Endpoints

### Agent API (Port 8080)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| POST | `/agent/message` | Process message |
| GET | `/agent/session/{id}` | Get session |
| GET | `/agent/sessions` | List all sessions |
| GET | `/agent/tools/logs` | Get tool logs |

### MCP Server (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sse` | MCP over SSE (for n8n) |
| POST | `/message` | SSE message handler |
| GET | `/api` | Server info |

## 🛠️ Available MCP Tools

1. **`ping`** - Test connection
2. **`get_dropoff_quote`** - Get delivery quotes
3. **`track_order`** - Track order status

## 🔌 n8n Integration

Configure n8n MCP Client node:

| Field | Value |
|-------|-------|
| **Endpoint** | `https://mcp-senpex.onrender.com/sse` |
| **Server Transport** | HTTP Streamable |
| **Authentication** | None |
| **Tools to Include** | All |

## 🎨 UI Features

### Chainlit UI (Chat)
- ✅ Beautiful conversational interface
- ✅ Real-time tool execution display
- ✅ Session management
- ✅ Custom branding

### Streamlit UI (Ops)
- ✅ Real-time dashboard
- ✅ Session monitoring
- ✅ Tool execution logs
- ✅ Analytics & charts
- ✅ Auto-refresh support

## 🔒 Production Hardening

### Security Checklist
- [ ] Add authentication (JWT/Clerk)
- [ ] Enable rate limiting
- [ ] Set up CORS properly
- [ ] Use HTTPS everywhere
- [ ] Secure environment variables
- [ ] Add request validation

### Performance
- [ ] Use Redis for session store
- [ ] Add caching layer
- [ ] Enable CDN for static assets
- [ ] Configure load balancer
- [ ] Set up monitoring (Sentry, etc.)

### Observability
- [ ] Add structured logging
- [ ] Set up APM (Application Performance Monitoring)
- [ ] Configure alerts
- [ ] Add health check endpoints

## 📊 Monitoring

Access the Streamlit dashboard at `http://localhost:8501` to monitor:
- Active sessions
- Tool execution logs
- User analytics
- System health

## 🧪 Testing

```bash
# Test Agent API
curl http://localhost:8080/health

# Test MCP Server SSE
curl -N http://localhost:3000/sse

# Test message processing
curl -X POST http://localhost:8080/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "ping"}'
```

## 📝 Development Workflow

1. **Make changes** to any service
2. **Test locally** with Docker Compose
3. **Commit** changes
4. **Push** to trigger Render deployment
5. **Monitor** via Streamlit UI

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test locally
5. Submit pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions:
- Check logs via Streamlit UI
- Review API health endpoints
- Check Render deployment logs
- Test MCP connection with `ping` tool

## 🚧 Roadmap

- [ ] Add OpenAI/Claude LLM integration for better NLU
- [ ] Implement proper parameter extraction
- [ ] Add authentication layer
- [ ] Create more Senpex tools
- [ ] Add webhook support for n8n
- [ ] Implement RAG for documentation
- [ ] Add voice input support
- [ ] Create mobile-responsive UI



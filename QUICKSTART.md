# 🚀 Quick Start Guide

Get your Senpex AI Agent running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Senpex API credentials
- Git

## 🏃 Run Locally

### Option A: Automated Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/your-username/mcp_senpex.git
cd mcp_senpex

# Run setup script (creates virtual environments and installs dependencies)
./setup-dev.sh

# Edit .env with your credentials
nano .env
```

### Option B: Docker Compose (Easiest)

```bash
# Clone repository
git clone https://github.com/your-username/mcp_senpex.git
cd mcp_senpex

# Create .env file
cat > .env << EOF
SENPEX_CLIENT_ID=your_client_id_here
SENPEX_SECRET_ID=your_secret_id_here
OPENAI_API_KEY=sk-xxx
EOF

# Start all services with Docker
docker-compose up
```

Wait ~30 seconds for all services to start.

### 4. Access UIs

Open in your browser:

- **💬 Chat Interface**: http://localhost:8000
- **📊 Ops Dashboard**: http://localhost:8501
- **🔧 Agent API**: http://localhost:8080/docs
- **⚙️ MCP Server**: http://localhost:3000/api

## ✅ Test It

### Test Chat (Chainlit)

1. Open http://localhost:8000
2. Type: "ping"
3. You should get: "pong from Senpex MCP server"

### Test Ops Dashboard (Streamlit)

1. Open http://localhost:8501
2. View Overview page
3. Check tool execution logs

### Test API

```bash
# Test health
curl http://localhost:8080/health

# Send message
curl -X POST http://localhost:8080/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "ping"}'
```

## 🌐 Deploy to Render

### Using Blueprint (1-Click Deploy)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/your-username/mcp_senpex.git
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to https://dashboard.render.com/
   - Click "New" → "Blueprint"
   - Connect your GitHub repo
   - Select `render.yaml`
   - Add environment variables
   - Click "Apply"

3. **Done!** All 4 services will be deployed automatically.

### Access Deployed Services

- Chat: `https://senpex-chat.onrender.com`
- Ops: `https://senpex-ops.onrender.com`  
- API: `https://senpex-agent-api.onrender.com`
- MCP: `https://mcp-senpex.onrender.com`

## 🔌 Connect n8n

### n8n MCP Client Configuration

| Field | Value |
|-------|-------|
| **Endpoint** | `https://mcp-senpex.onrender.com/sse` |
| **Server Transport** | HTTP Streamable |
| **Authentication** | None |
| **Tools to Include** | All |

### Test n8n Connection

1. Add MCP Client node in n8n
2. Configure with above settings
3. Click "Execute step"
4. You should see tools: `ping`, `get_dropoff_quote`, `track_order`

## 🛠️ Available Tools

### 1. `ping`
Test connection

**Example:**
```
User: "ping"
Agent: "pong from Senpex MCP server"
```

### 2. `get_dropoff_quote`
Get delivery quote from pickup to dropoff

**Example:**
```
User: "Get a quote from San Francisco to Los Angeles"
Agent: Shows price, distance, and duration
```

### 3. `track_order`
Track order by ID

**Example:**
```
User: "Track order 12345"
Agent: Shows order status and location
```

## 📊 Monitor Your System

### Via Streamlit Dashboard

1. Open http://localhost:8501
2. Navigate through tabs:
   - **Overview**: Key metrics
   - **Sessions**: Active conversations
   - **Tool Logs**: Execution history
   - **Analytics**: Usage charts

### Via Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f agent-api
docker-compose logs -f mcp-server
docker-compose logs -f chainlit-ui
docker-compose logs -f streamlit-ui
```

## 🔧 Common Commands

### Stop Services
```bash
docker-compose down
```

### Restart Single Service
```bash
docker-compose restart agent-api
```

### Rebuild After Changes
```bash
docker-compose up --build
```

### View Service Status
```bash
docker-compose ps
```

## 🐛 Troubleshooting

### Services won't start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
- `.env` file missing or incorrect
- Ports 3000, 8000, 8080, or 8501 already in use
- Docker not running

**Solution:**
```bash
# Check if ports are free
lsof -i :3000
lsof -i :8000
lsof -i :8080
lsof -i :8501

# Kill processes if needed
kill -9 <PID>
```

### Can't connect to Agent API

**Check health:**
```bash
curl http://localhost:8080/health
```

**If fails:**
```bash
docker-compose logs agent-api
```

### MCP tools not working

**Test MCP server:**
```bash
curl -N http://localhost:3000/sse
```

**Should see:**
```
event: endpoint
data: /message?sessionId=xxx
```

**Check credentials:**
```bash
# In .env file
SENPEX_CLIENT_ID=xxx  # Must be set
SENPEX_SECRET_ID=xxx  # Must be set
```

## 📚 Next Steps

1. **Customize Chainlit UI**
   - Edit `chainlit-ui/.chainlit`
   - Add custom branding
   - Configure authentication

2. **Enhance Agent Logic**
   - Edit `agent-core/main.py`
   - Add LLM integration
   - Improve intent detection

3. **Add More Tools**
   - Edit `mcp-server/mcp-server.js`
   - Implement new Senpex endpoints
   - Test with n8n

4. **Production Hardening**
   - Add authentication
   - Enable rate limiting
   - Set up monitoring
   - Configure backups

## 🎓 Learn More

- [Full Documentation](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Architecture Overview](README.md#architecture)

## 🆘 Need Help?

1. Check logs first: `docker-compose logs`
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
3. Test each service individually
4. Open GitHub issue with logs

## 🎉 You're Ready!

Your Senpex AI Agent is now running locally. Try asking it questions in the Chat UI and monitor activity in the Ops Dashboard!

**Happy building! 🚀**


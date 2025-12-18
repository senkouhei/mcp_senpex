# Deployment Guide

Complete guide for deploying the Senpex AI Agent system.

## 🏗️ Architecture Overview

```
                    Internet
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    Chainlit UI   Streamlit UI   n8n
    (Port 8000)   (Port 8501)
         │             │             │
         └─────────────┼─────────────┘
                       │
                  Agent API
                 (Port 8080)
                       │
                  MCP Server  ──────▶  Senpex API
                 (Port 3000)
```

## 🚀 Deployment Options

### Option 1: Render (Recommended for Production)

Render provides easy deployment with the included `render.yaml`.

#### Prerequisites
- GitHub account
- Render account (free tier works)
- Senpex API credentials

#### Steps

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/mcp_senpex.git
   cd mcp_senpex
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/your-username/mcp_senpex.git
   git push -u origin main
   ```

3. **Deploy on Render**

   **Option A: Using Blueprint (Easiest)**
   
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Select `render.yaml`
   - Add environment variables:
     - `SENPEX_CLIENT_ID`: Your Senpex client ID
     - `SENPEX_SECRET_ID`: Your Senpex secret ID
     - `OPENAI_API_KEY`: Your OpenAI API key (optional)
   - Click "Apply"

   Render will create all 4 services automatically!

   **Option B: Manual Setup**
   
   Create each service individually:

   **Service 1: MCP Server**
   - Type: Web Service
   - Name: `mcp-senpex`
   - Root Directory: `mcp-server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: 3000
   - Environment Variables:
     ```
     SENPEX_CLIENT_ID=your_client_id
     SENPEX_SECRET_ID=your_secret_id
     NODE_ENV=production
     ```

   **Service 2: Agent API**
   - Type: Web Service
   - Name: `senpex-agent-api`
   - Root Directory: `agent-core`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8080`
   - Port: 8080
   - Environment Variables:
     ```
     MCP_SERVER_URL=https://mcp-senpex.onrender.com/sse
     OPENAI_API_KEY=sk-xxx (optional)
     ```

   **Service 3: Chainlit UI**
   - Type: Web Service
   - Name: `senpex-chat`
   - Root Directory: `chainlit-ui`
   - Docker: Yes (use Dockerfile)
   - Port: 8000
   - Environment Variables:
     ```
     AGENT_API_URL=https://senpex-agent-api.onrender.com
     ```

   **Service 4: Streamlit UI**
   - Type: Web Service
   - Name: `senpex-ops`
   - Root Directory: `streamlit-ui`
   - Docker: Yes (use Dockerfile)
   - Port: 8501
   - Environment Variables:
     ```
     AGENT_API_URL=https://senpex-agent-api.onrender.com
     ```

4. **Access Your Services**

   After deployment completes (~5-10 minutes):
   
   - **Chat UI**: `https://senpex-chat.onrender.com`
   - **Ops Dashboard**: `https://senpex-ops.onrender.com`
   - **Agent API**: `https://senpex-agent-api.onrender.com`
   - **MCP Server**: `https://mcp-senpex.onrender.com`

5. **Configure n8n**

   In your n8n MCP Client node:
   - Endpoint: `https://mcp-senpex.onrender.com/sse`
   - Transport: HTTP Streamable
   - Auth: None

### Option 2: Docker Compose (Local/VM)

Perfect for development or self-hosted deployment.

#### Prerequisites
- Docker & Docker Compose installed
- Senpex API credentials

#### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/mcp_senpex.git
   cd mcp_senpex
   ```

2. **Create .env File**
   ```bash
   cat > .env << EOF
   SENPEX_CLIENT_ID=your_client_id
   SENPEX_SECRET_ID=your_secret_id
   OPENAI_API_KEY=sk-xxx
   EOF
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   ```

4. **Access Services**
   - Chat UI: http://localhost:8000
   - Ops Dashboard: http://localhost:8501
   - Agent API: http://localhost:8080
   - MCP Server: http://localhost:3000

5. **View Logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop Services**
   ```bash
   docker-compose down
   ```

### Option 3: Kubernetes (Advanced)

For large-scale production deployments.

Coming soon - contact for k8s manifests.

## 🔧 Configuration

### Environment Variables

#### MCP Server
- `SENPEX_CLIENT_ID` (required): Senpex API client ID
- `SENPEX_SECRET_ID` (required): Senpex API secret ID
- `PORT` (optional): Server port, default 3000
- `NODE_ENV` (optional): Environment mode

#### Agent API
- `MCP_SERVER_URL` (required): MCP server SSE endpoint
- `OPENAI_API_KEY` (optional): For future LLM integration

#### Chainlit UI
- `AGENT_API_URL` (required): Agent API base URL

#### Streamlit UI
- `AGENT_API_URL` (required): Agent API base URL

### Custom Domains (Render)

1. Go to service settings
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records as instructed

## 🧪 Testing Deployment

### 1. Test MCP Server

```bash
# Health check
curl https://mcp-senpex.onrender.com/health

# SSE endpoint (should stream)
curl -N https://mcp-senpex.onrender.com/sse
```

### 2. Test Agent API

```bash
# Health check
curl https://senpex-agent-api.onrender.com/health

# Send message
curl -X POST https://senpex-agent-api.onrender.com/agent/message \
  -H "Content-Type: application/json" \
  -d '{"message": "ping"}'
```

### 3. Test UIs

- Open Chat UI in browser
- Send a test message
- Check Ops Dashboard for logs

## 📊 Monitoring

### Render Dashboard
- CPU/Memory usage
- Request logs
- Error rates
- Deployment history

### Streamlit Ops Dashboard
- Active sessions
- Tool execution logs
- User analytics
- System health

### Logs

**Render:**
```bash
# Via Dashboard: Service → Logs tab
```

**Docker Compose:**
```bash
docker-compose logs -f [service-name]
```

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files
- ✅ Use Render's encrypted env vars
- ✅ Rotate API keys regularly

### 2. Authentication
- 🚧 Add JWT/OAuth to Agent API
- 🚧 Enable Chainlit auth
- 🚧 Restrict Streamlit to internal network

### 3. HTTPS
- ✅ Render provides free SSL
- ✅ Always use HTTPS URLs
- ✅ Enable HSTS headers

### 4. Rate Limiting
- 🚧 Add rate limiting to Agent API
- 🚧 Implement request throttling
- 🚧 Set up abuse detection

## ⚡ Performance Optimization

### 1. Caching
```python
# Add Redis for session storage
REDIS_URL = os.getenv("REDIS_URL")
```

### 2. Connection Pooling
```python
# Use persistent HTTP clients
httpx.AsyncClient(limits=httpx.Limits(max_connections=100))
```

### 3. Async Processing
```python
# Already using async/await
# Consider adding task queue for long operations
```

## 🐛 Troubleshooting

### Issue: MCP Server connection fails

**Symptoms:** n8n can't connect, 500 errors

**Solutions:**
1. Check MCP server logs
2. Verify SSE endpoint: `curl -N https://mcp-senpex.onrender.com/sse`
3. Ensure environment variables are set
4. Check Render service status

### Issue: Agent API timeout

**Symptoms:** Slow responses, 504 errors

**Solutions:**
1. Check MCP server health
2. Increase timeout values
3. Review Render free tier limits
4. Consider upgrading plan

### Issue: Chainlit UI not loading

**Symptoms:** Blank page, connection refused

**Solutions:**
1. Check Chainlit service logs
2. Verify AGENT_API_URL is correct
3. Test Agent API health endpoint
4. Clear browser cache

### Issue: Streamlit showing old data

**Symptoms:** Stale metrics, outdated logs

**Solutions:**
1. Click "Refresh Data" button
2. Enable auto-refresh
3. Clear cache: `st.cache_data.clear()`
4. Check Agent API connectivity

## 📈 Scaling

### Render Scaling
- **Free Tier**: Sleeps after 15 min inactivity
- **Starter**: Always on, better performance
- **Standard**: Auto-scaling, higher limits

### Load Balancing
```yaml
# For multiple replicas (Render Standard+)
scaling:
  minInstances: 2
  maxInstances: 10
  targetCPUPercent: 70
```

## 🔄 CI/CD

Render auto-deploys on git push!

### Manual Deploy
```bash
git add .
git commit -m "Update services"
git push origin main
```

Render will automatically:
1. Detect changes
2. Build services
3. Run health checks
4. Deploy new versions

### Deployment Status
Monitor at: https://dashboard.render.com/

## 📝 Maintenance

### Regular Tasks
- [ ] Monitor logs daily
- [ ] Review analytics weekly
- [ ] Update dependencies monthly
- [ ] Rotate API keys quarterly
- [ ] Backup session data regularly

### Updates
```bash
# Update dependencies
cd agent-core && pip list --outdated
cd mcp-server && npm outdated
```

## 🆘 Support

### Get Help
1. Check logs (Streamlit Ops Dashboard)
2. Review Render deployment logs
3. Test endpoints with curl
4. Check GitHub issues
5. Contact support

### Useful Links
- [Render Docs](https://render.com/docs)
- [Chainlit Docs](https://docs.chainlit.io)
- [Streamlit Docs](https://docs.streamlit.io)
- [MCP SDK Docs](https://modelcontextprotocol.io)

## 📄 License

MIT License - See LICENSE file



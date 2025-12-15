# Deployment Guide

This guide covers different ways to deploy the Senpex MCP Server.

## Table of Contents

1. [Local Usage (MCP Stdio)](#local-usage-mcp-stdio)
2. [Deploy to Render (HTTP API)](#deploy-to-render-http-api)
3. [Docker Deployment](#docker-deployment)
4. [Environment Variables](#environment-variables)

---

## Local Usage (MCP Stdio)

The native MCP server uses stdio transport for communication with MCP clients (like Claude Desktop, IDEs, etc.).

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp env.example .env
```

3. Add your Senpex credentials to `.env`:
```
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id
```

### Run MCP Server

```bash
npm run start:mcp
```

### Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "senpex": {
      "command": "node",
      "args": ["/absolute/path/to/senpex-mcp/index.js"],
      "env": {
        "SENPEX_CLIENT_ID": "your_client_id",
        "SENPEX_SECRET_ID": "your_secret_id"
      }
    }
  }
}
```

---

## Deploy to Render (HTTP API)

For cloud deployment, we provide an HTTP wrapper (`server.js`) that exposes the MCP tools via REST API.

### Method 1: Render Dashboard (Easiest)

1. **Push to GitHub**
   - Create a new GitHub repository
   - Push your code: `git push origin main`

2. **Create Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `senpex-mcp-server`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter

4. **Add Environment Variables**
   - `NODE_ENV`: `production`
   - `SENPEX_CLIENT_ID`: Your Senpex client ID
   - `SENPEX_SECRET_ID`: Your Senpex secret ID
   - `PORT`: `10000` (or leave empty for default)

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (takes 2-5 minutes)

6. **Access Your API**
   - Your service will be available at: `https://your-service-name.onrender.com`
   - Health check: `https://your-service-name.onrender.com/health`
   - API info: `https://your-service-name.onrender.com/`

### Method 2: Render Blueprint (render.yaml)

1. **Push to GitHub** (with `render.yaml` included)

2. **Create Blueprint on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render auto-detects `render.yaml`

3. **Configure Environment Variables**
   - Add required variables when prompted
   - Deploy

### Method 3: Render CLI

```bash
# Install Render CLI
npm install -g @render/cli

# Login
render login

# Deploy
render deploy
```

### HTTP API Endpoints

Once deployed, your server exposes:

- **GET** `/` - API information
- **GET** `/health` - Health check
- **GET** `/mcp/tools` - List available MCP tools
- **POST** `/mcp/tools/:toolName` - Execute a tool

#### Example: Get a Delivery Quote

```bash
curl -X POST https://your-service.onrender.com/mcp/tools/get_dropoff_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "user_name": "John Doe",
    "pickup_addr": "123 Main St, San Francisco, CA",
    "dropoff_addr": "456 Market St, San Francisco, CA"
  }'
```

#### Example: List Tools

```bash
curl https://your-service.onrender.com/mcp/tools
```

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t senpex-mcp-server .
```

### Run Container Locally

```bash
docker run -d \
  -p 3000:3000 \
  -e SENPEX_CLIENT_ID=your_client_id \
  -e SENPEX_SECRET_ID=your_secret_id \
  -e NODE_ENV=production \
  --name senpex-mcp \
  senpex-mcp-server
```

### Test Container

```bash
curl http://localhost:3000/health
```

### Deploy to Docker Hub

```bash
# Tag image
docker tag senpex-mcp-server your-dockerhub-username/senpex-mcp-server:latest

# Push to Docker Hub
docker push your-dockerhub-username/senpex-mcp-server:latest
```

### Deploy to Render with Docker

1. Push your Docker image to Docker Hub or GitHub Container Registry
2. In Render Dashboard:
   - Create new "Web Service"
   - Select "Deploy an existing image from a registry"
   - Enter your image URL
   - Configure environment variables
   - Deploy

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SENPEX_CLIENT_ID` | Your Senpex API client ID | `abc123...` |
| `SENPEX_SECRET_ID` | Your Senpex API secret ID | `xyz789...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP server port (for server.js) | `3000` |

---

## Monitoring & Logs

### Render Dashboard

- View logs: Navigate to your service → "Logs" tab
- Monitor metrics: "Metrics" tab
- Set up alerts: "Settings" → "Alerts"

### Health Checks

Render automatically monitors `/health` endpoint. Configure:
- Health Check Path: `/health`
- Health Check Interval: 30 seconds

### Debugging

View logs in real-time:
```bash
# Render CLI
render logs -f your-service-name
```

---

## Scaling

### Render Plans

- **Free**: Good for testing, goes to sleep after inactivity
- **Starter ($7/mo)**: Always on, better performance
- **Standard/Pro**: Auto-scaling, dedicated resources

### Performance Tips

1. **Cold Starts**: Free tier services sleep after 15 min of inactivity
2. **Keep Alive**: Use a service like UptimeRobot to ping `/health` every 5 minutes
3. **Caching**: Consider adding Redis for response caching
4. **Rate Limiting**: Add rate limiting to prevent abuse

---

## Troubleshooting

### Service Won't Start

1. Check environment variables are set correctly
2. View logs in Render dashboard
3. Verify build completed successfully

### API Credentials Invalid

- Double-check `SENPEX_CLIENT_ID` and `SENPEX_SECRET_ID`
- Ensure no extra spaces in environment variables
- Test credentials with Senpex API directly

### Port Issues

- Render automatically assigns `PORT` environment variable
- Use `process.env.PORT || 3000` in your code (already configured)

### Connection Timeouts

- Senpex API requests timeout after 30 seconds
- Check if API is accessible from Render's network
- Verify no firewall blocking outbound requests

---

## Security Best Practices

1. **Never commit `.env` file**
2. **Use environment variables** for all secrets
3. **Enable HTTPS** (automatic on Render)
4. **Rotate credentials** regularly
5. **Monitor API usage** for unusual activity
6. **Set up rate limiting** if exposing publicly

---

## Cost Estimation

### Render Pricing (as of 2024)

- **Free Plan**: $0/month
  - 750 hours/month
  - Spins down after 15 min inactivity
  - Good for testing

- **Starter Plan**: $7/month
  - Always on
  - Better performance
  - No cold starts

- **Standard Plan**: $25/month
  - Auto-scaling
  - Dedicated resources
  - Better for production

### Senpex API Costs

- Check with Senpex for delivery pricing
- This server only provides integration, actual delivery costs apply separately

---

## Next Steps

- ✅ Deploy to Render
- ✅ Configure environment variables
- ✅ Test with health check
- ✅ Try example API calls
- 📚 Read [README.md](README.md) for tool documentation
- 🔒 Set up monitoring and alerts
- 📊 Monitor API usage and costs

## Support

- **Render Issues**: [Render Support](https://render.com/docs)
- **Senpex API**: Contact Senpex support
- **Server Issues**: Open an issue on GitHub

---

Made with ❤️ for seamless Senpex integration


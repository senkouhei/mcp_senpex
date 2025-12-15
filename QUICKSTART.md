# Quick Start Guide

Get your Senpex MCP Server running in 5 minutes!

## 🎯 Choose Your Path

### Path 1: Local MCP Server (for Claude Desktop, IDEs)
→ Skip to [Local Setup](#local-setup)

### Path 2: Cloud Deployment (for REST API access)
→ Skip to [Cloud Deployment](#cloud-deployment)

---

## Local Setup

### Step 1: Install

```bash
# Clone repository
git clone <repository-url>
cd senpex-mcp

# Install dependencies
npm install
```

### Step 2: Configure

```bash
# Create environment file
cp env.example .env
```

Edit `.env`:
```
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id
```

### Step 3: Run

```bash
npm run start:mcp
```

### Step 4: Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "senpex": {
      "command": "node",
      "args": ["/full/path/to/senpex-mcp/index.js"],
      "env": {
        "SENPEX_CLIENT_ID": "your_client_id",
        "SENPEX_SECRET_ID": "your_secret_id"
      }
    }
  }
}
```

**✅ Done!** Restart Claude Desktop and you'll see Senpex tools available.

---

## Cloud Deployment

### Step 1: Prepare Code

```bash
# Clone repository
git clone <repository-url>
cd senpex-mcp

# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Push to GitHub

```bash
# Create a repo on GitHub, then:
git remote add origin https://github.com/senkouhei/mcp_senpex.git
git push -u origin main
```

### Step 3: Deploy to Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select your repository
5. Render will auto-detect the configuration

### Step 4: Set Environment Variables

In the Render dashboard, add:

| Variable | Value |
|----------|-------|
| `SENPEX_CLIENT_ID` | your_client_id |
| `SENPEX_SECRET_ID` | your_secret_id |
| `NODE_ENV` | production |

### Step 5: Deploy

Click **"Create Web Service"**

Wait 2-3 minutes for deployment...

### Step 6: Test

Your service will be at: `https://your-service-name.onrender.com`

```bash
# Health check
curl https://your-service-name.onrender.com/health

# Get tools list
curl https://your-service-name.onrender.com/mcp/tools
```

**✅ Done!** Your API is live and ready to use.

---

## 🧪 Test Your Setup

### For Local MCP Server

In Claude Desktop, try:
```
"Can you get a delivery quote from 123 Main St, San Francisco to 456 Market St, San Francisco for me@example.com?"
```

### For HTTP API

```bash
curl -X POST https://your-service.onrender.com/mcp/tools/get_dropoff_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "user_name": "Test User",
    "pickup_addr": "123 Main St, San Francisco, CA 94102",
    "dropoff_addr": "456 Market St, San Francisco, CA 94103"
  }'
```

Expected response:
```
Senpex Delivery Quote:
Order: Delivery Order
Pickup: 123 Main St, San Francisco, CA 94102
Dropoff: 456 Market St, San Francisco, CA 94103

Price: $15.50
Distance: 2.3 miles
Estimated Duration: 15 mins
Quote Token: abc123...
```

---

## 🐛 Troubleshooting

### "Command not found" error

Make sure Node.js 18+ is installed:
```bash
node --version  # Should be v18.0.0 or higher
```

### "API credentials not configured" error

- Check your `.env` file exists
- Verify `SENPEX_CLIENT_ID` and `SENPEX_SECRET_ID` are set correctly
- For MCP clients, ensure environment variables are in the config

### Render deployment fails

- Check build logs in Render dashboard
- Ensure environment variables are set
- Verify `package.json` and `render.yaml` are committed

### Claude Desktop doesn't show tools

- Restart Claude Desktop completely
- Check the config file path is correct
- Use absolute paths, not relative paths
- Verify the MCP server runs independently first

### Port already in use (HTTP mode)

```bash
# Change port
PORT=3001 npm start
```

Or edit `env.example`:
```
PORT=3001
```

---

## 📚 Next Steps

- ✅ Server is running
- 📖 Read [README.md](README.md) for full tool documentation
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for advanced deployment
- 🔧 Explore all 16 available tools
- 💡 Build integrations with your apps

---

## 🆘 Need Help?

- **Documentation**: Check [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
- **Senpex API**: [api.senpex.com/docs](https://api.senpex.com/docs)
- **Issues**: Open an issue on GitHub
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## 🎉 Success!

You now have a working Senpex MCP Server!

Try asking Claude to:
- Get delivery quotes
- Create orders
- Track deliveries
- Check driver locations
- And more!

Happy shipping! 📦🚚


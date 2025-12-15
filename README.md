# Senpex MCP Server (Node.js)

A Model Context Protocol (MCP) server that provides integration with the Senpex Delivery API. This server allows AI assistants to interact with Senpex's delivery services including quotes, order creation, tracking, and status updates.

## 🚀 Features

- **Delivery Quotes**: Get pricing for pickup and dropoff deliveries
- **Reverse Logistics**: Support for multiple pickups to one dropoff location
- **Order Management**: Create, confirm, and track delivery orders
- **Real-time Tracking**: Track orders and get driver locations
- **Status Updates**: Update delivery statuses and manage order lifecycle
- **Dual Mode**: Run as MCP stdio server OR HTTP REST API
- **Cloud Ready**: Deploy to Render, Docker, or any Node.js hosting

## 📋 Prerequisites

- Node.js 18 or higher
- Senpex API credentials (Client ID and Secret ID)
- npm or yarn package manager

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd senpex-mcp
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Edit `.env`:
```env
SENPEX_CLIENT_ID=your_client_id_here
SENPEX_SECRET_ID=your_secret_id_here
```

### 3. Run the Server

**Option A: MCP Stdio Server** (for MCP clients like Claude Desktop)
```bash
npm run start:mcp
```

**Option B: HTTP REST API** (for web deployment)
```bash
npm start
# Server runs on http://localhost:3000
```

## 💻 Local Development

### MCP Stdio Mode

```bash
# Development with auto-reload
npm run dev:mcp

# Production
npm run start:mcp
```

### HTTP API Mode

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

### Test the HTTP API

```bash
# Health check
curl http://localhost:3000/health

# List available tools
curl http://localhost:3000/mcp/tools

# Get a delivery quote
curl -X POST http://localhost:3000/mcp/tools/get_dropoff_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test@example.com",
    "user_name": "John Doe",
    "pickup_addr": "123 Main St, San Francisco, CA",
    "dropoff_addr": "456 Market St, San Francisco, CA"
  }'
```

## 🌐 Deployment to Render

### Quick Deploy (3 Minutes)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Render auto-detects settings from `render.yaml`
   - Add environment variables:
     - `SENPEX_CLIENT_ID`: Your Senpex client ID
     - `SENPEX_SECRET_ID`: Your Senpex secret ID
   - Click "Create Web Service"

3. **Access Your API**
   - Your service will be at: `https://your-service.onrender.com`
   - Test: `https://your-service.onrender.com/health`

**📖 Detailed Deployment Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including Docker, environment configuration, and troubleshooting.

### Other Deployment Options

- **Docker**: See [DEPLOYMENT.md](DEPLOYMENT.md#docker-deployment)
- **Render Blueprint**: Automatic deployment with `render.yaml`
- **Other Platforms**: Works on Heroku, Railway, Fly.io, etc.

## Available Tools

### Quote Tools
- `get_dropoff_quote`: Get delivery quote for pickup and dropoff
- `get_pickup_quote`: Get quote for multiple pickups to one dropoff

### Order Tools
- `confirm_dropoff`: Create a dropoff order from a quote
- `confirm_pickup`: Create a pickup order from a quote
- `get_order_list`: List all orders with pagination
- `get_order_by_token`: Get order details by token

### Tracking Tools
- `track_order_by_id`: Track order status by ID
- `track_order_by_access_key`: Track order by access key
- `get_driver_location`: Get real-time driver location
- `get_route_details`: Get detailed route information

### Status Tools
- `set_delivery_ready`: Mark order ready for delivery
- `set_laboratory_ready`: Mark as ready for pickup from lab
- `set_dropoff_received`: Mark as received at dropoff

## API Documentation

For detailed API documentation, visit [Senpex API Documentation](https://api.senpex.com/docs).

## Configuration

### Environment Variables

- `SENPEX_CLIENT_ID`: Your Senpex API client ID (required)
- `SENPEX_SECRET_ID`: Your Senpex API secret ID (required)
- `NODE_ENV`: Environment mode (development/production)

### Transport Types

- 1: Car
- 3: SUV
- 8: Pickup Truck
- 9: Large Van

### Package Sizes

- 1: Small (1-25 lbs)
- 2: Medium (26-50 lbs)
- 3: Large (51-70 lbs)
- 4: Heavy (71-150 lbs)

## 🔧 Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

### Other MCP Clients

The server uses stdio transport. Configure your MCP client to:
- **Command**: `node`
- **Args**: `["/path/to/index.js"]`
- **Environment**: Set `SENPEX_CLIENT_ID` and `SENPEX_SECRET_ID`

### HTTP API (Alternative)

If your application can't use stdio, use the HTTP API mode:

```bash
npm start
```

Then make HTTP requests to `http://localhost:3000/mcp/tools/:toolName`

## Error Handling

The server includes comprehensive error handling:
- API credential validation
- HTTP error responses
- Timeout handling (30 seconds)
- Detailed error messages

## Security Notes

- Never commit `.env` file to version control
- Keep your API credentials secure
- Use environment variables for sensitive data
- The server uses HTTPS for all API communications

## Support

For issues related to:
- **Senpex API**: Contact Senpex support
- **MCP Server**: Open an issue in this repository

## License

MIT

## Version

1.0.0


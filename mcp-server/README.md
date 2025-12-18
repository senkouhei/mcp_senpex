# MCP Server

Senpex MCP Server with SSE support for n8n integration.

## Quick Start

### Option 1: Using npm (Recommended)

```bash
# Install dependencies
npm install

# Start server (foreground)
npm start
```

The server will start and print logs. Press `Ctrl+C` to stop.

### Option 2: Using start script

```bash
# Run the start script
./start.sh
```

### Option 3: Development mode (auto-reload)

```bash
# Watches for file changes and auto-restarts
npm run dev
```

## Available Scripts

- `npm start` - Start server in production mode
- `npm run dev` - Start with auto-reload on file changes
- `npm run start:mcp` - Start MCP stdio server (for Claude Desktop)
- `npm run serve` - Start using shell script

## Endpoints

Once running (default port 3000):

- **GET** `/health` - Health check
- **GET** `/api` - API information
- **GET** `/sse` - MCP over SSE (for n8n)
- **POST** `/message` - SSE message handler

## Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test SSE connection
curl -N http://localhost:3000/sse

# Get API info
curl http://localhost:3000/api
```

## Environment Variables

Create a `.env` file:

```bash
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id
PORT=3000
NODE_ENV=production
```

## Troubleshooting

### Server appears to exit immediately

The server is actually running! Check:

```bash
# Check if server is listening
lsof -i :3000

# Test if responding
curl http://localhost:3000/health
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Can't see logs

Make sure you're running in foreground:

```bash
npm start
# Or
./start.sh
```

NOT in background:

```bash
npm start &  # This runs in background
```

## For n8n Integration

Configure n8n MCP Client:

- **Endpoint**: `http://localhost:3000/sse` (or your deployed URL)
- **Transport**: HTTP Streamable
- **Auth**: None
- **Tools**: All

## Available MCP Tools

1. **`ping`** - Test connection
2. **`get_dropoff_quote`** - Get delivery quotes
3. **`track_order`** - Track order status

## Logs

The server logs will show:

```
Senpex MCP Server running on port 3000
Health check: http://localhost:3000/health
API info: http://localhost:3000/api
SSE endpoint: http://localhost:3000/sse
```

If you see these logs, **the server is running successfully!**

## Stopping the Server

- **Foreground**: Press `Ctrl+C`
- **Background**: `pkill -f "node server.js"`
- **Find PID**: `lsof -i :3000` then `kill <PID>`



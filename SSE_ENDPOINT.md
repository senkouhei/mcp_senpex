# SSE (Server-Sent Events) Endpoint

## Overview

The Senpex MCP Server now includes a **Server-Sent Events (SSE)** endpoint for real-time streaming connections. This allows clients to receive live updates and messages from the MCP server over a persistent HTTP connection.

## Endpoint

**GET** `/sse`

## What is SSE?

Server-Sent Events (SSE) is a standard for servers to push data to web clients over HTTP. Unlike WebSockets, SSE:
- Uses regular HTTP (works through most proxies and firewalls)
- Is unidirectional (server → client only)
- Automatically reconnects on connection loss
- Simple to implement and debug

## Features

✅ **Real-time Updates**: Receive live messages from the MCP server  
✅ **Automatic Reconnection**: Browser automatically reconnects if connection is lost  
✅ **Heartbeat**: Regular heartbeat messages to keep connection alive  
✅ **JSON Streaming**: Structured JSON messages for easy parsing  
✅ **Cross-Origin Support**: CORS enabled for cross-domain requests  

## Message Types

The SSE endpoint sends different types of messages:

### 1. Connection Message
Sent immediately upon connection establishment.

```json
{
  "type": "connection",
  "status": "connected",
  "timestamp": "2025-12-15T18:00:00.000Z"
}
```

### 2. Heartbeat Message
Sent every 30 seconds to keep the connection alive.

```json
{
  "type": "heartbeat",
  "timestamp": "2025-12-15T18:00:30.000Z"
}
```

### 3. Data Messages
MCP server output and responses.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [...]
  }
}
```

### 4. Error Messages
Any errors from the MCP server process.

```json
{
  "type": "error",
  "message": "Error details here"
}
```

### 5. Close Message
Sent when the connection is closing.

```json
{
  "type": "close",
  "code": 0
}
```

### 6. Raw Messages
Non-JSON output from MCP server.

```json
{
  "type": "raw",
  "content": "Raw message content"
}
```

## Usage Examples

### JavaScript (Browser)

```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3000/sse');

// Handle connection open
eventSource.onopen = () => {
  console.log('Connected to MCP server');
};

// Handle incoming messages
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  switch(data.type) {
    case 'connection':
      console.log('Connection established');
      break;
    case 'heartbeat':
      console.log('Heartbeat received');
      break;
    case 'error':
      console.error('Error:', data.message);
      break;
    default:
      console.log('Data:', data);
  }
};

// Handle errors
eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  eventSource.close();
};

// Close connection when done
// eventSource.close();
```

### Node.js

```javascript
import EventSource from 'eventsource';

const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

eventSource.onerror = (error) => {
  console.error('Error:', error);
};
```

### cURL

```bash
# Stream events
curl -N http://localhost:3000/sse

# Output format:
# data: {"type":"connection","status":"connected","timestamp":"..."}
#
# data: {"type":"heartbeat","timestamp":"..."}
#
```

### Python

```python
import requests
import json

url = 'http://localhost:3000/sse'

with requests.get(url, stream=True) as response:
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = json.loads(line[6:])
                print(f"Received: {data}")
```

## Demo Page

A live demo is available at:

**URL**: `http://localhost:3000/sse-demo.html`

The demo page shows:
- Real-time connection status
- All incoming messages
- Message count and connection time
- Interactive connect/disconnect controls

## Configuration

### Server Settings

The SSE endpoint automatically:
- Sets appropriate headers (`Content-Type: text/event-stream`)
- Disables caching
- Enables keep-alive
- Handles client disconnection gracefully

### Environment Variables

Same as the main server:
- `SENPEX_CLIENT_ID`: Your Senpex API client ID
- `SENPEX_SECRET_ID`: Your Senpex API secret ID
- `PORT`: Server port (default: 3000)

## Use Cases

### 1. Real-Time Monitoring
Monitor MCP server activity in real-time:
```javascript
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateDashboard(data);
};
```

### 2. Live Logging
Stream MCP server logs to a web dashboard:
```javascript
const logContainer = document.getElementById('logs');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  logContainer.innerHTML += `<div>${JSON.stringify(data)}</div>`;
};
```

### 3. Status Updates
Get real-time status updates for long-running operations:
```javascript
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'heartbeat') {
    updateConnectionStatus('Connected');
  }
};
```

### 4. Debugging
Debug MCP server behavior in real-time:
```javascript
eventSource.onmessage = (event) => {
  console.log('[DEBUG]', event.data);
};
```

## Browser Compatibility

SSE is supported by all modern browsers:
- ✅ Chrome 6+
- ✅ Firefox 6+
- ✅ Safari 5+
- ✅ Edge 79+
- ✅ Opera 11+

**Note**: Internet Explorer does not support SSE. Use polyfills if IE support is needed.

## Technical Details

### Connection Lifecycle

1. **Client connects** to `/sse` endpoint
2. **Server spawns** MCP process for this connection
3. **Server sends** connection message
4. **Server streams** MCP output as SSE messages
5. **Server sends** heartbeat every 30 seconds
6. **Client disconnects** or connection lost
7. **Server cleans up** MCP process

### Performance

- **Concurrent connections**: Supports multiple simultaneous SSE connections
- **Memory usage**: Each connection spawns a separate MCP process
- **Reconnection**: Browser automatically reconnects with exponential backoff
- **Timeout**: No server-side timeout; connection stays open until client disconnects

### Security

- CORS enabled for cross-origin requests
- No authentication required (add if needed)
- Environment variables passed to MCP process
- Client can only receive data (no command injection risk)

## Troubleshooting

### Connection Immediately Closes

**Problem**: Connection opens and immediately closes.

**Solution**:
- Check server logs for errors
- Verify MCP process can start (`node index.js`)
- Check environment variables are set

### No Messages Received

**Problem**: Connection stays open but no messages arrive.

**Solution**:
- Check MCP server is producing output
- Verify JSON parsing is working
- Look for errors in browser console

### Connection Keeps Reconnecting

**Problem**: Browser repeatedly connects and disconnects.

**Solution**:
- Check for server errors
- Verify server is not crashing
- Check network connection

### Missing Heartbeats

**Problem**: Heartbeat messages not received.

**Solution**:
- Connection may be closed by proxy/firewall
- Check if connection is still active
- Verify heartbeat interval (default 30s)

## Comparison with Other Endpoints

| Feature | SSE `/sse` | HTTP `/mcp/tools/:toolName` | Chat `/chat` |
|---------|------------|----------------------------|--------------|
| Real-time | ✅ Yes | ❌ No | ❌ No |
| Streaming | ✅ Yes | ❌ No | ❌ No |
| Persistent | ✅ Yes | ❌ No | ❌ No |
| Request/Response | ❌ No | ✅ Yes | ✅ Yes |
| AI Agent | ❌ No | ❌ No | ✅ Yes |

## Advanced Usage

### Custom Event Handling

```javascript
// Listen for specific event types
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connection') {
    handleConnection(data);
  } else if (data.type === 'heartbeat') {
    handleHeartbeat(data);
  } else if (data.type === 'error') {
    handleError(data);
  }
});
```

### Automatic Reconnection

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectSSE() {
  const eventSource = new EventSource('/sse');
  
  eventSource.onerror = () => {
    eventSource.close();
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      setTimeout(connectSSE, 1000 * reconnectAttempts);
    }
  };
  
  eventSource.onopen = () => {
    reconnectAttempts = 0;
  };
}

connectSSE();
```

### Connection Monitoring

```javascript
let lastHeartbeat = Date.now();

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'heartbeat') {
    lastHeartbeat = Date.now();
  }
};

// Check for stale connection
setInterval(() => {
  const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
  if (timeSinceLastHeartbeat > 60000) {
    console.warn('Connection may be stale');
    eventSource.close();
  }
}, 10000);
```

## Related Endpoints

- **GET** `/` - Chat interface
- **GET** `/api` - API information
- **GET** `/health` - Health check
- **GET** `/mcp/tools` - List available tools
- **POST** `/mcp/tools/:toolName` - Execute MCP tool
- **POST** `/chat` - Chat with AI agent
- **GET** `/sse-demo.html` - SSE demo page

## Future Enhancements

Potential improvements:
- [ ] Named event types for filtering
- [ ] Authentication/authorization
- [ ] Rate limiting per connection
- [ ] Compression support
- [ ] Custom heartbeat interval
- [ ] Connection pooling
- [ ] Message filtering options

## Support

For issues or questions about the SSE endpoint:
1. Check this documentation
2. Try the demo page at `/sse-demo.html`
3. Review server logs
4. Test with cURL or browser dev tools

## License

MIT License - See LICENSE file for details


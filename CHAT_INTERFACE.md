# Chat Interface Guide

## Overview
The Senpex MCP Server now includes a beautiful, interactive chat interface that allows users to interact with the AI agent using natural language. The AI agent intelligently parses user requests and calls the appropriate MCP tools.

## Features

### 🎨 Modern UI
- Beautiful gradient design
- Smooth animations
- Responsive layout
- Typing indicators
- Message history

### 🤖 Intelligent AI Agent
- Natural language processing
- Automatic tool selection
- Location extraction from text
- Order ID detection
- Context-aware responses

### 🔧 MCP Tool Integration
The AI agent can automatically call these MCP tools based on user requests:
- `get_dropoff_quote` - Get delivery quotes
- `track_order` - Track order status
- `create_order` - Create delivery orders
- `get_driver_location` - Get driver location

## Accessing the Chat Interface

### Local Development
1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Deployed on Render
Once deployed, access the chat interface at your Render URL:
```
https://your-app.onrender.com
```

## How to Use

### Example Queries

#### Getting Delivery Quotes
```
"Get a delivery quote from San Francisco to Los Angeles"
"How much to send a package from 123 Market St, SF to 456 Main St, LA?"
"Calculate delivery cost from downtown to the airport"
```

#### Tracking Orders
```
"Track order 12345"
"Where is my order #ABC123?"
"What's the status of order 98765?"
```

#### General Questions
```
"What services do you offer?"
"What can you help me with?"
"Show me available tools"
```

## API Endpoints

### Chat Endpoint
**POST** `/chat`

Request:
```json
{
  "message": "Get a quote from San Francisco to Los Angeles"
}
```

Response:
```json
{
  "response": "I'll get you a delivery quote...",
  "toolCalls": [
    {
      "name": "get_dropoff_quote",
      "result": "{ ... quote details ... }"
    }
  ]
}
```

### Other Endpoints
- **GET** `/` - Chat interface (HTML)
- **GET** `/api` - API information
- **GET** `/health` - Health check
- **GET** `/mcp/tools` - List available MCP tools
- **POST** `/mcp/tools/:toolName` - Call a specific MCP tool

## AI Agent Intelligence

The AI agent uses pattern matching and natural language understanding to:

1. **Extract Information**: Automatically extracts locations, order IDs, and other relevant data from user messages

2. **Select Tools**: Intelligently chooses which MCP tools to call based on user intent

3. **Format Responses**: Provides clear, user-friendly responses with tool results

4. **Handle Errors**: Gracefully handles errors and provides helpful feedback

## Location Extraction

The agent can understand locations in multiple formats:

```
✅ "from San Francisco to Los Angeles"
✅ "123 Market St, San Francisco, CA to 456 Main St, Los Angeles, CA"
✅ "pickup at downtown SF, dropoff at LAX"
```

## Order ID Detection

The agent recognizes order IDs in various formats:

```
✅ "Track order 12345"
✅ "Order #ABC123"
✅ "Where is 98765?"
```

## Customization

### Styling
Edit `/public/index.html` to customize:
- Colors and gradients
- Layout and spacing
- Fonts and typography
- Animations

### AI Logic
Edit `server.js` functions to customize:
- `analyzeMessage()` - Message parsing logic
- `extractLocations()` - Location extraction
- `extractOrderId()` - Order ID detection
- `generateResponse()` - Response generation

## Environment Variables

To enable actual Senpex API calls, set:

```bash
SENPEX_CLIENT_ID=your_client_id
SENPEX_SECRET_ID=your_secret_id
PORT=3000  # Optional, defaults to 3000
```

## Technical Details

### Stack
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (no frameworks)
- **MCP Integration**: @modelcontextprotocol/sdk
- **API**: Senpex Delivery API

### Architecture
```
User Message → Chat Endpoint → AI Agent Analysis → MCP Tool Selection → Tool Execution → Response
```

### Message Flow
1. User sends message via chat interface
2. Server analyzes message intent
3. Extracts relevant parameters (locations, IDs, etc.)
4. Selects and calls appropriate MCP tools
5. Formats results for user display
6. Returns response with tool call results

## Troubleshooting

### Server Won't Start
```bash
# Check if port is already in use
lsof -i :3000

# Use a different port
PORT=3001 npm start
```

### API Credentials Error
Make sure environment variables are set:
```bash
export SENPEX_CLIENT_ID=your_client_id
export SENPEX_SECRET_ID=your_secret_id
```

### Chat Not Loading
- Check browser console for errors
- Verify server is running on correct port
- Check network tab for failed requests

## Future Enhancements

Potential improvements:
- [ ] Add user authentication
- [ ] Store chat history
- [ ] Support file uploads
- [ ] Add voice input
- [ ] Multi-language support
- [ ] Real-time order tracking updates
- [ ] Integration with OpenAI/Claude for better NLP

## Contributing

To add new capabilities:

1. Add new tool handlers in `index.js`
2. Update `analyzeMessage()` in `server.js` to recognize new intents
3. Add UI elements in `public/index.html` as needed

## License

MIT License - See LICENSE file for details


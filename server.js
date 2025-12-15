#!/usr/bin/env node

/**
 * HTTP Wrapper for Senpex MCP Server
 * This allows the MCP server to be deployed on platforms like Render
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "senpex-mcp-server", version: "1.0.0" });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "Senpex MCP Server",
    version: "1.0.0",
    description: "MCP Server for Senpex Delivery API",
    endpoints: {
      health: "/health",
      api: "/api",
      chat: "/chat (POST)",
      sse: "/sse (GET - Server-Sent Events)",
      mcp_tools: "/mcp/tools (GET)",
      mcp_tool_call: "/mcp/tools/:toolName (POST)",
    },
    note: "This is an HTTP wrapper. For MCP stdio usage, run index.js directly with Node.js",
  });
});

// MCP tool execution endpoint
app.post("/mcp/tools/:toolName", async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  try {
    // Spawn the MCP server process
    const mcpProcess = spawn("node", [join(__dirname, "index.js")], {
      env: process.env,
    });

    let output = "";
    let errorOutput = "";

    // Prepare the request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    };

    // Send request to MCP server
    mcpProcess.stdin.write(JSON.stringify(request) + "\n");
    mcpProcess.stdin.end();

    // Collect output
    mcpProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // Handle process completion
    mcpProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: "MCP process failed",
          stderr: errorOutput,
        });
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (e) {
        res.json({ output, raw: true });
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// SSE endpoint for MCP streaming
app.get("/sse", (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connection", status: "connected", timestamp: new Date().toISOString() })}\n\n`);

  // Spawn MCP server process for this connection
  const mcpProcess = spawn("node", [join(__dirname, "index.js")], {
    env: process.env,
  });

  let messageBuffer = "";

  // Handle MCP server output
  mcpProcess.stdout.on("data", (data) => {
    messageBuffer += data.toString();
    
    // Try to parse complete JSON messages
    const lines = messageBuffer.split("\n");
    messageBuffer = lines.pop() || ""; // Keep incomplete line in buffer
    
    lines.forEach((line) => {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          res.write(`data: ${JSON.stringify(message)}\n\n`);
        } catch (e) {
          // Not JSON, send as raw message
          res.write(`data: ${JSON.stringify({ type: "raw", content: line })}\n\n`);
        }
      }
    });
  });

  mcpProcess.stderr.on("data", (data) => {
    res.write(`data: ${JSON.stringify({ type: "error", message: data.toString() })}\n\n`);
  });

  mcpProcess.on("close", (code) => {
    res.write(`data: ${JSON.stringify({ type: "close", code })}\n\n`);
    res.end();
  });

  // Handle client disconnect
  req.on("close", () => {
    mcpProcess.kill();
  });

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
});

// List available tools
app.get("/mcp/tools", async (req, res) => {
  try {
    const mcpProcess = spawn("node", [join(__dirname, "index.js")], {
      env: process.env,
    });

    let output = "";

    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    };

    mcpProcess.stdin.write(JSON.stringify(request) + "\n");
    mcpProcess.stdin.end();

    mcpProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    mcpProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({
          error: "Failed to list tools",
        });
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (e) {
        res.json({ output, raw: true });
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// AI Chat endpoint
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Analyze the message and determine which tools to call
    const analysis = analyzeMessage(message);
    const toolCalls = [];
    let response = "";

    // If tools should be called
    if (analysis.tools.length > 0) {
      for (const toolInfo of analysis.tools) {
        try {
          const mcpProcess = spawn("node", [join(__dirname, "index.js")], {
            env: process.env,
          });

          let output = "";
          const request = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: toolInfo.name,
              arguments: toolInfo.args,
            },
          };

          mcpProcess.stdin.write(JSON.stringify(request) + "\n");
          mcpProcess.stdin.end();

          await new Promise((resolve, reject) => {
            mcpProcess.stdout.on("data", (data) => {
              output += data.toString();
            });

            mcpProcess.on("close", (code) => {
              if (code === 0) {
                try {
                  const result = JSON.parse(output);
                  toolCalls.push({
                    name: toolInfo.name,
                    result: JSON.stringify(result.result || result, null, 2),
                  });
                  resolve();
                } catch (e) {
                  toolCalls.push({
                    name: toolInfo.name,
                    result: output,
                  });
                  resolve();
                }
              } else {
                reject(new Error("Tool execution failed"));
              }
            });
          });
        } catch (error) {
          toolCalls.push({
            name: toolInfo.name,
            result: `Error: ${error.message}`,
          });
        }
      }

      response = analysis.response;
    } else {
      // General response without tool calls
      response = generateResponse(message, analysis);
    }

    res.json({
      response,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      response: "I'm sorry, I encountered an error processing your request.",
    });
  }
});

// AI Message Analysis Function
function analyzeMessage(message) {
  const lowerMessage = message.toLowerCase();
  const tools = [];
  let response = "";

  // Quote/Price inquiry
  if (
    lowerMessage.match(
      /(quote|price|cost|how much|estimate|calculate|delivery|ship|send)/i
    )
  ) {
    // Try to extract locations
    const locations = extractLocations(message);

    if (locations.pickup && locations.dropoff) {
      tools.push({
        name: "get_dropoff_quote",
        args: {
          user_email: "demo@example.com",
          pickup_addr: locations.pickup,
          dropoff_addr: locations.dropoff,
          order_name: "Delivery Quote Request",
          recipient_name: "Recipient",
          recipient_phone: "+1234567890",
        },
      });
      response = `I'll get you a delivery quote from ${locations.pickup} to ${locations.dropoff}. Here's what I found:`;
    } else {
      response =
        "I can help you get a delivery quote! Please provide the pickup and dropoff locations. For example: 'Get a quote from 123 Market St, San Francisco, CA to 456 Main St, Los Angeles, CA'";
    }
  }
  // Track order
  else if (lowerMessage.match(/(track|status|where is|find order|order status)/i)) {
    const orderId = extractOrderId(message);
    if (orderId) {
      tools.push({
        name: "track_order",
        args: {
          order_id: orderId,
        },
      });
      response = `Let me track order ${orderId} for you:`;
    } else {
      response =
        "I can help you track your order! Please provide the order ID. For example: 'Track order 12345'";
    }
  }
  // List services
  else if (lowerMessage.match(/(services|what do you|capabilities|can you|help)/i)) {
    response = `I'm your Senpex AI assistant! I can help you with:

🚚 **Delivery Services:**
- Get instant delivery quotes
- Create delivery orders
- Track existing orders
- Calculate delivery costs

📦 **Package Options:**
- Small packages
- Medium packages
- Large packages
- Express delivery (ASAP)
- Scheduled delivery

💰 **Pricing:**
- Instant quotes based on distance
- Multiple payment options
- Transparent pricing

🔧 **Available Tools:**
- get_dropoff_quote: Get delivery quotes
- track_order: Track order status
- create_order: Create new delivery orders
- get_driver_location: Get real-time driver location

Just ask me naturally! For example:
- "Get a quote from San Francisco to Los Angeles"
- "Track my order 12345"
- "How much does delivery cost?"`;
  }
  // List tools
  else if (lowerMessage.match(/(tools|functions|commands|what can you do)/i)) {
    response = `I have access to these MCP tools:

🔧 **get_dropoff_quote** - Get delivery price quotes
   Parameters: pickup address, dropoff address, user email

📍 **track_order** - Track order status and location
   Parameters: order_id

📦 **create_order** - Create a new delivery order
   Parameters: pickup/dropoff details, recipient info

🚗 **get_driver_location** - Get real-time driver location
   Parameters: order_id

You can ask me in natural language and I'll use the appropriate tools!`;
  }
  // Default response
  else {
    response = `I'm here to help with Senpex delivery services! I can:

- Get delivery quotes
- Track orders
- Create delivery orders
- Check driver locations

What would you like to do?`;
  }

  return { tools, response };
}

// Helper: Extract locations from message
function extractLocations(message) {
  const locations = { pickup: null, dropoff: null };

  // Pattern: "from X to Y"
  const fromToPattern = /from\s+([^to]+?)\s+to\s+(.+?)(?:\.|$)/i;
  const match = message.match(fromToPattern);

  if (match) {
    locations.pickup = match[1].trim();
    locations.dropoff = match[2].trim();
  } else {
    // Try to find address patterns
    const addressPattern = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)[,\s]+[\w\s]+,\s*[A-Z]{2}/gi;
    const addresses = message.match(addressPattern);
    if (addresses && addresses.length >= 2) {
      locations.pickup = addresses[0];
      locations.dropoff = addresses[1];
    }
  }

  return locations;
}

// Helper: Extract order ID from message
function extractOrderId(message) {
  const patterns = [
    /order[:\s]+([A-Z0-9-]+)/i,
    /#([A-Z0-9-]+)/,
    /\b([0-9]{5,})\b/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Helper: Generate response
function generateResponse(message, analysis) {
  return analysis.response || "I'm not sure how to help with that. Could you please rephrase your question?";
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Senpex MCP HTTP Wrapper running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/`);
  console.log(`MCP tools: http://localhost:${PORT}/mcp/tools`);
});

export default app;


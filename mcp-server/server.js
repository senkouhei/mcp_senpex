#!/usr/bin/env node

/**
 * HTTP Wrapper for Senpex MCP Server
 * Provides SSE endpoint for n8n and HTTP endpoints for Agent API
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMCPServer } from "./mcp-server.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
      sse: "/sse (GET - MCP over SSE for n8n)",
      message: "/message (POST - SSE message handler)",
    },
    n8n_config: {
      endpoint: `${process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000'}/sse`,
      transport: "HTTP Streamable",
      authentication: "None"
    },
    tools: ["ping", "get_dropoff_quote", "track_order"],
    note: "For n8n MCP Client: Use /sse endpoint with HTTP Streamable transport",
  });
});

// SSE endpoint for MCP (for n8n)
app.get("/sse", async (req, res) => {
  console.log("SSE connection established from:", req.ip);
  
  try {
    const mcpServer = createMCPServer();
    const transport = new SSEServerTransport("/message", res);
    await mcpServer.connect(transport);
    console.log("MCP server connected via SSE");
  } catch (error) {
    console.error("SSE connection error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Message endpoint for SSE (required by SSEServerTransport)
app.post("/message", async (req, res) => {
  res.status(200).send();
});

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
  console.log(`Senpex MCP Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API info: http://localhost:${PORT}/api`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});

export default app;



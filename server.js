#!/usr/bin/env node

/**
 * HTTP Wrapper for Senpex MCP Server
 * This allows the MCP server to be deployed on platforms like Render
 */

import express from "express";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "senpex-mcp-server", version: "1.0.0" });
});

// Root endpoint with API info
app.get("/", (req, res) => {
  res.json({
    name: "Senpex MCP Server",
    version: "1.0.0",
    description: "MCP Server for Senpex Delivery API",
    endpoints: {
      health: "/health",
      info: "/",
      mcp: "/mcp",
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


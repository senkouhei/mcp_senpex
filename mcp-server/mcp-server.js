/**
 * Shared MCP Server Configuration
 * Used by both stdio (index.js) and SSE (server.js) transports
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Senpex API Constants
const SENPEX_API_BASE = "https://api.sandbox.senpex.com/api/restfull/v4";
const SENPEX_CLIENT_ID = process.env.SENPEX_CLIENT_ID || "";
const SENPEX_SECRET_ID = process.env.SENPEX_SECRET_ID || "";

// Helper function to make Senpex API requests
async function senpexRequest(method, endpoint, data = null) {
  const headers = {
    clientid: SENPEX_CLIENT_ID,
    secretid: SENPEX_SECRET_ID,
    "Content-Type": "application/json",
  };

  if (endpoint.includes("/orders/")) {
    headers.Country = "US";
  }

  const config = {
    method,
    url: `${SENPEX_API_BASE}${endpoint}`,
    headers,
    timeout: 30000,
  };

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    }
    throw error;
  }
}

// Tool handlers
async function handleGetDropoffQuote(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured. Please set SENPEX_CLIENT_ID and SENPEX_SECRET_ID environment variables.";
  }

  const body = {
    email: args.user_email,
    order_name: args.order_name || "Delivery Order",
    pack_from_text: args.pickup_addr,
    transport_id: args.transport_id || 1,
    item_value: args.item_value || 100.0,
    pack_size_id: args.pack_size_id || 1,
    taken_asap: args.taken_asap !== undefined ? args.taken_asap : 1,
    payment_type: args.payment_type || 5,
    order_desc: args.order_desc || "Package delivery",
    route_desc: args.pickup_instructions || "",
    routes: [
      {
        route_to_text: args.dropoff_addr,
        route_desc: args.dropoff_instructions || "",
        rec_name: args.recipient_name || "Recipient",
        rec_phone: args.recipient_phone || "+1234567890",
      },
    ],
  };

  try {
    const data = await senpexRequest("POST", "/orders/dropoff/quote", body);

    if (data.data) {
      const quoteData = data.data;
      let result = `Senpex Delivery Quote:
Order: ${args.order_name || "Delivery Order"}
Pickup: ${args.pickup_addr}
Dropoff: ${args.dropoff_addr}

`;
      if (quoteData.price) result += `Price: $${quoteData.price}\n`;
      if (quoteData.distance) result += `Distance: ${quoteData.distance} miles\n`;
      if (quoteData.duration)
        result += `Estimated Duration: ${quoteData.duration} mins\n`;
      if (quoteData.token) result += `Quote Token: ${quoteData.token}\n`;

      return result;
    }
    return `Quote response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting quote: ${error.message}`;
  }
}

async function handleTrackOrder(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/orders/${args.order_id}`);
    
    if (data.data) {
      const order = data.data;
      return `Order Status: ${order.status || 'Unknown'}
Order ID: ${args.order_id}
${order.driver_name ? `Driver: ${order.driver_name}` : ''}
${order.driver_phone ? `Driver Phone: ${order.driver_phone}` : ''}
${order.current_location ? `Current Location: ${order.current_location}` : ''}`;
    }
    return `Order data: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error tracking order: ${error.message}`;
  }
}

// Create and configure MCP server
export function createMCPServer() {
  const server = new Server(
    {
      name: "senpex-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_dropoff_quote",
          description:
            "Get a delivery quote from one pickup location to one dropoff location",
          inputSchema: {
            type: "object",
            properties: {
              user_email: {
                type: "string",
                description: "Customer email address",
              },
              pickup_addr: {
                type: "string",
                description: "Pickup address (full address with city, state)",
              },
              dropoff_addr: {
                type: "string",
                description: "Dropoff address (full address with city, state)",
              },
              recipient_name: {
                type: "string",
                description: "Recipient name at dropoff location",
              },
              recipient_phone: {
                type: "string",
                description: "Recipient phone number",
              },
              order_name: {
                type: "string",
                description: "Name/description of the order",
              },
              transport_id: {
                type: "number",
                description: "Vehicle type: 1=Car, 3=SUV, 8=Pickup, 9=Van",
              },
              pack_size_id: {
                type: "number",
                description: "Package size: 1=Small, 2=Medium, 3=Large, 4=Heavy",
              },
              taken_asap: {
                type: "number",
                description: "1 for ASAP delivery, 0 for scheduled",
              },
            },
            required: ["user_email", "pickup_addr", "dropoff_addr"],
          },
        },
        {
          name: "track_order",
          description: "Track an existing order by order ID",
          inputSchema: {
            type: "object",
            properties: {
              order_id: {
                type: "string",
                description: "The order ID to track",
              },
            },
            required: ["order_id"],
          },
        },
        {
          name: "ping",
          description: "Test MCP connection",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      switch (name) {
        case "get_dropoff_quote":
          result = await handleGetDropoffQuote(args);
          break;

        case "track_order":
          result = await handleTrackOrder(args);
          break;

        case "ping":
          result = "pong from Senpex MCP server";
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}



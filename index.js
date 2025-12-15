#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Senpex API Constants
const SENPEX_API_BASE = "https://api.sandbox.senpex.com/api/restfull/v4";
const SENPEX_CLIENT_ID = process.env.SENPEX_CLIENT_ID || "";
const SENPEX_SECRET_ID = process.env.SENPEX_SECRET_ID || "";

// Create server instance
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
      throw new Error(`HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`);
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
      if (quoteData.duration) result += `Estimated Duration: ${quoteData.duration} mins\n`;
      if (quoteData.token) result += `Quote Token: ${quoteData.token}\n`;

      return result;
    }
    return `Quote response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting quote: ${error.message}`;
  }
}

async function handleGetPickupQuote(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  if (args.taken_asap === 0 && !args.schedule_date_local) {
    return "Error: schedule_date_local is required when taken_asap=0 (scheduled delivery)";
  }

  if (!args.pickup_addresses || args.pickup_addresses.length === 0) {
    return "Error: At least one pickup address is required";
  }

  const routes = args.pickup_addresses.map((pickup) => ({
    route_to_text: pickup.route_to_text || "",
    rec_name: pickup.rec_name || "",
    rec_phone: pickup.rec_phone || "",
    route_desc: pickup.route_desc || "",
  }));

  const body = {
    email: args.user_email,
    order_name: args.order_name,
    transport_id: args.transport_id || 1,
    item_value: args.item_value || 100.0,
    pack_size_id: args.pack_size_id || 1,
    taken_asap: args.taken_asap !== undefined ? args.taken_asap : 1,
    order_desc: args.order_desc || "Package pickup and delivery",
    route_desc: args.dropoff_instructions || "",
    rec_name: args.dropoff_recipient_name,
    rec_phone: args.dropoff_recipient_phone,
    routes: routes,
    show_one_price: args.show_one_price || 0,
  };

  if (args.schedule_date_local) {
    body.schedule_date_local = args.schedule_date_local;
  }

  if (args.promo_code) {
    body.promo_code = args.promo_code;
  }

  try {
    const data = await senpexRequest("POST", "/orders/pickup/quote", body);

    if (data.code === "0") {
      let result = `Senpex Pickup Quote:
Order: ${args.order_name}
Dropoff: ${args.dropoff_addr}
Pickup Locations: ${routes.length}

`;
      if (data.order_price) result += `Price: $${data.order_price}\n`;
      if (data.original_order_price && data.order_discount > 0) {
        result += `Original Price: $${data.original_order_price}\n`;
        result += `Discount: $${data.order_discount}\n`;
      }
      if (data.distance_miles) result += `Distance: ${data.distance_miles} miles\n`;
      if (data.distance_time_seconds) {
        result += `Estimated Duration: ${data.distance_time_seconds} seconds (${Math.floor(data.distance_time_seconds / 60)} minutes)\n`;
      }
      if (data.tariff_duration_mins) result += `Tariff Duration: ${data.tariff_duration_mins} minutes\n`;
      if (data.api_token) {
        result += `\nAPI Token: ${data.api_token}\n`;
        result += `Token Expires In: ${data.expire_mins || 60} minutes\n`;
      }
      if (data.promo_code_info) result += `Promo Code Applied: ${data.promo_code_info}\n`;

      if (data.routes_json) {
        result += `\nPickup Routes:\n`;
        data.routes_json.forEach((route, i) => {
          result += `  ${i + 1}. ${route.route_to_text}\n`;
          result += `     Recipient: ${route.route_rec_name} (${route.route_rec_phone})\n`;
          if (route.route_distance) result += `     Distance: ${route.route_distance} miles\n`;
        });
      }

      return result;
    }
    return `Quote response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting pickup quote: ${error.message}`;
  }
}

async function handleConfirmDropoff(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  const body = {
    api_token: args.api_token,
    email: args.user_email,
    payment_type: args.payment_type || 3,
    tip_amount: args.tip_amount || 0.0,
    snpx_user_email: args.snpx_user_email || 0,
    snpx_order_email: args.snpx_order_email !== undefined ? args.snpx_order_email : 1,
    snpx_order_not: args.snpx_order_not !== undefined ? args.snpx_order_not : 1,
    search_courier: args.search_courier !== undefined ? args.search_courier : 1,
  };

  if (args.sender_name) body.sender_name = args.sender_name;
  if (args.sender_cell) body.sender_cell = args.sender_cell;
  if (args.sender_desc) body.sender_desc = args.sender_desc;
  if (args.order_desc) body.order_desc = args.order_desc;

  if (args.recipient_name || args.recipient_phone) {
    const routes = [];
    const routeUpdate = {};
    if (args.recipient_name) routeUpdate.rec_name = args.recipient_name;
    if (args.recipient_phone) routeUpdate.rec_phone = args.recipient_phone;
    if (Object.keys(routeUpdate).length > 0) {
      routes.push(routeUpdate);
      body.routes = routes;
    }
  }

  try {
    const data = await senpexRequest("PUT", "/orders/dropoff", body);

    if (data.code === "0") {
      let result = "Order Confirmed Successfully!\n\n";

      if (data.inserted_id) result += `Order ID: ${data.inserted_id}\n`;
      if (data.distance) result += `Distance: ${data.distance} miles\n`;
      if (data.distance_time) {
        result += `Estimated Time: ${data.distance_time} seconds (${Math.floor(data.distance_time / 60)} minutes)\n`;
      }

      if (args.tip_amount > 0) result += `Tip Added: $${args.tip_amount}\n`;

      result += `\nYour order has been created and `;
      if (args.search_courier === 1 || args.search_courier === undefined) {
        result += "the system is now searching for a courier.";
      } else {
        result += "is waiting for manual courier assignment.";
      }

      return result;
    }
    return `Order creation response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error confirming order: ${error.message}`;
  }
}

async function handleConfirmPickup(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  const body = {
    api_token: args.api_token,
    email: args.user_email,
    tip_amount: args.tip_amount || 0.0,
    snpx_user_email: args.snpx_user_email || 0,
    snpx_order_email: args.snpx_order_email !== undefined ? args.snpx_order_email : 1,
    snpx_order_not: args.snpx_order_not !== undefined ? args.snpx_order_not : 1,
    search_courier: args.search_courier !== undefined ? args.search_courier : 1,
  };

  if (args.sender_name) body.sender_name = args.sender_name;
  if (args.sender_cell) body.sender_cell = args.sender_cell;
  if (args.sender_desc) body.sender_desc = args.sender_desc;
  if (args.order_desc) body.order_desc = args.order_desc;

  if (args.pickup_updates && args.pickup_updates.length > 0) {
    const routes = [];
    args.pickup_updates.forEach((update) => {
      const routeUpdate = {};
      if (update.rec_name) routeUpdate.rec_name = update.rec_name;
      if (update.rec_phone) routeUpdate.rec_phone = update.rec_phone;
      if (Object.keys(routeUpdate).length > 0) {
        routes.push(routeUpdate);
      }
    });
    if (routes.length > 0) body.routes = routes;
  }

  try {
    const data = await senpexRequest("PUT", "/orders/pickup", body);

    if (data.code === "0") {
      let result = "Pickup Order Confirmed Successfully!\n\n";

      if (data.inserted_id) result += `Order ID: ${data.inserted_id}\n`;
      if (data.distance) result += `Total Distance: ${data.distance} miles\n`;
      if (data.distance_time) {
        result += `Estimated Time: ${data.distance_time} seconds (${Math.floor(data.distance_time / 60)} minutes)\n`;
      }

      if (args.tip_amount > 0) result += `Tip Added: $${args.tip_amount}\n`;

      result += `\nYour pickup order has been created and `;
      if (args.search_courier === 1 || args.search_courier === undefined) {
        result += "the system is now searching for a courier.";
      } else {
        result += "is waiting for manual courier assignment.";
      }

      return result;
    }
    return `Order creation response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error confirming pickup order: ${error.message}`;
  }
}

async function handleGetOrderList(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  const start = args.start || 0;
  const endpoint = start > 0 ? `/order-list?start=${start}` : "/order-list";

  try {
    const data = await senpexRequest("GET", endpoint);

    if (data.code === "0" && data.data) {
      const orders = data.data;
      if (orders.length === 0) {
        return "No orders found.";
      }

      let result = `Orders List (starting from row ${start}):\n\n`;
      orders.forEach((order) => {
        result += `Order ID: ${order.id}\n`;
        result += `  Name: ${order.order_name}\n`;
        result += `  Status: ${order.order_status_text} (ID: ${order.pack_status})\n`;
        result += `  From: ${order.pack_from_text}\n`;
        result += `  To: ${order.last_pack_to_text}\n`;
        result += `  Recipient: ${order.last_receiver_name} (${order.last_receiver_phone_number})\n`;
        result += `  Price: $${order.pack_price}\n`;
        result += `  Distance: ${order.distance_miles} miles\n`;
        if (order.courier_name) {
          result += `  Courier: ${order.courier_name} ${order.courier_surname} (${order.courier_cell})\n`;
        }
        result += "\n";
      });

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting order list: ${error.message}`;
  }
}

async function handleGetRouteDetails(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/orders/routes/${args.route_id}`);

    if (data.code === "0" && data.data) {
      const routes = data.data;
      if (routes.length === 0) {
        return "No route details found.";
      }

      let result = `Route Details (ID: ${args.route_id}):\n\n`;
      routes.forEach((route) => {
        result += `Address: ${route.route_to_text}\n`;
        result += `Location: (${route.route_to_lat}, ${route.route_to_lng})\n`;
        result += `Recipient: ${route.rec_name}\n`;
        result += `Phone: ${route.rec_phone}\n`;
        result += `Status: ${route.route_status}\n`;
        result += `Distance: ${route.route_distance} miles\n`;
        result += `Travel Time: ${route.route_distance_time} seconds\n`;
        if (route.route_delivery_date) result += `Delivery Date: ${route.route_delivery_date}\n`;
        result += "\n";
      });

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting route details: ${error.message}`;
  }
}

async function handleGetOrderByToken(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/orders/tokens/${args.api_token}`);

    if (data.code === "0" && data.data) {
      const orders = data.data;
      if (orders.length === 0) {
        return "No order found with this token.";
      }

      const order = orders[0];
      let result = `Order Details (Token: ${args.api_token}):\n\n`;
      result += `Order ID: ${order.pack_id}\n`;
      result += `Order Name: ${order.order_name}\n`;
      result += `Price: $${order.order_price}\n`;
      result += `Original Price: $${order.original_order_price}\n`;
      result += `Discount: $${order.order_discount}\n`;
      result += `Tariff: ${order.tariff_name} - ${order.tariff_desc}\n`;
      result += `From: ${order.pack_from_text}\n`;
      result += `Distance: ${order.distance_miles} miles\n`;
      result += `Duration: ${order.distance_time_seconds} seconds\n`;
      result += `Route Count: ${order.route_count}\n`;
      result += `Package Size: ${order.pack_size_id}\n`;
      result += `Transport: ${order.transport_id}\n`;
      result += `Item Value: $${order.item_value}\n`;
      result += `Schedule Date: ${order.schedule_date}\n`;
      result += `Expires: ${order.expires_date}\n`;

      if (order.routes_json) {
        result += `\nRoutes:\n`;
        order.routes_json.forEach((route, i) => {
          result += `  ${i + 1}. ${route.route_to_text}\n`;
          result += `     Recipient: ${route.rec_name} (${route.rec_phone})\n`;
        });
      }

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting order by token: ${error.message}`;
  }
}

async function handleTrackOrderById(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/points/dropoff/track/${args.order_id}`);

    if (data.code === "0" && data.data) {
      const trackingItems = data.data;
      if (trackingItems.length === 0) {
        return "No tracking information found.";
      }

      let result = `Order Tracking (ID: ${args.order_id}):\n\n`;
      trackingItems.forEach((item) => {
        result += `Delivery ID: ${item.id}\n`;
        result += `Address: ${item.rec_address}\n`;
        result += `Recipient: ${item.rec_name}\n`;
        result += `Phone: ${item.rec_phone}\n`;
        result += `Pack Status: ${item.pack_status}\n`;
        result += `Route Status: ${item.route_status}\n`;

        if (item.courier_name) {
          result += `\nCourier Information:\n`;
          result += `  Name: ${item.courier_name} ${item.courier_surname}\n`;
          result += `  Phone: ${item.courier_cell}\n`;
        }

        if (item.last_lat && item.last_lng) {
          result += `\nLast Known Location:\n`;
          result += `  Coordinates: (${item.last_lat}, ${item.last_lng})\n`;
          result += `  Updated: ${item.last_location_date}\n`;
        }

        if (item.tracking_code) {
          result += `\nTracking Code: ${item.tracking_code}\n`;
        }

        result += "\n";
      });

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error tracking order: ${error.message}`;
  }
}

async function handleTrackOrderByAccessKey(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/points/dropoff/track/access_key/${args.access_key}`);

    if (data.code === "0" && data.data) {
      const trackingItems = data.data;
      if (trackingItems.length === 0) {
        return "No tracking information found.";
      }

      let result = `Order Tracking (Access Key: ${args.access_key}):\n\n`;
      trackingItems.forEach((item) => {
        result += `Delivery ID: ${item.id}\n`;
        result += `Address: ${item.rec_address}\n`;
        result += `Recipient: ${item.rec_name}\n`;
        result += `Phone: ${item.rec_phone}\n`;
        result += `Pack Status: ${item.pack_status}\n`;
        result += `Route Status: ${item.route_status}\n`;

        if (item.courier_name) {
          result += `\nCourier Information:\n`;
          result += `  Name: ${item.courier_name} ${item.courier_surname}\n`;
          result += `  Phone: ${item.courier_cell}\n`;
        }

        if (item.last_lat && item.last_lng) {
          result += `\nLast Known Location:\n`;
          result += `  Coordinates: (${item.last_lat}, ${item.last_lng})\n`;
          result += `  Updated: ${item.last_location_date}\n`;
        }

        if (item.tracking_code) {
          result += `\nTracking Code: ${item.tracking_code}\n`;
        }

        result += "\n";
      });

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error tracking order: ${error.message}`;
  }
}

async function handleGetDriverLocation(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("GET", `/orders/${args.order_id}/driver-location/`);

    if (data.code === "0") {
      const driverData = data.data;

      if (!driverData) {
        return `No driver assigned to order ${args.order_id} yet.`;
      }

      let result = `Driver Details for Order ${args.order_id}:\n\n`;

      if (driverData.pack_status) result += `Package Status: ${driverData.pack_status}\n`;
      if (driverData.order_status) result += `Order Status: ${driverData.order_status}\n`;

      result += "\n";

      if (driverData.courier_name || driverData.courier_surname) {
        result += `Driver: ${driverData.courier_name || ""} ${driverData.courier_surname || ""}\n`;
      }
      if (driverData.courier_phone_number) result += `Phone: ${driverData.courier_phone_number}\n`;

      result += "\n";

      if (driverData.last_lat && driverData.last_lng) {
        result += `Current Location:\n`;
        result += `  GPS Coordinates: (${driverData.last_lat}, ${driverData.last_lng})\n`;
        if (driverData.last_timezone) result += `  Timezone: ${driverData.last_timezone}\n`;
        if (driverData.last_location_date) result += `  Location Updated: ${driverData.last_location_date} (UTC)\n`;
        if (driverData.last_seen_date) result += `  Last Seen: ${driverData.last_seen_date} (UTC)\n`;
      } else {
        result += "Location: Not available yet\n";
      }

      result += "\n";

      result += "Notification Settings:\n";
      result += `  Email: ${driverData.snpx_email === 1 ? "Enabled" : "Disabled"}\n`;
      result += `  Push Notifications: ${driverData.snpx_nots === 1 ? "Enabled" : "Disabled"}\n`;
      result += `  SMS: ${driverData.snpx_sms === 1 ? "Enabled" : "Disabled"}\n`;
      result += `  Instant Notifications: ${driverData.snpx_instant_not === 1 ? "Enabled" : "Disabled"}\n`;

      if (driverData.instant_not_url) result += `  Instant Notification URL: ${driverData.instant_not_url}\n`;

      return result;
    }
    return `Response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error getting driver location: ${error.message}`;
  }
}

async function handleSetDeliveryReady(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("PUT", "/points/dropoff-delivery-ready", { id: args.order_id });

    if (data.code === "0") {
      if (data.inserted_id === -1) {
        return `Success: Order ${args.order_id} marked as ready for delivery.`;
      }
      return `Order status updated. Response: ${JSON.stringify(data)}`;
    }
    return `Error response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error setting delivery ready: ${error.message}`;
  }
}

async function handleSetLaboratoryReady(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("PUT", "/points/dropoff-laboratory-ready", { id: args.order_id });

    if (data.code === "0") {
      if (data.inserted_id === -1) {
        return `Success: Order ${args.order_id} marked as ready for pick-up from laboratory.`;
      }
      return `Order status updated. Response: ${JSON.stringify(data)}`;
    }
    return `Error response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error setting laboratory ready: ${error.message}`;
  }
}

async function handleSetDropoffReceived(args) {
  if (!SENPEX_CLIENT_ID || !SENPEX_SECRET_ID) {
    return "Error: Senpex API credentials not configured.";
  }

  try {
    const data = await senpexRequest("PUT", "/points/dropoff-received", { id: args.order_id });

    if (data.code === "0") {
      if (data.inserted_id === -1) {
        return `Success: Order ${args.order_id} marked as received at drop-off location.`;
      }
      return `Order status updated. Response: ${JSON.stringify(data)}`;
    }
    return `Error response: ${JSON.stringify(data)}`;
  } catch (error) {
    return `Error setting dropoff received: ${error.message}`;
  }
}

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_dropoff_quote",
        description:
          "Get quote price for pickup and dropoff delivery using Senpex API",
        inputSchema: {
          type: "object",
          properties: {
            user_email: { type: "string", description: "Email address of the user requesting the quote" },
            user_name: { type: "string", description: "Name of the user" },
            pickup_addr: { type: "string", description: "Pick-up address (full address string)" },
            dropoff_addr: { type: "string", description: "Drop-off address (full address string)" },
            recipient_name: { type: "string", description: "Name of the recipient", default: "Recipient" },
            recipient_phone: {
              type: "string",
              description: "Phone number of recipient with country code",
              default: "+1234567890",
            },
            order_name: { type: "string", description: "Name/title for the order", default: "Delivery Order" },
            transport_id: {
              type: "number",
              description: "Transport type ID (1=Car, 3=SUV, 8=Pickup Truck, 9=Large Van)",
              default: 1,
            },
            pack_size_id: {
              type: "number",
              description: "Package size ID (1=Small 1-25lbs, 2=Medium 26-50lbs, 3=Large 51-70lbs, 4=Heavy 71-150lbs)",
              default: 1,
            },
            item_value: { type: "number", description: "Declared value of items in USD", default: 100.0 },
            taken_asap: { type: "number", description: "1 for urgent/immediate delivery, 0 for scheduled", default: 1 },
            payment_type: { type: "number", description: "Payment type", default: 5 },
            order_desc: { type: "string", description: "Description of the package", default: "Package delivery" },
            pickup_instructions: { type: "string", description: "Special instructions for pickup", default: "" },
            dropoff_instructions: { type: "string", description: "Special instructions for dropoff", default: "" },
          },
          required: ["user_email", "user_name", "pickup_addr", "dropoff_addr"],
        },
      },
      {
        name: "get_pickup_quote",
        description:
          "Get quote price for multiple pickup addresses to one dropoff location using Senpex API (reverse logistics)",
        inputSchema: {
          type: "object",
          properties: {
            user_email: { type: "string", description: "Email address of the user requesting the quote" },
            order_name: { type: "string", description: "Name/title for the order" },
            dropoff_addr: { type: "string", description: "Drop-off address (final destination)" },
            dropoff_recipient_name: { type: "string", description: "Name of recipient at dropoff location" },
            dropoff_recipient_phone: { type: "string", description: "Phone number of recipient at dropoff" },
            pickup_addresses: {
              type: "array",
              description: "List of pickup locations",
              items: {
                type: "object",
                properties: {
                  route_to_text: { type: "string" },
                  rec_name: { type: "string" },
                  rec_phone: { type: "string" },
                  route_desc: { type: "string" },
                },
              },
            },
            transport_id: { type: "number", default: 1 },
            pack_size_id: { type: "number", default: 1 },
            item_value: { type: "number", default: 100.0 },
            taken_asap: { type: "number", default: 1 },
            schedule_date_local: { type: "string", default: "" },
            order_desc: { type: "string", default: "Package pickup and delivery" },
            dropoff_instructions: { type: "string", default: "" },
            show_one_price: { type: "number", default: 0 },
            promo_code: { type: "string", default: "" },
          },
          required: [
            "user_email",
            "order_name",
            "dropoff_addr",
            "dropoff_recipient_name",
            "dropoff_recipient_phone",
            "pickup_addresses",
          ],
        },
      },
      {
        name: "confirm_dropoff",
        description: "Confirm and create a new dropoff order using an API token from a quote request",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token received from get_dropoff_quote" },
            user_email: { type: "string", description: "Email of API account owner" },
            payment_type: { type: "number", default: 3 },
            tip_amount: { type: "number", default: 0.0 },
            sender_name: { type: "string", default: "" },
            sender_cell: { type: "string", default: "" },
            sender_desc: { type: "string", default: "" },
            order_desc: { type: "string", default: "" },
            recipient_name: { type: "string", default: "" },
            recipient_phone: { type: "string", default: "" },
            snpx_user_email: { type: "number", default: 0 },
            snpx_order_email: { type: "number", default: 1 },
            snpx_order_not: { type: "number", default: 1 },
            search_courier: { type: "number", default: 1 },
          },
          required: ["api_token", "user_email"],
        },
      },
      {
        name: "confirm_pickup",
        description: "Confirm and create a pickup order using an API token from get_pickup_quote",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "Token received from get_pickup_quote" },
            user_email: { type: "string", description: "Email of API account owner" },
            tip_amount: { type: "number", default: 0.0 },
            sender_name: { type: "string", default: "" },
            sender_cell: { type: "string", default: "" },
            sender_desc: { type: "string", default: "" },
            order_desc: { type: "string", default: "" },
            pickup_updates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rec_name: { type: "string" },
                  rec_phone: { type: "string" },
                },
              },
              default: [],
            },
            snpx_user_email: { type: "number", default: 0 },
            snpx_order_email: { type: "number", default: 1 },
            snpx_order_not: { type: "number", default: 1 },
            search_courier: { type: "number", default: 1 },
          },
          required: ["api_token", "user_email"],
        },
      },
      {
        name: "get_order_list",
        description: "Get a list of orders created for the account with pagination",
        inputSchema: {
          type: "object",
          properties: {
            start: { type: "number", description: "Starting row number", default: 0 },
          },
        },
      },
      {
        name: "get_route_details",
        description: "Get detailed information about a specific route",
        inputSchema: {
          type: "object",
          properties: {
            route_id: { type: "string", description: "The route ID to retrieve details for" },
          },
          required: ["route_id"],
        },
      },
      {
        name: "get_order_by_token",
        description: "Get order details using an API token from a previously created order",
        inputSchema: {
          type: "object",
          properties: {
            api_token: { type: "string", description: "The API token associated with the order" },
          },
          required: ["api_token"],
        },
      },
      {
        name: "track_order_by_id",
        description: "Track order status using order ID",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID to track" },
          },
          required: ["order_id"],
        },
      },
      {
        name: "track_order_by_access_key",
        description: "Track order status using access key",
        inputSchema: {
          type: "object",
          properties: {
            access_key: { type: "string", description: "The access key associated with the order" },
          },
          required: ["access_key"],
        },
      },
      {
        name: "get_driver_location",
        description: "Get driver/courier details and real-time location for a specific order",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID to get driver information for" },
          },
          required: ["order_id"],
        },
      },
      {
        name: "set_delivery_ready",
        description: "Mark an order as ready for delivery",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID to mark as ready for delivery" },
          },
          required: ["order_id"],
        },
      },
      {
        name: "set_laboratory_ready",
        description: "Change order status from 'Delivered to recipient' to 'Ready for pick-up'",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID to mark as ready for pickup from laboratory" },
          },
          required: ["order_id"],
        },
      },
      {
        name: "set_dropoff_received",
        description: "Change order status from 'Delivered to laboratory' to 'Drop-off received'",
        inputSchema: {
          type: "object",
          properties: {
            order_id: { type: "string", description: "The order ID to mark as received at drop-off location" },
          },
          required: ["order_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    let result;
    switch (name) {
      case "get_dropoff_quote":
        result = await handleGetDropoffQuote(args);
        break;
      case "get_pickup_quote":
        result = await handleGetPickupQuote(args);
        break;
      case "confirm_dropoff":
        result = await handleConfirmDropoff(args);
        break;
      case "confirm_pickup":
        result = await handleConfirmPickup(args);
        break;
      case "get_order_list":
        result = await handleGetOrderList(args);
        break;
      case "get_route_details":
        result = await handleGetRouteDetails(args);
        break;
      case "get_order_by_token":
        result = await handleGetOrderByToken(args);
        break;
      case "track_order_by_id":
        result = await handleTrackOrderById(args);
        break;
      case "track_order_by_access_key":
        result = await handleTrackOrderByAccessKey(args);
        break;
      case "get_driver_location":
        result = await handleGetDriverLocation(args);
        break;
      case "set_delivery_ready":
        result = await handleSetDeliveryReady(args);
        break;
      case "set_laboratory_ready":
        result = await handleSetLaboratoryReady(args);
        break;
      case "set_dropoff_received":
        result = await handleSetDropoffReceived(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Senpex MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});


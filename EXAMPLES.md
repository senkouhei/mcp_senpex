# Usage Examples

Complete examples for all Senpex MCP Server tools.

## Table of Contents

1. [Get Dropoff Quote](#1-get-dropoff-quote)
2. [Get Pickup Quote](#2-get-pickup-quote)
3. [Confirm Dropoff Order](#3-confirm-dropoff-order)
4. [Confirm Pickup Order](#4-confirm-pickup-order)
5. [Get Order List](#5-get-order-list)
6. [Track Order](#6-track-order)
7. [Get Driver Location](#7-get-driver-location)
8. [Update Order Status](#8-update-order-status)

---

## 1. Get Dropoff Quote

Get a price quote for a simple pickup and delivery.

### HTTP API

```bash
curl -X POST http://localhost:3000/mcp/tools/get_dropoff_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "john@example.com",
    "user_name": "John Doe",
    "pickup_addr": "123 Market St, San Francisco, CA 94103",
    "dropoff_addr": "456 Mission St, San Francisco, CA 94105",
    "recipient_name": "Jane Smith",
    "recipient_phone": "+14155551234",
    "order_name": "Office Supplies Delivery",
    "transport_id": 1,
    "pack_size_id": 2,
    "item_value": 150.00,
    "taken_asap": 1,
    "order_desc": "Box of office supplies",
    "pickup_instructions": "Ring doorbell, suite 201",
    "dropoff_instructions": "Leave with receptionist"
  }'
```

### Claude Desktop

```
Get me a delivery quote from 123 Market St, San Francisco to 456 Mission St, San Francisco. 
My email is john@example.com and I need to send office supplies worth $150.
```

### Expected Response

```
Senpex Delivery Quote:
Order: Office Supplies Delivery
Pickup: 123 Market St, San Francisco, CA 94103
Dropoff: 456 Mission St, San Francisco, CA 94105

Price: $18.50
Distance: 1.2 miles
Estimated Duration: 12 mins
Quote Token: abc123xyz789...
```

---

## 2. Get Pickup Quote

Get a quote for multiple pickups to one delivery location (reverse logistics).

### HTTP API

```bash
curl -X POST http://localhost:3000/mcp/tools/get_pickup_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "john@example.com",
    "order_name": "Multi-location Pickup",
    "dropoff_addr": "789 Howard St, San Francisco, CA 94103",
    "dropoff_recipient_name": "Warehouse Manager",
    "dropoff_recipient_phone": "+14155559999",
    "pickup_addresses": [
      {
        "route_to_text": "100 Pine St, San Francisco, CA 94111",
        "rec_name": "Store A",
        "rec_phone": "+14155551111",
        "route_desc": "Ask for manager"
      },
      {
        "route_to_text": "200 Oak St, San Francisco, CA 94102",
        "rec_name": "Store B",
        "rec_phone": "+14155552222",
        "route_desc": "Back entrance"
      },
      {
        "route_to_text": "300 Elm St, San Francisco, CA 94108",
        "rec_name": "Store C",
        "rec_phone": "+14155553333",
        "route_desc": "Loading dock"
      }
    ],
    "transport_id": 3,
    "pack_size_id": 3,
    "item_value": 500.00,
    "taken_asap": 0,
    "schedule_date_local": "2024-12-20 14:00",
    "order_desc": "Inventory collection from retail locations"
  }'
```

### Expected Response

```
Senpex Pickup Quote:
Order: Multi-location Pickup
Dropoff: 789 Howard St, San Francisco, CA 94103
Pickup Locations: 3

Price: $45.75
Distance: 8.5 miles
Estimated Duration: 2520 seconds (42 minutes)
Tariff Duration: 45 minutes

API Token: xyz789abc123...
Token Expires In: 60 minutes

Pickup Routes:
  1. 100 Pine St, San Francisco, CA 94111
     Recipient: Store A (+14155551111)
     Distance: 2.3 miles
  2. 200 Oak St, San Francisco, CA 94102
     Recipient: Store B (+14155552222)
     Distance: 3.1 miles
  3. 300 Elm St, San Francisco, CA 94108
     Recipient: Store C (+14155553333)
     Distance: 3.1 miles
```

---

## 3. Confirm Dropoff Order

Confirm and create an order using the token from a quote.

### HTTP API

```bash
curl -X POST http://localhost:3000/mcp/tools/confirm_dropoff \
  -H "Content-Type: application/json" \
  -d '{
    "api_token": "abc123xyz789...",
    "user_email": "john@example.com",
    "payment_type": 3,
    "tip_amount": 5.00,
    "sender_name": "John Doe",
    "sender_cell": "+14155550000",
    "sender_desc": "Will be waiting at lobby",
    "order_desc": "Handle with care",
    "search_courier": 1
  }'
```

### Expected Response

```
Order Confirmed Successfully!

Order ID: 12345
Distance: 1.2 miles
Estimated Time: 720 seconds (12 minutes)
Tip Added: $5.00

Your order has been created and the system is now searching for a courier.
```

---

## 4. Confirm Pickup Order

Confirm a pickup order with the token from get_pickup_quote.

### HTTP API

```bash
curl -X POST http://localhost:3000/mcp/tools/confirm_pickup \
  -H "Content-Type: application/json" \
  -d '{
    "api_token": "xyz789abc123...",
    "user_email": "john@example.com",
    "tip_amount": 10.00,
    "sender_name": "John Doe",
    "sender_cell": "+14155550000",
    "order_desc": "Pick up inventory from 3 locations",
    "search_courier": 1
  }'
```

### Expected Response

```
Pickup Order Confirmed Successfully!

Order ID: 12346
Total Distance: 8.5 miles
Estimated Time: 2520 seconds (42 minutes)
Tip Added: $10.00

Your pickup order has been created and the system is now searching for a courier.
```

---

## 5. Get Order List

List all your orders with pagination.

### HTTP API

```bash
# Get first 10 orders
curl http://localhost:3000/mcp/tools/get_order_list

# Get orders starting from row 10
curl -X POST http://localhost:3000/mcp/tools/get_order_list \
  -H "Content-Type: application/json" \
  -d '{"start": 10}'
```

### Expected Response

```
Orders List (starting from row 0):

Order ID: 12345
  Name: Office Supplies Delivery
  Status: In Transit (ID: 5)
  From: 123 Market St, San Francisco, CA 94103
  To: 456 Mission St, San Francisco, CA 94105
  Recipient: Jane Smith (+14155551234)
  Price: $18.50
  Distance: 1.2 miles
  Courier: Mike Johnson (4155559876)

Order ID: 12346
  Name: Multi-location Pickup
  Status: Pending (ID: 1)
  From: 789 Howard St, San Francisco, CA 94103
  To: 300 Elm St, San Francisco, CA 94108
  Recipient: Store C (+14155553333)
  Price: $45.75
  Distance: 8.5 miles
```

---

## 6. Track Order

### By Order ID

```bash
curl -X POST http://localhost:3000/mcp/tools/track_order_by_id \
  -H "Content-Type: application/json" \
  -d '{"order_id": "12345"}'
```

### By Access Key

```bash
curl -X POST http://localhost:3000/mcp/tools/track_order_by_access_key \
  -H "Content-Type: application/json" \
  -d '{"access_key": "acc_key_123"}'
```

### Expected Response

```
Order Tracking (ID: 12345):

Delivery ID: 67890
Address: 456 Mission St, San Francisco, CA 94105
Recipient: Jane Smith
Phone: +14155551234
Pack Status: 5
Route Status: in_transit

Courier Information:
  Name: Mike Johnson
  Phone: 4155559876

Last Known Location:
  Coordinates: (37.7879, -122.4075)
  Updated: 2024-12-15 14:32:15

Tracking Code: TRK123456789
```

---

## 7. Get Driver Location

Get real-time driver location and details for an order.

### HTTP API

```bash
curl -X POST http://localhost:3000/mcp/tools/get_driver_location \
  -H "Content-Type: application/json" \
  -d '{"order_id": "12345"}'
```

### Expected Response

```
Driver Details for Order 12345:

Package Status: 5
Order Status: in_transit

Driver: Mike Johnson
Phone: 4155559876

Current Location:
  GPS Coordinates: (37.7879, -122.4075)
  Timezone: America/Los_Angeles
  Location Updated: 2024-12-15 14:32:15 (UTC)
  Last Seen: 2024-12-15 14:32:20 (UTC)

Notification Settings:
  Email: Enabled
  Push Notifications: Enabled
  SMS: Enabled
  Instant Notifications: Enabled
```

---

## 8. Update Order Status

### Set Delivery Ready

Mark an order as ready for delivery.

```bash
curl -X POST http://localhost:3000/mcp/tools/set_delivery_ready \
  -H "Content-Type: application/json" \
  -d '{"order_id": "12345"}'
```

**Response:**
```
Success: Order 12345 marked as ready for delivery.
```

### Set Laboratory Ready

Change status from "Delivered to recipient" to "Ready for pick-up".

```bash
curl -X POST http://localhost:3000/mcp/tools/set_laboratory_ready \
  -H "Content-Type: application/json" \
  -d '{"order_id": "12345"}'
```

**Response:**
```
Success: Order 12345 marked as ready for pick-up from laboratory.
```

### Set Dropoff Received

Change status from "Delivered to laboratory" to "Drop-off received".

```bash
curl -X POST http://localhost:3000/mcp/tools/set_dropoff_received \
  -H "Content-Type: application/json" \
  -d '{"order_id": "12345"}'
```

**Response:**
```
Success: Order 12345 marked as received at drop-off location.
```

---

## Complete Workflow Example

Here's a complete workflow from quote to tracking:

### Step 1: Get Quote

```bash
QUOTE_RESPONSE=$(curl -s -X POST http://localhost:3000/mcp/tools/get_dropoff_quote \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "john@example.com",
    "user_name": "John Doe",
    "pickup_addr": "123 Market St, San Francisco, CA",
    "dropoff_addr": "456 Mission St, San Francisco, CA"
  }')

# Extract token from response
TOKEN=$(echo $QUOTE_RESPONSE | grep -o 'Quote Token: [^"]*' | cut -d' ' -f3)
echo "Quote Token: $TOKEN"
```

### Step 2: Confirm Order

```bash
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/mcp/tools/confirm_dropoff \
  -H "Content-Type: application/json" \
  -d "{
    \"api_token\": \"$TOKEN\",
    \"user_email\": \"john@example.com\",
    \"tip_amount\": 5.00
  }")

# Extract order ID
ORDER_ID=$(echo $ORDER_RESPONSE | grep -o 'Order ID: [0-9]*' | cut -d' ' -f3)
echo "Order ID: $ORDER_ID"
```

### Step 3: Track Order

```bash
curl -X POST http://localhost:3000/mcp/tools/track_order_by_id \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"$ORDER_ID\"}"
```

### Step 4: Get Driver Location

```bash
curl -X POST http://localhost:3000/mcp/tools/get_driver_location \
  -H "Content-Type: application/json" \
  -d "{\"order_id\": \"$ORDER_ID\"}"
```

---

## Error Handling Examples

### Invalid Credentials

```bash
# Response when SENPEX_CLIENT_ID or SENPEX_SECRET_ID is invalid
Error: HTTP 401 - {"code":"1","message":"Invalid credentials"}
```

### Missing Required Fields

```bash
# Response when required fields are missing
Error: user_email is required
```

### Invalid Token

```bash
# Response when api_token is invalid or expired
Error: HTTP 400 - {"code":"1","message":"Invalid or expired token"}
```

### No Driver Assigned

```bash
# Response when checking driver location before assignment
No driver assigned to order 12345 yet.
```

---

## Notes

- **Tokens expire in 60 minutes** after quote generation
- **One token = one order** (tokens cannot be reused)
- **Sandbox vs Production**: Update `SENPEX_API_BASE` in code for production
- **Rate Limiting**: Be mindful of API rate limits
- **Async Operations**: Some operations (like courier search) happen asynchronously

---

## Need More Help?

- **API Documentation**: [api.senpex.com/docs](https://api.senpex.com/docs)
- **Server README**: [README.md](README.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)


from typing import Any
import httpx
import os
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("weather")

# Constants
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"

# Senpex API Constants
SENPEX_API_BASE = "https://api.sandbox.senpex.com/api/restfull/v4"
SENPEX_CLIENT_ID = os.getenv("SENPEX_CLIENT_ID", "")
SENPEX_SECRET_ID = os.getenv("SENPEX_SECRET_ID", "")

@mcp.tool()
async def get_dropoff_quote(
    user_email: str,
    user_name: str,
    pickup_addr: str,
    dropoff_addr: str,
    recipient_name: str = "Recipient",
    recipient_phone: str = "+1234567890",
    order_name: str = "Delivery Order",
    transport_id: int = 1,
    pack_size_id: int = 1,
    item_value: float = 100.0,
    taken_asap: int = 1,
    payment_type: int = 5,
    order_desc: str = "Package delivery",
    pickup_instructions: str = "",
    dropoff_instructions: str = ""
) -> str:
    """Get quote price for pickup and dropoff delivery using Senpex API.
    
    Args:
        user_email: Email address of the user requesting the quote
        pickup_addr: Pick-up address (full address string)
        dropoff_addr: Drop-off address (full address string)
        recipient_name: Name of the recipient (default: "Recipient")
        recipient_phone: Phone number of recipient with country code (default: "+1234567890")
        order_name: Name/title for the order (default: "Delivery Order")
        transport_id: Transport type ID (1=Car, 3=SUV, 8=Pickup Truck, 9=Large Van, etc.) (default: 1)
        pack_size_id: Package size ID (1=Small 1-25lbs, 2=Medium 26-50lbs, 3=Large 51-70lbs, 4=Heavy 71-150lbs) (default: 1)
        item_value: Declared value of items in USD (default: 100.0)
        taken_asap: 1 for urgent/immediate delivery, 0 for scheduled (default: 1)
        payment_type: Payment type (default: 5)
        order_desc: Description of the package (default: "Package delivery")
        pickup_instructions: Special instructions for pickup (default: "")
        dropoff_instructions: Special instructions for dropoff (default: "")
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured. Please set SENPEX_CLIENT_ID and SENPEX_SECRET_ID environment variables."
    
    url = f"{SENPEX_API_BASE}/orders/dropoff/quote"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Country": "US",
        "Content-Type": "application/json"
    }
    
    # Build the request body
    body = {
        "email": user_email,
        "order_name": order_name,
        "pack_from_text": pickup_addr,
        "transport_id": transport_id,
        "item_value": item_value,
        "pack_size_id": pack_size_id,
        "taken_asap": taken_asap,
        "payment_type": payment_type,
        "order_desc": order_desc,
        "route_desc": pickup_instructions,
        "routes": [
            {
                "route_to_text": dropoff_addr,
                "route_desc": dropoff_instructions,
                "rec_name": recipient_name,
                "rec_phone": recipient_phone
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            # Format the response
            if "data" in data:
                quote_data = data["data"]
                result = f"""Senpex Delivery Quote:
Order: {order_name}
Pickup: {pickup_addr}
Dropoff: {dropoff_addr}

"""
                if "price" in quote_data:
                    result += f"Price: ${quote_data['price']}\n"
                if "distance" in quote_data:
                    result += f"Distance: {quote_data['distance']} miles\n"
                if "duration" in quote_data:
                    result += f"Estimated Duration: {quote_data['duration']} mins\n"
                if "token" in quote_data:
                    result += f"Quote Token: {quote_data['token']}\n"
                
                return result
            else:
                return f"Quote response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting quote: {str(e)}"

@mcp.tool()
async def get_pickup_quote(
    user_email: str,
    order_name: str,
    dropoff_addr: str,
    dropoff_recipient_name: str,
    dropoff_recipient_phone: str,
    pickup_addresses: list[dict[str, str]],
    transport_id: int = 1,
    pack_size_id: int = 1,
    item_value: float = 100.0,
    taken_asap: int = 1,
    schedule_date_local: str = "",
    order_desc: str = "Package pickup and delivery",
    dropoff_instructions: str = "",
    show_one_price: int = 0,
    promo_code: str = ""
) -> str:
    """Get quote price for multiple pickup addresses to one dropoff location using Senpex API.
    
    This is for reverse logistics - picking up from multiple locations and delivering to one destination.
    
    Args:
        user_email: Email address of the user requesting the quote (required)
        order_name: Name/title for the order (required)
        dropoff_addr: Drop-off address (final destination) (required)
        dropoff_recipient_name: Name of recipient at dropoff location (required)
        dropoff_recipient_phone: Phone number of recipient at dropoff (required)
        pickup_addresses: List of pickup locations, each dict with keys: 'route_to_text', 'rec_name', 'rec_phone', 'route_desc' (required)
        transport_id: Transport type ID (1=Car, 3=SUV, 8=Pickup Truck, 9=Large Van, etc.) (default: 1)
        pack_size_id: Package size ID (1=Small 1-25lbs, 2=Medium 26-50lbs, 3=Large 51-70lbs, 4=Heavy 71-150lbs) (default: 1)
        item_value: Declared value of items in USD (default: 100.0)
        taken_asap: 1 for urgent/immediate, 0 for scheduled (default: 1)
        schedule_date_local: Schedule date in UTC format "YYYY-MM-DD HH:MM" (required if taken_asap=0) (default: "")
        order_desc: General delivery notes (gate code, apartment number, etc.) (default: "Package pickup and delivery")
        dropoff_instructions: Delivery notes for the dropoff address (default: "")
        show_one_price: 1=show only one price, 0=show both prices (default: 0)
        promo_code: Promo code if available (default: "")
    
    Returns:
        Quote with price, distance, duration, and API token for order confirmation.
    
    Example pickup_addresses format:
        [
            {
                "route_to_text": "123 Main St, City, State",
                "rec_name": "John Doe",
                "rec_phone": "+14155551234",
                "route_desc": "Ring doorbell"
            },
            {
                "route_to_text": "456 Oak Ave, City, State",
                "rec_name": "Jane Smith",
                "rec_phone": "+14155555678",
                "route_desc": "Leave at front desk"
            }
        ]
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured. Please set SENPEX_CLIENT_ID and SENPEX_SECRET_ID environment variables."
    
    if taken_asap == 0 and not schedule_date_local:
        return "Error: schedule_date_local is required when taken_asap=0 (scheduled delivery)"
    
    if not pickup_addresses or len(pickup_addresses) == 0:
        return "Error: At least one pickup address is required"
    
    url = f"{SENPEX_API_BASE}/orders/pickup/quote"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Country": "US",
        "Content-Type": "application/json"
    }
    
    # Build routes array from pickup_addresses
    routes = []
    for pickup in pickup_addresses:
        route = {
            "route_to_text": pickup.get("route_to_text", ""),
            "rec_name": pickup.get("rec_name", ""),
            "rec_phone": pickup.get("rec_phone", ""),
            "route_desc": pickup.get("route_desc", "")
        }
        routes.append(route)
    
    # Build the request body
    body = {
        "email": user_email,
        "order_name": order_name,
        "transport_id": transport_id,
        "item_value": item_value,
        "pack_size_id": pack_size_id,
        "taken_asap": taken_asap,
        "order_desc": order_desc,
        "route_desc": dropoff_instructions,
        "rec_name": dropoff_recipient_name,
        "rec_phone": dropoff_recipient_phone,
        "routes": routes,
        "show_one_price": show_one_price
    }
    
    if schedule_date_local:
        body["schedule_date_local"] = schedule_date_local
    
    if promo_code:
        body["promo_code"] = promo_code
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            # Format the response
            if data.get("code") == "0":
                result = f"""Senpex Pickup Quote:
Order: {order_name}
Dropoff: {dropoff_addr}
Pickup Locations: {len(routes)}

"""
                if "order_price" in data:
                    result += f"Price: ${data['order_price']}\n"
                if "original_order_price" in data and data.get("order_discount", 0) > 0:
                    result += f"Original Price: ${data['original_order_price']}\n"
                    result += f"Discount: ${data['order_discount']}\n"
                if "distance_miles" in data:
                    result += f"Distance: {data['distance_miles']} miles\n"
                if "distance_time_seconds" in data:
                    result += f"Estimated Duration: {data['distance_time_seconds']} seconds ({int(float(data['distance_time_seconds']) / 60)} minutes)\n"
                if "tariff_duration_mins" in data:
                    result += f"Tariff Duration: {data['tariff_duration_mins']} minutes\n"
                if "api_token" in data:
                    result += f"\nAPI Token: {data['api_token']}\n"
                    result += f"Token Expires In: {data.get('expire_mins', 60)} minutes\n"
                if "promo_code_info" in data and data["promo_code_info"]:
                    result += f"Promo Code Applied: {data['promo_code_info']}\n"
                
                # Add pickup route details
                if "routes_json" in data:
                    result += f"\nPickup Routes:\n"
                    for i, route in enumerate(data["routes_json"], 1):
                        result += f"  {i}. {route.get('route_to_text')}\n"
                        result += f"     Recipient: {route.get('route_rec_name')} ({route.get('route_rec_phone')})\n"
                        if route.get('route_distance'):
                            result += f"     Distance: {route.get('route_distance')} miles\n"
                
                return result
            else:
                return f"Quote response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting pickup quote: {str(e)}"

@mcp.tool()
async def confirm_dropoff(
    api_token: str,
    user_email: str,
    payment_type: int = 3,
    tip_amount: float = 0.0,
    sender_name: str = "",
    sender_cell: str = "",
    sender_desc: str = "",
    order_desc: str = "",
    recipient_name: str = "",
    recipient_phone: str = "",
    snpx_user_email: int = 0,
    snpx_order_email: int = 1,
    snpx_order_not: int = 1,
    search_courier: int = 1
) -> str:
    """Confirm and create a new order using an API token from a quote request.
    
    This creates an actual order after getting a quote. The api_token expires in 60 minutes
    and can only be used once to create one order.
    
    Args:
        api_token: Token received from get_dropoff_quote (required)
        user_email: Email of API account owner (required)
        payment_type: Payment type ID (default: 3)
        tip_amount: Tip amount to add to the order (default: 0.0)
        sender_name: Name of sender/store/restaurant (optional)
        sender_cell: Phone number of sender (optional)
        sender_desc: Sender's notes and instructions (optional)
        order_desc: Delivery notes (gate code, apartment number, etc.) (optional)
        recipient_name: Receiver name (if updating from quote) (optional)
        recipient_phone: Receiver phone (if updating from quote) (optional)
        snpx_user_email: 1=send email with password if user doesn't exist, 0=don't send (default: 0)
        snpx_order_email: 1=send order emails, 0=don't send (default: 1)
        snpx_order_not: 1=send push notifications if device_id provided, 0=don't send (default: 1)
        search_courier: 1=start searching for courier immediately, 0=wait for manual trigger (default: 1)
    
    Returns:
        Order confirmation with order ID, distance, and estimated time.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/orders/dropoff"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Content-Type": "application/json"
    }
    
    # Build the request body
    body = {
        "api_token": api_token,
        "email": user_email,
        "payment_type": payment_type,
        "tip_amount": tip_amount,
        "snpx_user_email": snpx_user_email,
        "snpx_order_email": snpx_order_email,
        "snpx_order_not": snpx_order_not,
        "search_courier": search_courier
    }
    
    # Add optional fields if provided
    if sender_name:
        body["sender_name"] = sender_name
    if sender_cell:
        body["sender_cell"] = sender_cell
    if sender_desc:
        body["sender_desc"] = sender_desc
    if order_desc:
        body["order_desc"] = order_desc
    
    # Add route updates if provided
    if recipient_name or recipient_phone:
        routes = []
        route_update = {}
        if recipient_name:
            route_update["rec_name"] = recipient_name
        if recipient_phone:
            route_update["rec_phone"] = recipient_phone
        if route_update:
            routes.append(route_update)
            body["routes"] = routes
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                result = "Order Confirmed Successfully!\n\n"
                
                if "inserted_id" in data:
                    result += f"Order ID: {data['inserted_id']}\n"
                if "distance" in data:
                    result += f"Distance: {data['distance']} miles\n"
                if "distance_time" in data:
                    result += f"Estimated Time: {data['distance_time']} seconds ({int(float(data['distance_time']) / 60)} minutes)\n"
                
                if tip_amount > 0:
                    result += f"Tip Added: ${tip_amount}\n"
                
                result += f"\nYour order has been created and "
                if search_courier == 1:
                    result += "the system is now searching for a courier."
                else:
                    result += "is waiting for manual courier assignment."
                
                return result
            else:
                return f"Order creation response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error confirming order: {str(e)}"

@mcp.tool()
async def confirm_pickup(
    api_token: str,
    user_email: str,
    tip_amount: float = 0.0,
    sender_name: str = "",
    sender_cell: str = "",
    sender_desc: str = "",
    order_desc: str = "",
    pickup_updates: list[dict[str, str]] = None,
    snpx_user_email: int = 0,
    snpx_order_email: int = 1,
    snpx_order_not: int = 1,
    search_courier: int = 1
) -> str:
    """Confirm and create a pickup order using an API token from get_pickup_quote.
    
    This creates an actual pickup order (multiple pickups to one dropoff) after getting a quote. 
    The api_token expires in 60 minutes and can only be used once to create one order.
    
    Args:
        api_token: Token received from get_pickup_quote (required)
        user_email: Email of API account owner (required)
        tip_amount: Tip amount to add to the order (default: 0.0)
        sender_name: Name of sender/store/restaurant (optional)
        sender_cell: Phone number of sender (optional)
        sender_desc: Sender's notes and instructions (optional)
        order_desc: Delivery notes (gate code, apartment number, etc.) (optional)
        pickup_updates: List of pickup location updates with 'rec_name' and/or 'rec_phone' (optional)
        snpx_user_email: 1=send email with password if user doesn't exist, 0=don't send (default: 0)
        snpx_order_email: 1=send order emails, 0=don't send (default: 1)
        snpx_order_not: 1=send push notifications if device_id provided, 0=don't send (default: 1)
        search_courier: 1=start searching for courier immediately, 0=wait for manual trigger (default: 1)
    
    Returns:
        Order confirmation with order ID, distance, and estimated time.
    
    Example pickup_updates format:
        [
            {"rec_name": "John Doe", "rec_phone": "+14155551234"},
            {"rec_name": "Jane Smith", "rec_phone": "+14155555678"}
        ]
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/orders/pickup"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Content-Type": "application/json"
    }
    
    # Build the request body
    body = {
        "api_token": api_token,
        "email": user_email,
        "tip_amount": tip_amount,
        "snpx_user_email": snpx_user_email,
        "snpx_order_email": snpx_order_email,
        "snpx_order_not": snpx_order_not,
        "search_courier": search_courier
    }
    
    # Add optional fields if provided
    if sender_name:
        body["sender_name"] = sender_name
    if sender_cell:
        body["sender_cell"] = sender_cell
    if sender_desc:
        body["sender_desc"] = sender_desc
    if order_desc:
        body["order_desc"] = order_desc
    
    # Add route updates if provided
    if pickup_updates and len(pickup_updates) > 0:
        routes = []
        for update in pickup_updates:
            route_update = {}
            if "rec_name" in update:
                route_update["rec_name"] = update["rec_name"]
            if "rec_phone" in update:
                route_update["rec_phone"] = update["rec_phone"]
            if route_update:
                routes.append(route_update)
        if routes:
            body["routes"] = routes
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                result = "Pickup Order Confirmed Successfully!\n\n"
                
                if "inserted_id" in data:
                    result += f"Order ID: {data['inserted_id']}\n"
                if "distance" in data:
                    result += f"Total Distance: {data['distance']} miles\n"
                if "distance_time" in data:
                    result += f"Estimated Time: {data['distance_time']} seconds ({int(float(data['distance_time']) / 60)} minutes)\n"
                
                if tip_amount > 0:
                    result += f"Tip Added: ${tip_amount}\n"
                
                result += f"\nYour pickup order has been created and "
                if search_courier == 1:
                    result += "the system is now searching for a courier."
                else:
                    result += "is waiting for manual courier assignment."
                
                return result
            else:
                return f"Order creation response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error confirming pickup order: {str(e)}"

@mcp.tool()
async def get_order_list(start: int = 0) -> str:
    """Get a list of orders created for the account with pagination.
    
    Args:
        start: Starting row number to retrieve orders from (default: 0)
    
    Returns:
        List of orders with details including order ID, status, addresses, courier info, etc.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/order-list"
    if start > 0:
        url += f"?start={start}"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0" and "data" in data:
                orders = data["data"]
                if not orders:
                    return "No orders found."
                
                result = f"Orders List (starting from row {start}):\n\n"
                for order in orders:
                    result += f"Order ID: {order.get('id')}\n"
                    result += f"  Name: {order.get('order_name')}\n"
                    result += f"  Status: {order.get('order_status_text')} (ID: {order.get('pack_status')})\n"
                    result += f"  From: {order.get('pack_from_text')}\n"
                    result += f"  To: {order.get('last_pack_to_text')}\n"
                    result += f"  Recipient: {order.get('last_receiver_name')} ({order.get('last_receiver_phone_number')})\n"
                    result += f"  Price: ${order.get('pack_price')}\n"
                    result += f"  Distance: {order.get('distance_miles')} miles\n"
                    if order.get('courier_name'):
                        result += f"  Courier: {order.get('courier_name')} {order.get('courier_surname')} ({order.get('courier_cell')})\n"
                    result += "\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting order list: {str(e)}"

@mcp.tool()
async def get_route_details(route_id: str) -> str:
    """Get detailed information about a specific route.
    
    Args:
        route_id: The route ID to retrieve details for
    
    Returns:
        Route details including address, status, recipient info, distance, and delivery date.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/orders/routes/{route_id}"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0" and "data" in data:
                routes = data["data"]
                if not routes:
                    return "No route details found."
                
                result = f"Route Details (ID: {route_id}):\n\n"
                for route in routes:
                    result += f"Address: {route.get('route_to_text')}\n"
                    result += f"Location: ({route.get('route_to_lat')}, {route.get('route_to_lng')})\n"
                    result += f"Recipient: {route.get('rec_name')}\n"
                    result += f"Phone: {route.get('rec_phone')}\n"
                    result += f"Status: {route.get('route_status')}\n"
                    result += f"Distance: {route.get('route_distance')} miles\n"
                    result += f"Travel Time: {route.get('route_distance_time')} seconds\n"
                    if route.get('route_delivery_date'):
                        result += f"Delivery Date: {route.get('route_delivery_date')}\n"
                    result += "\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting route details: {str(e)}"

@mcp.tool()
async def get_order_by_token(api_token: str) -> str:
    """Get order details using an API token from a previously created order.
    
    Args:
        api_token: The API token associated with the order
    
    Returns:
        Complete order details including pricing, routes, schedule, and all parameters.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/orders/tokens/{api_token}"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0" and "data" in data:
                orders = data["data"]
                if not orders:
                    return "No order found with this token."
                
                order = orders[0]
                result = f"Order Details (Token: {api_token}):\n\n"
                result += f"Order ID: {order.get('pack_id')}\n"
                result += f"Order Name: {order.get('order_name')}\n"
                result += f"Price: ${order.get('order_price')}\n"
                result += f"Original Price: ${order.get('original_order_price')}\n"
                result += f"Discount: ${order.get('order_discount')}\n"
                result += f"Tariff: {order.get('tariff_name')} - {order.get('tariff_desc')}\n"
                result += f"From: {order.get('pack_from_text')}\n"
                result += f"Distance: {order.get('distance_miles')} miles\n"
                result += f"Duration: {order.get('distance_time_seconds')} seconds\n"
                result += f"Route Count: {order.get('route_count')}\n"
                result += f"Package Size: {order.get('pack_size_id')}\n"
                result += f"Transport: {order.get('transport_id')}\n"
                result += f"Item Value: ${order.get('item_value')}\n"
                result += f"Schedule Date: {order.get('schedule_date')}\n"
                result += f"Expires: {order.get('expires_date')}\n"
                
                if order.get('routes_json'):
                    result += f"\nRoutes:\n"
                    for i, route in enumerate(order.get('routes_json', []), 1):
                        result += f"  {i}. {route.get('route_to_text')}\n"
                        result += f"     Recipient: {route.get('rec_name')} ({route.get('rec_phone')})\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting order by token: {str(e)}"

@mcp.tool()
async def track_order_by_id(order_id: str) -> str:
    """Track order status using order ID.
    
    Args:
        order_id: The order ID to track
    
    Returns:
        Tracking information including status, courier details, and real-time location.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/points/dropoff/track/{order_id}"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0" and "data" in data:
                tracking_items = data["data"]
                if not tracking_items:
                    return "No tracking information found."
                
                result = f"Order Tracking (ID: {order_id}):\n\n"
                for item in tracking_items:
                    result += f"Delivery ID: {item.get('id')}\n"
                    result += f"Address: {item.get('rec_address')}\n"
                    result += f"Recipient: {item.get('rec_name')}\n"
                    result += f"Phone: {item.get('rec_phone')}\n"
                    result += f"Pack Status: {item.get('pack_status')}\n"
                    result += f"Route Status: {item.get('route_status')}\n"
                    
                    if item.get('courier_name'):
                        result += f"\nCourier Information:\n"
                        result += f"  Name: {item.get('courier_name')} {item.get('courier_surname')}\n"
                        result += f"  Phone: {item.get('courier_cell')}\n"
                    
                    if item.get('last_lat') and item.get('last_lng'):
                        result += f"\nLast Known Location:\n"
                        result += f"  Coordinates: ({item.get('last_lat')}, {item.get('last_lng')})\n"
                        result += f"  Updated: {item.get('last_location_date')}\n"
                    
                    if item.get('tracking_code'):
                        result += f"\nTracking Code: {item.get('tracking_code')}\n"
                    
                    result += "\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error tracking order: {str(e)}"

@mcp.tool()
async def track_order_by_access_key(access_key: str) -> str:
    """Track order status using access key.
    
    Args:
        access_key: The access key associated with the order
    
    Returns:
        Tracking information including status, courier details, and real-time location.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/points/dropoff/track/access_key/{access_key}"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0" and "data" in data:
                tracking_items = data["data"]
                if not tracking_items:
                    return "No tracking information found."
                
                result = f"Order Tracking (Access Key: {access_key}):\n\n"
                for item in tracking_items:
                    result += f"Delivery ID: {item.get('id')}\n"
                    result += f"Address: {item.get('rec_address')}\n"
                    result += f"Recipient: {item.get('rec_name')}\n"
                    result += f"Phone: {item.get('rec_phone')}\n"
                    result += f"Pack Status: {item.get('pack_status')}\n"
                    result += f"Route Status: {item.get('route_status')}\n"
                    
                    if item.get('courier_name'):
                        result += f"\nCourier Information:\n"
                        result += f"  Name: {item.get('courier_name')} {item.get('courier_surname')}\n"
                        result += f"  Phone: {item.get('courier_cell')}\n"
                    
                    if item.get('last_lat') and item.get('last_lng'):
                        result += f"\nLast Known Location:\n"
                        result += f"  Coordinates: ({item.get('last_lat')}, {item.get('last_lng')})\n"
                        result += f"  Updated: {item.get('last_location_date')}\n"
                    
                    if item.get('tracking_code'):
                        result += f"\nTracking Code: {item.get('tracking_code')}\n"
                    
                    result += "\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error tracking order: {str(e)}"

@mcp.tool()
async def get_driver_location(order_id: str) -> str:
    """Get driver/courier details and real-time location for a specific order.
    
    Returns null if no driver is assigned to the order yet.
    
    Args:
        order_id: The order ID to get driver information for
    
    Returns:
        Driver details including name, phone, GPS location, order status, and notification settings.
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/orders/{order_id}/driver-location/"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                driver_data = data.get("data")
                
                # Check if driver is assigned
                if not driver_data or driver_data is None:
                    return f"No driver assigned to order {order_id} yet."
                
                result = f"Driver Details for Order {order_id}:\n\n"
                
                # Order status
                if "pack_status" in driver_data:
                    result += f"Package Status: {driver_data['pack_status']}\n"
                if "order_status" in driver_data:
                    result += f"Order Status: {driver_data['order_status']}\n"
                
                result += "\n"
                
                # Driver information
                if driver_data.get('courier_name') or driver_data.get('courier_surname'):
                    result += f"Driver: {driver_data.get('courier_name', '')} {driver_data.get('courier_surname', '')}\n"
                if driver_data.get('courier_phone_number'):
                    result += f"Phone: {driver_data['courier_phone_number']}\n"
                
                result += "\n"
                
                # Location information
                if driver_data.get('last_lat') and driver_data.get('last_lng'):
                    result += f"Current Location:\n"
                    result += f"  GPS Coordinates: ({driver_data['last_lat']}, {driver_data['last_lng']})\n"
                    if driver_data.get('last_timezone'):
                        result += f"  Timezone: {driver_data['last_timezone']}\n"
                    if driver_data.get('last_location_date'):
                        result += f"  Location Updated: {driver_data['last_location_date']} (UTC)\n"
                    if driver_data.get('last_seen_date'):
                        result += f"  Last Seen: {driver_data['last_seen_date']} (UTC)\n"
                else:
                    result += "Location: Not available yet\n"
                
                result += "\n"
                
                # Notification settings
                result += "Notification Settings:\n"
                result += f"  Email: {'Enabled' if driver_data.get('snpx_email') == 1 else 'Disabled'}\n"
                result += f"  Push Notifications: {'Enabled' if driver_data.get('snpx_nots') == 1 else 'Disabled'}\n"
                result += f"  SMS: {'Enabled' if driver_data.get('snpx_sms') == 1 else 'Disabled'}\n"
                result += f"  Instant Notifications: {'Enabled' if driver_data.get('snpx_instant_not') == 1 else 'Disabled'}\n"
                
                if driver_data.get('instant_not_url'):
                    result += f"  Instant Notification URL: {driver_data['instant_not_url']}\n"
                
                return result
            else:
                return f"Response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error getting driver location: {str(e)}"

@mcp.tool()
async def set_delivery_ready(order_id: str) -> str:
    """Mark an order as ready for delivery.
    
    This can be used after order creation, for draft orders, or after delivery 
    attempt failed/returned to warehouse statuses.
    
    Args:
        order_id: The order ID to mark as ready for delivery
    
    Returns:
        Success or error message
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/points/dropoff-delivery-ready"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Content-Type": "application/json"
    }
    
    body = {"id": order_id}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                if data.get("inserted_id") == -1:
                    return f"Success: Order {order_id} marked as ready for delivery."
                else:
                    return f"Order status updated. Response: {data}"
            else:
                return f"Error response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error setting delivery ready: {str(e)}"

@mcp.tool()
async def set_laboratory_ready(order_id: str) -> str:
    """Change order status from 'Delivered to recipient' to 'Ready for pick-up'.
    
    This can only be sent after a parcel is delivered to the recipient.
    
    Args:
        order_id: The order ID to mark as ready for pickup from laboratory
    
    Returns:
        Success or error message
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/points/dropoff-laboratory-ready"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Content-Type": "application/json"
    }
    
    body = {"id": order_id}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                if data.get("inserted_id") == -1:
                    return f"Success: Order {order_id} marked as ready for pick-up from laboratory."
                else:
                    return f"Order status updated. Response: {data}"
            else:
                return f"Error response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error setting laboratory ready: {str(e)}"

@mcp.tool()
async def set_dropoff_received(order_id: str) -> str:
    """Change order status from 'Delivered to laboratory' to 'Drop-off received'.
    
    This can only be sent after a parcel is delivered to the laboratory or final destination.
    
    Args:
        order_id: The order ID to mark as received at drop-off location
    
    Returns:
        Success or error message
    """
    if not SENPEX_CLIENT_ID or not SENPEX_SECRET_ID:
        return "Error: Senpex API credentials not configured."
    
    url = f"{SENPEX_API_BASE}/points/dropoff-received"
    
    headers = {
        "clientid": SENPEX_CLIENT_ID,
        "secretid": SENPEX_SECRET_ID,
        "Content-Type": "application/json"
    }
    
    body = {"id": order_id}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(url, headers=headers, json=body, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("code") == "0":
                if data.get("inserted_id") == -1:
                    return f"Success: Order {order_id} marked as received at drop-off location."
                else:
                    return f"Order status updated. Response: {data}"
            else:
                return f"Error response: {data}"
                
        except httpx.HTTPStatusError as e:
            return f"Error: HTTP {e.response.status_code} - {e.response.text}"
        except Exception as e:
            return f"Error setting dropoff received: {str(e)}"

def main():
    # Initialize and run the server
    mcp.run(transport='stdio')

if __name__ == "__main__":
    main()
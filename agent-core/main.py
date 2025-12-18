"""
Agent API - Single Source of Truth for AI Agent
Handles communication with MCP Server and provides unified API for UIs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
import os
from datetime import datetime
import uuid

app = FastAPI(
    title="Senpex AI Agent API",
    version="1.0.0",
    description="Unified API for Chainlit and Streamlit UIs"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "https://mcp-senpex.onrender.com/sse")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# In-memory session store (use Redis in production)
sessions: Dict[str, Dict[str, Any]] = {}
tool_logs: List[Dict[str, Any]] = []


# Pydantic Models
class MessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: Optional[str] = "anonymous"


class MessageResponse(BaseModel):
    response: str
    session_id: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    timestamp: str


class SessionInfo(BaseModel):
    session_id: str
    user_id: str
    created_at: str
    message_count: int
    last_activity: str


class ToolLog(BaseModel):
    id: str
    tool_name: str
    arguments: Dict[str, Any]
    result: str
    timestamp: str
    session_id: str


# Helper Functions
def create_session(user_id: str = "anonymous") -> str:
    """Create a new session"""
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "user_id": user_id,
        "created_at": datetime.now().isoformat(),
        "messages": [],
        "message_count": 0,
        "last_activity": datetime.now().isoformat()
    }
    return session_id


def log_tool_execution(session_id: str, tool_name: str, arguments: Dict, result: str):
    """Log tool execution for observability"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "tool_name": tool_name,
        "arguments": arguments,
        "result": result,
        "timestamp": datetime.now().isoformat(),
        "session_id": session_id
    }
    tool_logs.append(log_entry)
    return log_entry


async def call_mcp_tool(tool_name: str, arguments: Dict) -> str:
    """Call MCP server tool via HTTP"""
    try:
        # For now, use HTTP endpoint since SSE is for streaming
        # In production, maintain persistent SSE connection
        mcp_http_url = MCP_SERVER_URL.replace("/sse", f"/mcp/tools/{tool_name}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(mcp_http_url, json=arguments)
            response.raise_for_status()
            data = response.json()
            
            # Extract text from MCP response
            if "content" in data and isinstance(data["content"], list):
                return data["content"][0].get("text", str(data))
            return str(data)
    except Exception as e:
        return f"Error calling tool {tool_name}: {str(e)}"


def analyze_intent(message: str) -> Dict[str, Any]:
    """Simple intent detection (replace with LLM in production)"""
    message_lower = message.lower()
    
    # Quote/Price inquiry
    if any(word in message_lower for word in ["quote", "price", "cost", "how much"]):
        return {
            "intent": "get_quote",
            "tool": "get_dropoff_quote",
            "confidence": 0.8
        }
    
    # Track order
    elif any(word in message_lower for word in ["track", "status", "where is"]):
        return {
            "intent": "track_order",
            "tool": "track_order",
            "confidence": 0.8
        }
    
    # Test/Ping
    elif any(word in message_lower for word in ["ping", "test", "hello"]):
        return {
            "intent": "test",
            "tool": "ping",
            "confidence": 0.9
        }
    
    return {
        "intent": "general",
        "tool": None,
        "confidence": 0.5
    }


# API Endpoints
@app.get("/")
async def root():
    return {
        "service": "Senpex AI Agent API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "message": "POST /agent/message",
            "session": "GET /agent/session/{id}",
            "sessions": "GET /agent/sessions",
            "tools_logs": "GET /agent/tools/logs"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.post("/agent/message", response_model=MessageResponse)
async def process_message(request: MessageRequest):
    """
    Main endpoint for processing user messages
    Used by both Chainlit and Streamlit UIs
    """
    # Get or create session
    session_id = request.session_id or create_session(request.user_id)
    
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    # Update session
    session["last_activity"] = datetime.now().isoformat()
    session["message_count"] += 1
    session["messages"].append({
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    })
    
    # Analyze intent
    intent_analysis = analyze_intent(request.message)
    
    tool_calls_log = []
    response_text = ""
    
    # Execute tool if detected
    if intent_analysis["tool"]:
        tool_name = intent_analysis["tool"]
        
        # Extract arguments based on tool
        # In production, use LLM to extract parameters
        if tool_name == "ping":
            arguments = {}
        elif tool_name == "get_dropoff_quote":
            # Simple extraction (replace with LLM)
            arguments = {
                "user_email": "demo@example.com",
                "pickup_addr": "123 Market St, San Francisco, CA",
                "dropoff_addr": "456 Main St, Los Angeles, CA",
                "recipient_name": "John Doe",
                "recipient_phone": "+1234567890"
            }
        elif tool_name == "track_order":
            # Extract order ID from message
            import re
            order_match = re.search(r'\b\d{5,}\b', request.message)
            arguments = {
                "order_id": order_match.group() if order_match else "12345"
            }
        else:
            arguments = {}
        
        # Call MCP tool
        tool_result = await call_mcp_tool(tool_name, arguments)
        
        # Log tool execution
        log_entry = log_tool_execution(session_id, tool_name, arguments, tool_result)
        tool_calls_log.append(log_entry)
        
        response_text = tool_result
    else:
        response_text = f"I understand you're asking about: {request.message}. How can I help you with delivery services?"
    
    # Store assistant response
    session["messages"].append({
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.now().isoformat()
    })
    
    return MessageResponse(
        response=response_text,
        session_id=session_id,
        tool_calls=tool_calls_log if tool_calls_log else None,
        timestamp=datetime.now().isoformat()
    )


@app.get("/agent/session/{session_id}", response_model=SessionInfo)
async def get_session(session_id: str):
    """Get session information"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return SessionInfo(
        session_id=session_id,
        user_id=session["user_id"],
        created_at=session["created_at"],
        message_count=session["message_count"],
        last_activity=session["last_activity"]
    )


@app.get("/agent/sessions")
async def list_sessions():
    """List all sessions (for Streamlit ops UI)"""
    return {
        "total": len(sessions),
        "sessions": [
            {
                "session_id": sid,
                "user_id": info["user_id"],
                "message_count": info["message_count"],
                "last_activity": info["last_activity"]
            }
            for sid, info in sessions.items()
        ]
    }


@app.get("/agent/tools/logs")
async def get_tool_logs(limit: int = 100):
    """Get tool execution logs (for Streamlit ops UI)"""
    return {
        "total": len(tool_logs),
        "logs": tool_logs[-limit:]
    }


@app.delete("/agent/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "deleted", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)



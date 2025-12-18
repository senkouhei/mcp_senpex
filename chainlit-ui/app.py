"""
Chainlit UI for Senpex AI Agent
Beautiful chat interface for end users
"""

import chainlit as cl
import httpx
import os
from typing import Optional

# Configuration
AGENT_API_URL = os.getenv("AGENT_API_URL", "http://localhost:8080")


async def call_agent_api(message: str, session_id: Optional[str] = None) -> dict:
    """Call the Agent API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AGENT_API_URL}/agent/message",
            json={
                "message": message,
                "session_id": session_id,
                "user_id": cl.user_session.get("user_id", "anonymous")
            }
        )
        response.raise_for_status()
        return response.json()


@cl.on_chat_start
async def start():
    """Initialize chat session"""
    await cl.Message(
        content="👋 Hello! I'm your Senpex AI assistant. I can help you with:\n\n"
        "📦 **Get delivery quotes**\n"
        "🚚 **Track orders**\n"
        "📍 **Check delivery status**\n"
        "💰 **Calculate shipping costs**\n\n"
        "What would you like to do today?"
    ).send()
    
    # Initialize session
    cl.user_session.set("session_id", None)
    cl.user_session.set("user_id", "user_" + str(id(cl.user_session))[-8:])


@cl.on_message
async def main(message: cl.Message):
    """Handle incoming messages"""
    
    # Show thinking indicator
    msg = cl.Message(content="")
    await msg.send()
    
    try:
        # Get session ID
        session_id = cl.user_session.get("session_id")
        
        # Call Agent API
        response = await call_agent_api(message.content, session_id)
        
        # Store session ID
        if not session_id:
            cl.user_session.set("session_id", response["session_id"])
        
        # Update message with response
        msg.content = response["response"]
        await msg.update()
        
        # Show tool calls if any
        if response.get("tool_calls"):
            tool_msg = "**🔧 Tools Used:**\n\n"
            for tool_call in response["tool_calls"]:
                tool_msg += f"- `{tool_call['tool_name']}`\n"
            
            await cl.Message(content=tool_msg).send()
    
    except Exception as e:
        msg.content = f"❌ Sorry, I encountered an error: {str(e)}"
        await msg.update()


@cl.on_chat_end
async def end():
    """Handle chat end"""
    await cl.Message(
        content="Thank you for using Senpex AI! Have a great day! 👋"
    ).send()


if __name__ == "__main__":
    from chainlit.cli import run_chainlit
    run_chainlit(__file__)


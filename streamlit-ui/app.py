"""
Streamlit Operations Dashboard for Senpex AI Agent
Read-only monitoring and analytics interface
"""

import streamlit as st
import httpx
import pandas as pd
import os
from datetime import datetime
import time

# Configuration
AGENT_API_URL = os.getenv("AGENT_API_URL", "http://localhost:8080")

# Page config
st.set_page_config(
    page_title="Senpex AI Ops Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #667eea;
    }
    .status-healthy {
        color: #28a745;
        font-weight: bold;
    }
    .status-error {
        color: #dc3545;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)


# Helper Functions
@st.cache_data(ttl=5)
def get_api_health():
    """Get API health status"""
    try:
        response = httpx.get(f"{AGENT_API_URL}/health", timeout=5)
        return response.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}


@st.cache_data(ttl=10)
def get_sessions():
    """Get all sessions"""
    try:
        response = httpx.get(f"{AGENT_API_URL}/agent/sessions", timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}


@st.cache_data(ttl=10)
def get_tool_logs(limit=100):
    """Get tool execution logs"""
    try:
        response = httpx.get(f"{AGENT_API_URL}/agent/tools/logs?limit={limit}", timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}


def get_session_details(session_id):
    """Get specific session details"""
    try:
        response = httpx.get(f"{AGENT_API_URL}/agent/session/{session_id}", timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}


# Main App
def main():
    # Header
    st.markdown('<h1 class="main-header">📊 Senpex AI Operations Dashboard</h1>', unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.image("https://via.placeholder.com/200x80/667eea/FFFFFF?text=Senpex+AI", width=200)
        st.markdown("---")
        
        # Navigation
        page = st.radio(
            "Navigation",
            ["Overview", "Sessions", "Tool Logs", "Analytics"],
            label_visibility="collapsed"
        )
        
        st.markdown("---")
        
        # Refresh button
        if st.button("🔄 Refresh Data", use_container_width=True):
            st.cache_data.clear()
            st.rerun()
        
        # Auto-refresh toggle
        auto_refresh = st.checkbox("Auto-refresh (10s)", value=False)
        
        st.markdown("---")
        st.caption(f"Last updated: {datetime.now().strftime('%H:%M:%S')}")
    
    # Auto-refresh logic
    if auto_refresh:
        time.sleep(10)
        st.rerun()
    
    # API Health Check
    health = get_api_health()
    if health.get("status") == "healthy":
        st.success(f"✅ Agent API is healthy")
    else:
        st.error(f"❌ Agent API error: {health.get('error', 'Unknown')}")
    
    st.markdown("---")
    
    # Page Routing
    if page == "Overview":
        show_overview()
    elif page == "Sessions":
        show_sessions()
    elif page == "Tool Logs":
        show_tool_logs()
    elif page == "Analytics":
        show_analytics()


def show_overview():
    """Overview page with key metrics"""
    st.header("📈 Overview")
    
    sessions_data = get_sessions()
    tool_logs_data = get_tool_logs()
    
    # Metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_sessions = sessions_data.get("total", 0)
        st.metric("Total Sessions", total_sessions, delta=None)
    
    with col2:
        total_tools = tool_logs_data.get("total", 0)
        st.metric("Tool Executions", total_tools, delta=None)
    
    with col3:
        # Calculate average messages per session
        if sessions_data.get("sessions"):
            avg_messages = sum(s["message_count"] for s in sessions_data["sessions"]) / max(len(sessions_data["sessions"]), 1)
            st.metric("Avg Messages/Session", f"{avg_messages:.1f}")
        else:
            st.metric("Avg Messages/Session", "0")
    
    with col4:
        # Active sessions (activity in last hour)
        active = 0
        if sessions_data.get("sessions"):
            now = datetime.now()
            for session in sessions_data["sessions"]:
                last_activity = datetime.fromisoformat(session["last_activity"])
                if (now - last_activity).seconds < 3600:
                    active += 1
        st.metric("Active Sessions (1h)", active)
    
    st.markdown("---")
    
    # Recent Activity
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Recent Sessions")
        if sessions_data.get("sessions"):
            recent_sessions = sorted(
                sessions_data["sessions"],
                key=lambda x: x["last_activity"],
                reverse=True
            )[:5]
            
            for session in recent_sessions:
                with st.expander(f"Session {session['session_id'][:8]}..."):
                    st.write(f"**User:** {session['user_id']}")
                    st.write(f"**Messages:** {session['message_count']}")
                    st.write(f"**Last Activity:** {session['last_activity']}")
        else:
            st.info("No sessions yet")
    
    with col2:
        st.subheader("Recent Tool Calls")
        if tool_logs_data.get("logs"):
            recent_tools = tool_logs_data["logs"][-5:]
            for log in reversed(recent_tools):
                with st.expander(f"{log['tool_name']} - {log['timestamp'][:19]}"):
                    st.write(f"**Session:** {log['session_id'][:8]}...")
                    st.write(f"**Arguments:**")
                    st.json(log['arguments'])
                    st.write(f"**Result:** {log['result'][:200]}...")
        else:
            st.info("No tool executions yet")


def show_sessions():
    """Sessions page with detailed list"""
    st.header("💬 Sessions")
    
    sessions_data = get_sessions()
    
    if sessions_data.get("sessions"):
        # Convert to DataFrame
        df = pd.DataFrame(sessions_data["sessions"])
        df["last_activity"] = pd.to_datetime(df["last_activity"])
        df = df.sort_values("last_activity", ascending=False)
        
        # Filters
        col1, col2 = st.columns(2)
        with col1:
            user_filter = st.multiselect(
                "Filter by User",
                options=df["user_id"].unique(),
                default=[]
            )
        
        with col2:
            min_messages = st.slider("Min Messages", 0, int(df["message_count"].max()), 0)
        
        # Apply filters
        filtered_df = df.copy()
        if user_filter:
            filtered_df = filtered_df[filtered_df["user_id"].isin(user_filter)]
        filtered_df = filtered_df[filtered_df["message_count"] >= min_messages]
        
        # Display table
        st.dataframe(
            filtered_df,
            use_container_width=True,
            hide_index=True
        )
        
        # Session details
        st.markdown("---")
        st.subheader("Session Details")
        selected_session = st.selectbox(
            "Select a session",
            options=filtered_df["session_id"].tolist(),
            format_func=lambda x: f"{x[:12]}..."
        )
        
        if selected_session:
            details = get_session_details(selected_session)
            if "error" not in details:
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("User ID", details["user_id"])
                with col2:
                    st.metric("Messages", details["message_count"])
                with col3:
                    st.metric("Created", details["created_at"][:19])
    else:
        st.info("No sessions found")


def show_tool_logs():
    """Tool execution logs page"""
    st.header("🔧 Tool Execution Logs")
    
    tool_logs_data = get_tool_logs(limit=200)
    
    if tool_logs_data.get("logs"):
        logs = tool_logs_data["logs"]
        
        # Convert to DataFrame
        df = pd.DataFrame(logs)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp", ascending=False)
        
        # Filters
        col1, col2 = st.columns(2)
        with col1:
            tool_filter = st.multiselect(
                "Filter by Tool",
                options=df["tool_name"].unique(),
                default=[]
            )
        
        with col2:
            limit = st.slider("Number of logs", 10, 200, 50)
        
        # Apply filters
        filtered_df = df.copy()
        if tool_filter:
            filtered_df = filtered_df[filtered_df["tool_name"].isin(tool_filter)]
        filtered_df = filtered_df.head(limit)
        
        # Display logs
        for _, log in filtered_df.iterrows():
            with st.expander(f"[{log['timestamp'].strftime('%H:%M:%S')}] {log['tool_name']} - Session: {log['session_id'][:8]}"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write("**Arguments:**")
                    st.json(log['arguments'])
                with col2:
                    st.write("**Result:**")
                    st.text_area("", log['result'], height=150, disabled=True, label_visibility="collapsed")
    else:
        st.info("No tool logs found")


def show_analytics():
    """Analytics page with charts"""
    st.header("📊 Analytics")
    
    sessions_data = get_sessions()
    tool_logs_data = get_tool_logs(limit=500)
    
    # Tool usage chart
    if tool_logs_data.get("logs"):
        logs_df = pd.DataFrame(tool_logs_data["logs"])
        
        st.subheader("Tool Usage Distribution")
        tool_counts = logs_df["tool_name"].value_counts()
        st.bar_chart(tool_counts)
        
        st.markdown("---")
        
        # Timeline
        st.subheader("Tool Execution Timeline")
        logs_df["timestamp"] = pd.to_datetime(logs_df["timestamp"])
        logs_df["hour"] = logs_df["timestamp"].dt.floor("H")
        timeline = logs_df.groupby("hour").size()
        st.line_chart(timeline)
    
    # Session stats
    if sessions_data.get("sessions"):
        st.markdown("---")
        st.subheader("Session Statistics")
        
        sessions_df = pd.DataFrame(sessions_data["sessions"])
        
        col1, col2 = st.columns(2)
        with col1:
            st.write("**Messages per Session**")
            st.bar_chart(sessions_df.set_index("session_id")["message_count"])
        
        with col2:
            st.write("**User Distribution**")
            user_counts = sessions_df["user_id"].value_counts()
            st.bar_chart(user_counts)


if __name__ == "__main__":
    main()



/**
 * Test SSE MCP endpoint
 * This simulates what n8n MCP Client does
 */

async function testSSE() {
  console.log('🧪 Testing SSE MCP endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/sse', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('✅ Status:', response.status, response.statusText);
    console.log('✅ Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status !== 200) {
      console.error('❌ Expected status 200, got', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    // Check Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.error('❌ Expected Content-Type: text/event-stream, got:', contentType);
      return;
    }

    console.log('\n📡 SSE Stream (first 10 seconds):\n');
    
    // Read SSE stream
    const reader = response.body;
    let buffer = '';
    let messageCount = 0;
    
    const timeout = setTimeout(() => {
      console.log('\n✅ Test completed successfully!');
      console.log(`📊 Received ${messageCount} SSE messages`);
      process.exit(0);
    }, 10000);

    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      lines.forEach(line => {
        if (line.startsWith('data: ')) {
          messageCount++;
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`[Message ${messageCount}]`, JSON.stringify(data, null, 2));
          } catch (e) {
            console.log(`[Message ${messageCount}]`, line.slice(6));
          }
        } else if (line.startsWith('event: ')) {
          console.log('[Event]', line.slice(7));
        } else if (line.trim()) {
          console.log('[Raw]', line);
        }
      });
    });

    reader.on('end', () => {
      clearTimeout(timeout);
      console.log('\n🔌 Connection closed');
      console.log(`📊 Total messages: ${messageCount}`);
    });

    reader.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ Stream error:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSSE();


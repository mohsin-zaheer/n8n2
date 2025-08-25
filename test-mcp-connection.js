#!/usr/bin/env node

/**
 * Test script to verify local MCP server connection
 */

const http = require('http');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, MCP_SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-Test-Client/1.0'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testMCPServer() {
  console.log('🧪 Testing MCP Server Connection...\n');
  console.log(`Server URL: ${MCP_SERVER_URL}`);
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('/health');
    if (health.status === 200) {
      console.log('   ✅ Health check passed');
      console.log(`   📊 Uptime: ${Math.round(health.data.uptime)}s`);
      console.log(`   🏷️  Profile: ${health.data.profile}`);
    } else {
      console.log(`   ❌ Health check failed (${health.status})`);
      return false;
    }

    // Test 2: MCP Info
    console.log('\n2. Testing MCP info endpoint...');
    const info = await makeRequest('/mcp');
    if (info.status === 200) {
      console.log('   ✅ MCP info retrieved');
      console.log(`   📦 Capabilities: ${info.data.capabilities.join(', ')}`);
      console.log(`   🔧 Version: ${info.data.version}`);
    } else {
      console.log(`   ❌ MCP info failed (${info.status})`);
      return false;
    }

    // Test 3: Workflow Generation
    console.log('\n3. Testing workflow generation...');
    const workflowData = {
      userIntent: 'Test workflow generation',
      nodes: [
        {
          id: 'test_node_1',
          name: 'Test Node',
          type: 'n8n-nodes-base.webhook',
          parameters: { path: 'test' }
        }
      ],
      connections: [],
      settings: { name: 'Test Workflow' }
    };
    
    const workflow = await makeRequest('/mcp/generate-workflow', 'POST', workflowData);
    if (workflow.status === 200 && workflow.data.success) {
      console.log('   ✅ Workflow generation successful');
      console.log(`   🆔 Workflow ID: ${workflow.data.workflow.id}`);
      console.log(`   📝 Name: ${workflow.data.workflow.name}`);
    } else {
      console.log(`   ❌ Workflow generation failed (${workflow.status})`);
      console.log(`   Error: ${workflow.data.message || 'Unknown error'}`);
      return false;
    }

    // Test 4: Node Validation
    console.log('\n4. Testing node validation...');
    const validationData = {
      nodes: [
        {
          id: 'webhook_1',
          type: 'n8n-nodes-base.webhook',
          name: 'Webhook',
          parameters: { path: 'test', httpMethod: 'POST' }
        },
        {
          id: 'invalid_node',
          type: 'n8n-nodes-base.httpRequest',
          name: 'HTTP Request'
          // Missing required URL parameter
        }
      ]
    };
    
    const validation = await makeRequest('/mcp/validate-nodes', 'POST', validationData);
    if (validation.status === 200 && validation.data.success) {
      console.log('   ✅ Node validation successful');
      console.log(`   📊 Valid nodes: ${validation.data.summary.validNodes}/${validation.data.summary.totalNodes}`);
      console.log(`   ⚠️  Total errors: ${validation.data.summary.totalErrors}`);
    } else {
      console.log(`   ❌ Node validation failed (${validation.status})`);
      return false;
    }

    console.log('\n🎉 All MCP server tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Health check: ✅');
    console.log('   - MCP info: ✅');
    console.log('   - Workflow generation: ✅');
    console.log('   - Node validation: ✅');
    
    return true;

  } catch (error) {
    console.log(`\n❌ Connection failed: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure MCP server is running: npm run mcp:docker:up');
    console.log('   2. Check server logs: npm run mcp:docker:logs');
    console.log('   3. Verify port 3001 is not blocked');
    console.log('   4. Test manually: curl http://localhost:3001/health');
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testMCPServer().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testMCPServer };

#!/bin/bash

# Complete Local Deployment Script for N8N Workflow Builder with Local MCP
set -e

echo "🚀 N8N Workflow Builder - Complete Local Deployment"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js if not present
if ! command_exists node; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install Docker if not present
if ! command_exists docker; then
    echo "📦 Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo "⚠️  Please log out and back in for Docker group changes to take effect"
    echo "⚠️  Then run this script again"
    exit 0
fi

# Install PM2 if not present
if ! command_exists pm2; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

echo "✅ All dependencies installed"

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Setup MCP server
echo "🔧 Setting up MCP server..."
cd mcp-server

# Install MCP dependencies
npm install

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚙️  Created MCP .env file"
fi

# Build and start MCP server
echo "🐳 Building and starting MCP server..."
npm run docker:build
npm run docker:up

# Wait for MCP server to be ready
echo "⏳ Waiting for MCP server to start..."
sleep 10

cd ..

# Test MCP connection
echo "🧪 Testing MCP server connection..."
npm run mcp:test

if [ $? -eq 0 ]; then
    echo "✅ MCP server is running and responding"
else
    echo "❌ MCP server test failed"
    echo "🔍 Check logs with: npm run mcp:docker:logs"
    exit 1
fi

# Setup main application environment
echo "⚙️  Setting up main application environment..."
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Main Application Environment
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Local MCP Server Configuration
MCP_SERVER_URL=http://localhost:3001/mcp
MCP_API_KEY=local-development-key
MCP_PROFILE=intermediate-cuckoo-DIapDk

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
EOF
    echo "📝 Created .env.local file - please update with your API keys"
fi

# Build the main application
echo "🔨 Building main application..."
npm run build

# Start the main application with PM2
echo "🚀 Starting main application with PM2..."
pm2 start npm --name "n8n-workflow-builder" -- run start
pm2 save

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "📊 Service Status:"
echo "   🐳 MCP Server: http://localhost:3001"
echo "   🌐 Main App: http://localhost:3000"
echo ""
echo "🔧 Management Commands:"
echo "   Main App:"
echo "     pm2 status                    - Check status"
echo "     pm2 logs n8n-workflow-builder - View logs"
echo "     pm2 restart n8n-workflow-builder - Restart"
echo ""
echo "   MCP Server:"
echo "     npm run mcp:docker:logs       - View logs"
echo "     npm run mcp:docker:down       - Stop server"
echo "     npm run mcp:docker:up         - Start server"
echo "     npm run mcp:test              - Test connection"
echo ""
echo "🧪 Test Commands:"
echo "   npm run test:complete           - Run complete workflow tests"
echo "   npm run test:discovery          - Test discovery phase"
echo "   npm run test:configure          - Test configuration phase"
echo "   npm run test:build              - Test building phase"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Update .env.local with your API keys"
echo "   2. Configure your Supabase database"
echo "   3. Set up your Anthropic API key"
echo ""
echo "🔗 Access your application at: http://localhost:3000"

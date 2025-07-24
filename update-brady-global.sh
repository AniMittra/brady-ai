#!/bin/bash
# Update Brady AI global installation

echo "🔄 Updating Brady AI global installation..."

# Kill any running Brady processes
echo "🛑 Stopping Brady processes..."
pkill -f brady 2>/dev/null || true
pkill -f "node.*dist.*js" 2>/dev/null || true

# Build latest version
echo "🔨 Building latest Brady..."
npm run build

# Update global installation
echo "📦 Updating global installation..."
npm uninstall -g brady-ai 2>/dev/null || true
npm install -g .

echo "✅ Brady AI global installation updated!"
echo "🚀 You can now use 'brady-cli' with the latest version"

# Show version
echo "📋 Current version:"
node -e "console.log('Brady AI v' + require('./package.json').version)"
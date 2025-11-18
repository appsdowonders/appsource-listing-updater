#!/bin/bash

# AppSource Translation Console Startup Script

echo "🚀 Starting AppSource Translation Console..."
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if config.js exists
if [ ! -f "config.js" ]; then
    echo "❌ Error: config.js not found!"
    echo "Please copy config.example.js to config.js and configure your settings."
    exit 1
fi

# Check if description.txt exists
if [ ! -f "descriptions/description.txt" ]; then
    echo "❌ Error: descriptions/description.txt not found!"
    echo "Please create descriptions/description.txt with your product description."
    exit 1
fi

echo "✅ Configuration files found"
echo "🌐 Starting web server on http://localhost:3000"
echo ""
echo "📋 Available commands:"
echo "   - Open browser: http://localhost:3000"
echo "   - Stop server: Ctrl+C"
echo ""

# Start the console server
npm run console

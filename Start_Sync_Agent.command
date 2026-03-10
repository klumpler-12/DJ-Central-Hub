#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$DIR/plugins/mac-sync-agent"

echo "=========================================="
echo "    DJ Hub - Local Mac Sync Agent"
echo "=========================================="
echo "Installing dependencies if needed..."
npm install > /dev/null 2>&1

echo "Targeting Pi API: http://192.168.178.81:5000"
echo "Starting folder watcher daemon..."
node index.js

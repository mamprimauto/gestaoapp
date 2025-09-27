#!/bin/bash

# Kill any process on ports 3000 and 3001
echo "🧹 Limpando portas..."
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true

# Wait a moment
sleep 2

# Start Next.js on port 3000
echo "🚀 Iniciando servidor na porta 3000..."
PORT=3000 npm run dev
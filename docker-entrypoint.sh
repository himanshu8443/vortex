#!/bin/sh
set -e

# 1. Initialize database from template if it doesn't exist
if [ ! -f "/app/data/db.sqlite" ]; then
    echo "Database not found. Creating from template..."
    cp /app/template.db.sqlite /app/data/db.sqlite
    echo "Database initialized"
else
    echo "Database found."
fi

# 2. Start the App
echo "Starting..."
exec node server.js
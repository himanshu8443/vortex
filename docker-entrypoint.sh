#!/bin/sh
set -e

# Define where persistent data lives
DATA_DIR="/app/data"
ENV_FILE="$DATA_DIR/.env"
DB_FILE="$DATA_DIR/db.sqlite"

if [ ! -f "$DB_FILE" ]; then
    echo "Database not found. Creating from template..."
    cp /app/template.db.sqlite "$DB_FILE"
    echo "Database initialized"
else
    echo "Database found."
fi


if [ -z "$BETTER_AUTH_SECRET" ]; then
    
    if [ -f "$ENV_FILE" ]; then
        echo "Loading existing secrets from $ENV_FILE..."
        export $(grep "BETTER_AUTH_SECRET" "$ENV_FILE" | xargs)
    fi

    if [ -z "$BETTER_AUTH_SECRET" ]; then
        echo "No Auth Secret found. Generating a new secure key..."
        
        GENERATED_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        
        echo "BETTER_AUTH_SECRET=$GENERATED_SECRET" >> "$ENV_FILE"
        
        export BETTER_AUTH_SECRET="$GENERATED_SECRET"
        
        echo "New Auth Secret generated and saved."
    fi
else
    echo "Using BETTER_AUTH_SECRET provided via environment variables."
fi

echo "Starting Vortex..."
exec node server.js
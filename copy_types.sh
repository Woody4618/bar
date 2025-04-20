#!/bin/bash

# This script will copy the types and IDL files to the app and raspberry directories
# because otherwise its annoying to copy them manually

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Function to print error messages
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if target directory exists
if [ ! -d "target" ]; then
    print_error "target directory not found. Please run 'anchor build' first."
    exit 1
fi

# Check if app directory exists
if [ ! -d "app" ]; then
    print_error "app directory not found."
    exit 1
fi

# Check if raspberry directory exists
if [ ! -d "raspberry" ]; then
    print_error "raspberry directory not found."
    exit 1
fi

# Create necessary directories if they don't exist
print_status "Creating directories..."
mkdir -p app/src/types
mkdir -p app/src/idl
mkdir -p app/src/util
mkdir -p raspberry/src
mkdir -p app/app/pages/api

# Copy IDL files
print_status "Copying IDL files..."
if [ -d "target/idl" ]; then
    # Copy let_me_buy.json to all locations
    if [ -f "target/idl/let_me_buy.json" ]; then
        cp target/idl/let_me_buy.json app/src/util/
        cp target/idl/let_me_buy.json raspberry/src/
        cp target/idl/let_me_buy.json app/pages/api/
        print_status "let_me_buy.json copied successfully."
    else
        print_error "let_me_buy.json not found in target/idl/"
        exit 1
    fi
else
    print_error "target/idl directory not found."
    exit 1
fi

# Copy type files
print_status "Copying type files..."
if [ -d "target/types" ]; then
    # Copy let_me_buy.ts to all locations
    if [ -f "target/types/let_me_buy.ts" ]; then
        cp target/types/let_me_buy.ts app/src/util/
        cp target/types/let_me_buy.ts raspberry/src/
        cp target/types/let_me_buy.ts app/pages/api/
        print_status "let_me_buy.ts copied successfully."
    else
        print_error "let_me_buy.ts not found in target/types/"
        exit 1
    fi
else
    print_error "target/types directory not found."
    exit 1
fi

print_status "All files copied successfully!" 
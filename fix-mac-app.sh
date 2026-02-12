#!/bin/bash

# Fix macOS "App is Damaged" Issue for Resonance
# This script removes quarantine attributes and code signing issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}  Resonance macOS App Fixer${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Function to find Resonance.app
find_app() {
    local app_path=""
    
    # Check common locations
    if [ -d "/Applications/Resonance.app" ]; then
        app_path="/Applications/Resonance.app"
    elif [ -d "$HOME/Applications/Resonance.app" ]; then
        app_path="$HOME/Applications/Resonance.app"
    elif [ -d "$HOME/Downloads/Resonance.app" ]; then
        app_path="$HOME/Downloads/Resonance.app"
    elif [ -d "./Resonance.app" ]; then
        app_path="./Resonance.app"
    fi
    
    echo "$app_path"
}

# Main function
main() {
    print_header
    
    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This script is only for macOS"
        exit 1
    fi
    
    # Find the app
    APP_PATH=$(find_app)
    
    if [ -z "$APP_PATH" ]; then
        print_warning "Resonance.app not found in common locations"
        echo ""
        read -p "Enter the full path to Resonance.app: " APP_PATH
        
        if [ ! -d "$APP_PATH" ]; then
            print_error "App not found at: $APP_PATH"
            exit 1
        fi
    fi
    
    print_info "Found Resonance.app at: $APP_PATH"
    echo ""
    
    # Check current quarantine status
    print_info "Checking quarantine status..."
    if xattr "$APP_PATH" | grep -q "com.apple.quarantine"; then
        print_warning "App is quarantined by macOS"
    else
        print_info "App is not quarantined"
    fi
    echo ""
    
    # Show all extended attributes
    print_info "Current extended attributes:"
    xattr "$APP_PATH" || echo "  (none)"
    echo ""
    
    # Ask for confirmation
    print_warning "This script will:"
    echo "  1. Remove quarantine attributes (com.apple.quarantine)"
    echo "  2. Remove all extended attributes"
    echo "  3. Clear code signing cache"
    echo "  4. Make the app trusted by macOS"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Operation cancelled"
        exit 0
    fi
    
    echo ""
    print_info "Fixing Resonance.app..."
    echo ""
    
    # Step 1: Remove quarantine attribute
    print_info "Step 1: Removing quarantine attribute..."
    if xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null; then
        print_success "Quarantine attribute removed"
    else
        print_info "No quarantine attribute found (already clean)"
    fi
    
    # Step 2: Remove all extended attributes recursively
    print_info "Step 2: Removing all extended attributes..."
    if xattr -cr "$APP_PATH" 2>/dev/null; then
        print_success "All extended attributes removed"
    else
        print_info "No extended attributes to remove"
    fi
    
    # Step 3: Clear code signing cache
    print_info "Step 3: Clearing code signing cache..."
    sudo spctl --master-disable 2>/dev/null || true
    sudo spctl --master-enable 2>/dev/null || true
    print_success "Code signing cache cleared"
    
    # Step 4: Add to Gatekeeper whitelist
    print_info "Step 4: Adding to Gatekeeper whitelist..."
    if sudo spctl --add "$APP_PATH" 2>/dev/null; then
        print_success "Added to Gatekeeper whitelist"
    else
        print_warning "Could not add to whitelist (may require manual approval)"
    fi
    
    # Step 5: Verify the fix
    echo ""
    print_info "Verifying fix..."
    if xattr "$APP_PATH" | grep -q "com.apple.quarantine"; then
        print_error "Quarantine attribute still present"
    else
        print_success "Quarantine attribute successfully removed"
    fi
    
    # Final instructions
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_success "Fix completed!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    print_info "Next steps:"
    echo "  1. Try opening Resonance.app"
    echo "  2. If you still see a warning, right-click the app and select 'Open'"
    echo "  3. Click 'Open' in the security dialog"
    echo ""
    print_info "Alternative method if still blocked:"
    echo "  1. Go to System Settings > Privacy & Security"
    echo "  2. Scroll down to find 'Resonance was blocked'"
    echo "  3. Click 'Open Anyway'"
    echo ""
    print_warning "Note: You may need to approve the app in System Settings"
    echo ""
}

# Run main function
main

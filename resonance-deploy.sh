#!/bin/bash

# Resonance Deployment Script
# Automates the build and release process for Resonance

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
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

# Function to get next version
get_next_version() {
    local current_version=$(git tag -l | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1)
    if [ -z "$current_version" ]; then
        echo "v1.0.0"
        return
    fi
    
    # Remove 'v' prefix and split version
    local version_num=${current_version#v}
    local major=$(echo $version_num | cut -d. -f1)
    local minor=$(echo $version_num | cut -d. -f2)
    local patch=$(echo $version_num | cut -d. -f3)
    
    # Increment patch version
    patch=$((patch + 1))
    
    echo "v${major}.${minor}.${patch}"
}

# Main deployment process
main() {
    print_info "Starting Resonance deployment process..."
    echo ""
    
    # Check if we're in the right directory
    if [ ! -d "void-editor" ]; then
        print_error "void-editor directory not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes."
        read -p "Do you want to commit them? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add -A
            read -p "Enter commit message: " commit_msg
            git commit -m "$commit_msg"
            print_success "Changes committed"
        else
            print_error "Please commit or stash your changes before deploying."
            exit 1
        fi
    fi
    
    # Get version
    local next_version=$(get_next_version)
    print_info "Current latest version: $(git tag -l | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -1)"
    print_info "Suggested next version: $next_version"
    read -p "Enter version to deploy (or press Enter for $next_version): " version
    version=${version:-$next_version}
    
    # Validate version format
    if ! [[ $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format. Use format: v1.2.3"
        exit 1
    fi
    
    # Check if tag already exists
    if git rev-parse "$version" >/dev/null 2>&1; then
        print_error "Tag $version already exists!"
        exit 1
    fi
    
    echo ""
    print_info "Deployment Summary:"
    echo "  Version: $version"
    echo "  Branch: $(git branch --show-current)"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo ""
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled."
        exit 0
    fi
    
    # Build React components
    print_info "Building React components..."
    cd void-editor
    npm run buildreact
    cd ..
    print_success "React components built"
    
    # Push to main branch
    print_info "Pushing to main branch..."
    git push origin main
    print_success "Pushed to main"
    
    # Create and push tag
    print_info "Creating release tag $version..."
    read -p "Enter release notes (or press Enter for default): " release_notes
    if [ -z "$release_notes" ]; then
        release_notes="Release $version"
    fi
    
    git tag -a "$version" -m "$release_notes"
    print_success "Tag created"
    
    print_info "Pushing tag to GitHub..."
    git push origin "$version"
    print_success "Tag pushed"
    
    echo ""
    print_success "Deployment initiated successfully!"
    echo ""
    print_info "GitHub Actions is now building:"
    echo "  • macOS ARM64 version"
    echo "  • Windows x64 version"
    echo ""
    print_info "Monitor build progress at:"
    echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
    echo ""
    print_info "Release will be available at:"
    echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/$version"
    echo ""
}

# Run main function
main

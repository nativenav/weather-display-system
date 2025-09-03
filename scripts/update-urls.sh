#!/bin/bash
# Weather Display System - URL Update Automation Script
# Usage: ./scripts/update-urls.sh <old_url> <new_url>
# Example: ./scripts/update-urls.sh "https://f1de89eb.weather-display-blue.pages.dev" "https://wds.nativenav.com"

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Validate arguments
if [ $# -ne 2 ]; then
    print_error "Usage: $0 <old_url> <new_url>"
    print_error "Example: $0 'https://f1de89eb.weather-display-blue.pages.dev' 'https://wds.nativenav.com'"
    exit 1
fi

OLD_URL="$1"
NEW_URL="$2"

print_status "Starting URL update process..."
print_status "OLD URL: $OLD_URL"
print_status "NEW URL: $NEW_URL"

# Change to project root directory
cd "$(dirname "$0")/.."

# Files to update (relative to project root)
FILES_TO_UPDATE=(
    "README.md"
    "DEVELOPMENT-SOLUTIONS-NOTEBOOK.md"
    "frontend/README.md"
    "backend/README.md"
    "docs/ADR-0001.md"
    "docs/ENDPOINT-MANAGEMENT.md"
    "docs/ESP32C3-INTEGRATION.md"
    "firmware/SETUP.md"
    "firmware/ESP32C3_STATUS.md"
)

# Create backup directory with timestamp
BACKUP_DIR="backups/url-update-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_step "1. Creating backups..."
for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/$(basename "$file")"
        print_status "Backed up: $file"
    else
        print_warning "File not found (skipping): $file"
    fi
done

print_step "2. Updating URLs in documentation files..."
updated_count=0
for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        # Count occurrences before replacement
        before_count=$(grep -c "$OLD_URL" "$file" 2>/dev/null || true)
        
        if [ "$before_count" -gt 0 ]; then
            # Perform replacement (escaping forward slashes for sed)
            old_escaped=$(echo "$OLD_URL" | sed 's/[[\.*^$()+?{|]/\\&/g' | sed 's|/|\\/|g')
            new_escaped=$(echo "$NEW_URL" | sed 's|/|\\/|g')
            
            sed -i '' "s|$old_escaped|$NEW_URL|g" "$file"
            
            # Count occurrences after replacement to verify
            after_count=$(grep -c "$OLD_URL" "$file" 2>/dev/null || true)
            replaced_count=$((before_count - after_count))
            
            print_status "Updated $file: $replaced_count occurrences"
            updated_count=$((updated_count + 1))
        else
            print_status "No changes needed in: $file"
        fi
    fi
done

print_step "3. Searching for any missed occurrences..."
# Search for the old URL in all markdown files
remaining=$(find . -name "*.md" -not -path "./node_modules/*" -not -path "./.git/*" -exec grep -l "$OLD_URL" {} \; 2>/dev/null || true)
if [ -n "$remaining" ]; then
    print_warning "Old URL still found in these files:"
    echo "$remaining"
else
    print_status "All occurrences have been updated successfully"
fi

print_step "4. Validating new URL accessibility..."
if command -v curl >/dev/null 2>&1; then
    if curl -s --head "$NEW_URL" | head -n 1 | grep -q "200\|301\|302"; then
        print_status "New URL is accessible: $NEW_URL"
    else
        print_warning "New URL may not be fully accessible yet (SSL certificate might still be provisioning)"
    fi
else
    print_warning "curl not available - skipping URL validation"
fi

print_step "5. Git status check..."
if git status --porcelain | grep -q .; then
    print_status "Files have been modified. Ready for commit."
    git status --short
else
    print_status "No files were modified."
fi

print_status "URL update process completed!"
print_status "Updated $updated_count files"
print_status "Backups stored in: $BACKUP_DIR"
print_status ""
print_status "Next steps:"
print_status "1. Review changes: git diff"
print_status "2. Commit changes: git add . && git commit -m '📝 docs: update URLs to $NEW_URL'"
print_status "3. Push to remote: git push origin main"

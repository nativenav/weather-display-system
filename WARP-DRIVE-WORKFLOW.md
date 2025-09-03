# Warp Drive AI Workflow
# Documentation Updates & Git Operations

> **AI Agent Workflow for Weather Display System**  
> *Executable commands with parameters for consistent documentation updates and repository maintenance*

---

## 🤖 Workflow Overview

This workflow provides AI agents with systematic steps to:
1. Update project documentation consistently
2. Commit changes with proper messages
3. Push to remote repositories
4. Handle common maintenance tasks

### Parameters Used in This Workflow
- `{project_name}` - Weather Display System project name
- `{base_url}` - Backend API base URL
- `{frontend_url}` - Frontend management interface URL
- `{old_url}` - Previous URL being replaced
- `{new_url}` - New URL being implemented
- `{commit_message}` - Git commit message with emoji prefix

---

## 📝 Step 1: Documentation File Locations

### Primary Documentation Files to Update
Execute this command to list all documentation files:

```bash
find /Users/nives/Documents/Arduino/{project_name} -name "*.md" -type f | grep -v node_modules | grep -v .git | sort
```

### Critical Files That Must Be Updated
```bash
# Main project documentation
/Users/nives/Documents/Arduino/{project_name}/README.md
/Users/nives/Documents/Arduino/{project_name}/DEVELOPMENT-SOLUTIONS-NOTEBOOK.md
/Users/nives/Documents/Arduino/{project_name}/CHANGELOG.md

# Component documentation  
/Users/nives/Documents/Arduino/{project_name}/frontend/README.md
/Users/nives/Documents/Arduino/{project_name}/backend/README.md

# Technical documentation
/Users/nives/Documents/Arduino/{project_name}/docs/ADR-0001.md
/Users/nives/Documents/Arduino/{project_name}/docs/ENDPOINT-MANAGEMENT.md
/Users/nives/Documents/Arduino/{project_name}/docs/ESP32C3-INTEGRATION.md

# Hardware documentation
/Users/nives/Documents/Arduino/{project_name}/firmware/SETUP.md
/Users/nives/Documents/Arduino/{project_name}/firmware/ESP32C3_STATUS.md
```

---

## 🔍 Step 2: Search and Verify Current URLs

### Find All URL Occurrences
```bash
cd /Users/nives/Documents/Arduino/{project_name}
grep -r "https://.*\.pages\.dev" . --include="*.md" | grep -v ".git" | grep -v "node_modules"
```

### Search for Specific URL Pattern
```bash
cd /Users/nives/Documents/Arduino/{project_name}
grep -r "{old_url}" . --include="*.md" | grep -v ".git"
```

### Verify New URL Accessibility
```bash
curl -I {new_url}
```

---

## ✏️ Step 3: Update Documentation Files

### Mass URL Replacement (Use with caution)
```bash
cd /Users/nives/Documents/Arduino/{project_name}

# Create backup first
mkdir -p backups/$(date +%Y%m%d-%H%M%S)
find . -name "*.md" -not -path "./.git/*" -exec cp {} backups/$(date +%Y%m%d-%H%M%S)/ \;

# Replace URLs in all markdown files
find . -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -exec sed -i '' 's|{old_url}|{new_url}|g' {} +
```

### Update Specific Documentation Sections
Execute these commands for targeted updates:

#### Update Main README Live System Status
```bash
cd /Users/nives/Documents/Arduino/{project_name}
sed -i '' 's|🌤️ \*\*Live System Status\*\*: \[Management Interface\]([^)]*)|🌤️ **Live System Status**: [Management Interface]({frontend_url})|g' README.md
```

#### Update Management Interface URL in README
```bash
cd /Users/nives/Documents/Arduino/{project_name}
sed -i '' 's|\*\*https://[^*]*\*\*|**{frontend_url}**|g' README.md
```

#### Update Development Notebook Live URLs
```bash
cd /Users/nives/Documents/Arduino/{project_name}
sed -i '' 's|- \*\*Web Interface\*\*: https://[^[:space:]]*|- **Web Interface**: {frontend_url}|g' DEVELOPMENT-SOLUTIONS-NOTEBOOK.md
```

---

## 📊 Step 4: Validate Changes

### Check Git Status
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git status
```

### Review Changes Made
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git diff
```

### Count Updated Files
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git status --porcelain | wc -l
```

### Verify No Old URLs Remain
```bash
cd /Users/nives/Documents/Arduino/{project_name}
grep -r "{old_url}" . --include="*.md" | grep -v ".git" | grep -v "backups"
```

---

## 🚀 Step 5: Git Operations

### Stage All Changes
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git add .
```

### Check Staged Changes
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git diff --cached --stat
```

### Commit with Conventional Commit Message
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git commit -m "{commit_message}"
```

### Common Commit Message Templates
- `📝 docs: update URLs to {new_url}`
- `🔧 fix: update documentation URLs`
- `✨ feat: add friendly URL {new_url}`
- `📚 docs: update {project_name} documentation`
- `🚀 deploy: update production URLs`

### Push to Remote Repository
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git push origin main
```

### Verify Remote Push Success
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git log --oneline -1
```

---

## 🔧 Step 6: Post-Update Verification

### Test New URLs
```bash
# Test frontend accessibility
curl -I {frontend_url}

# Test backend health
curl -I {base_url}/health

# Test API endpoints
curl -I {base_url}/api/v1/stations
```

### Verify Documentation Consistency
```bash
cd /Users/nives/Documents/Arduino/{project_name}

# Check all markdown files for consistency
find . -name "*.md" -exec grep -l "{frontend_url}" {} \;

# Verify no broken links remain
grep -r "https://[^[:space:]]*\.pages\.dev" . --include="*.md" | grep -v "{new_url}"
```

### Generate Documentation Report
```bash
cd /Users/nives/Documents/Arduino/{project_name}

echo "=== DOCUMENTATION UPDATE REPORT ==="
echo "Project: {project_name}"
echo "Updated URL: {new_url}"
echo "Files modified: $(git diff HEAD~1 --name-only | wc -l)"
echo "Commit: $(git log --oneline -1)"
echo "==================================="
```

---

## 🛠️ Step 7: Emergency Rollback (If Needed)

### Rollback Last Commit (Local)
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git reset --soft HEAD~1
```

### Rollback and Discard Changes
```bash
cd /Users/nives/Documents/Arduino/{project_name}
git reset --hard HEAD~1
```

### Restore from Backup
```bash
cd /Users/nives/Documents/Arduino/{project_name}
# Find latest backup
ls -la backups/
# Restore files from backup directory
cp backups/[timestamp]/* .
```

---

## 📋 Complete Workflow Example

### Example: Updating Weather Display System URLs
```bash
# Set variables
PROJECT_NAME="weather-display-system"
OLD_URL="https://f1de89eb.weather-display-blue.pages.dev"
NEW_URL="https://wds.nativenav.com"
BASE_URL="https://weather-backend.nativenav.workers.dev"

# Navigate to project
cd /Users/nives/Documents/Arduino/${PROJECT_NAME}

# Backup current state
mkdir -p backups/$(date +%Y%m%d-%H%M%S)
find . -name "*.md" -not -path "./.git/*" -exec cp {} backups/$(date +%Y%m%d-%H%M%S)/ \;

# Update URLs
find . -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" -exec sed -i '' "s|${OLD_URL}|${NEW_URL}|g" {} +

# Verify changes
git status
git diff --stat

# Stage and commit
git add .
git commit -m "📝 docs: update URLs to ${NEW_URL}"

# Push to remote
git push origin main

# Verify deployment
curl -I ${NEW_URL}
curl -I ${BASE_URL}/health

echo "✅ Documentation update completed successfully"
```

---

## 🚨 Common Issues & Solutions

### Issue: SSL Certificate Not Ready
```bash
# Test without SSL first
curl -I http://{new_domain}

# Wait and retry HTTPS
sleep 300
curl -I {new_url}
```

### Issue: Git Push Fails
```bash
cd /Users/nives/Documents/Arduino/{project_name}

# Pull latest changes first
git pull origin main

# Resolve conflicts if any
git status

# Push again
git push origin main
```

### Issue: URLs Not Updated
```bash
cd /Users/nives/Documents/Arduino/{project_name}

# Check for escaped characters
grep -r "https://.*\.pages\.dev" . --include="*.md"

# Manual update needed files
vim [filename]
```

---

## ✅ Success Criteria Checklist

Execute this verification checklist after completing the workflow:

```bash
cd /Users/nives/Documents/Arduino/{project_name}

echo "📋 VERIFICATION CHECKLIST"
echo "========================"

# 1. All markdown files updated
echo -n "✓ Documentation files updated: "
git diff HEAD~1 --name-only | grep ".md" | wc -l

# 2. No old URLs remain  
OLD_URLS=$(grep -r "{old_url}" . --include="*.md" | grep -v ".git" | grep -v "backups" | wc -l)
if [ $OLD_URLS -eq 0 ]; then
    echo "✓ No old URLs found"
else
    echo "⚠️  $OLD_URLS old URLs still present"
fi

# 3. New URL is accessible
if curl -s --head {new_url} | head -n 1 | grep -q "200\|301\|302"; then
    echo "✓ New URL is accessible"
else
    echo "⚠️  New URL not accessible"
fi

# 4. Changes committed
echo -n "✓ Changes committed: "
git log --oneline -1

# 5. Pushed to remote
git log origin/main --oneline -1 >/dev/null 2>&1 && echo "✓ Pushed to remote" || echo "⚠️  Not pushed to remote"

echo "========================"
echo "✅ Workflow completed"
```

---

**Workflow Version**: 1.0  
**Compatible With**: Warp Drive AI Agents  
**Last Updated**: September 3, 2025

*This workflow ensures consistent documentation updates and proper Git operations for {project_name} maintenance.*

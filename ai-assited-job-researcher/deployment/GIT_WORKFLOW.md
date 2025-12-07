# Git-Based Deployment Workflow

This guide explains how to use git to deploy and update your AI-Assisted Job Hunter application on your VPS.

## Repository Information

- **GitHub Repository**: https://github.com/gametimebrizzle/deep-ai-job-researcher.git
- **VPS Path**: `/var/www/resume-hunter`
- **VPS User**: `user@45.90.109.196`

## Initial Setup on VPS

### Option 1: Fresh Clone (Recommended for New Deployments)

```bash
# SSH to VPS
ssh user@45.90.109.196

# Remove existing directory if present
sudo rm -rf /var/www/resume-hunter

# Clone from GitHub
sudo git clone https://github.com/gametimebrizzle/deep-ai-job-researcher.git /var/www/resume-hunter

# Set proper ownership
sudo chown -R $USER:$USER /var/www/resume-hunter

# Navigate to directory
cd /var/www/resume-hunter

# Run deployment script
./deployment/deploy.sh
```

### Option 2: Convert Existing Directory to Git

If you already have code deployed via rsync:

```bash
# SSH to VPS
ssh user@45.90.109.196

# Navigate to app directory
cd /var/www/resume-hunter

# Initialize git
git init

# Add remote
git remote add origin https://github.com/gametimebrizzle/deep-ai-job-researcher.git

# Fetch from remote
git fetch origin

# Reset to match remote (this will overwrite local changes)
git reset --hard origin/master

# Install and build
npm install
npm run build
pm2 restart resume-hunter
```

## Daily Workflow: Making Updates

### 1. Local Development

Work on your local machine as usual:

```bash
# Navigate to project
cd ~/code-projects/hyperbrowser-app-examples/ai-assited-job-researcher

# Make your changes
# ... edit files ...

# Test locally
npm run dev

# Run tests
npm test
```

### 2. Commit and Push Changes

```bash
# Check what changed
git status

# Add files
git add .
# or add specific files:
# git add src/components/NewComponent.tsx

# Commit with a meaningful message
git commit -m "Add new feature: XYZ"

# Push to GitHub
git push origin master
```

### 3. Deploy to VPS

#### Option A: Using the Quick Update Script (Easiest)

```bash
# SSH to VPS
ssh user@45.90.109.196

# Run update script
cd /var/www/resume-hunter
./deployment/update-app.sh
```

The script automatically:
- Pulls latest code from GitHub
- Installs/updates dependencies
- Rebuilds the Next.js app
- Restarts PM2

#### Option B: Manual Update

```bash
# SSH to VPS
ssh user@45.90.109.196

# Navigate to app
cd /var/www/resume-hunter

# Pull latest changes
git pull origin master

# Install any new dependencies
npm install

# Rebuild app
npm run build

# Restart
pm2 restart resume-hunter

# Check status
pm2 status
```

### 4. Verify Deployment

```bash
# Check PM2 status
pm2 status resume-hunter

# Check logs for errors
pm2 logs resume-hunter --lines 50

# Test the app
curl http://localhost:3030

# Or visit in browser
# https://resume-hunter.jbresearch-llc.com
```

## Common Git Commands

### Check Status

```bash
# On VPS: See current branch and status
cd /var/www/resume-hunter
git status
git branch
git log --oneline -5
```

### View Recent Changes

```bash
# See what changed in latest commits
git log --oneline -10
git show HEAD
git diff HEAD~1 HEAD
```

### Revert Changes

```bash
# Discard local changes (careful!)
git reset --hard HEAD

# Revert to specific commit
git reset --hard <commit-hash>
pm2 restart resume-hunter
```

### Branch Management

```bash
# Create and switch to new branch (for testing)
git checkout -b feature-test

# Switch back to master
git checkout master

# Pull specific branch
git pull origin main  # if using main instead of master
```

## Troubleshooting

### Git Pull Fails (Merge Conflicts)

```bash
# If you have uncommitted changes on VPS
git stash
git pull origin master
git stash pop

# Or discard VPS changes and use remote version
git reset --hard origin/master
```

### Need to Update .env.local

```bash
# .env.local is git-ignored, so you need to manually update it
nano /var/www/resume-hunter/.env.local
pm2 restart resume-hunter
```

### Deployment Failed

```bash
# Check PM2 logs
pm2 logs resume-hunter

# Check nginx logs
sudo tail -f /var/log/nginx/resume-hunter.error.log

# Rebuild manually
cd /var/www/resume-hunter
rm -rf .next
npm run build
pm2 restart resume-hunter
```

### Wrong Branch

```bash
# Check current branch
git branch

# Switch to correct branch
git checkout master  # or main

# Pull latest
git pull origin master
```

## Best Practices

1. **Always commit and push from local machine first**
   - Don't make code changes directly on VPS
   - Use VPS only for pulling and deploying

2. **Use meaningful commit messages**
   ```bash
   # Good
   git commit -m "Fix job matching algorithm for remote positions"
   
   # Bad
   git commit -m "fix stuff"
   ```

3. **Test locally before deploying**
   ```bash
   npm run dev       # Test in development
   npm test          # Run tests
   npm run build     # Test production build
   ```

4. **Check PM2 logs after deployment**
   ```bash
   pm2 logs resume-hunter --lines 50
   ```

5. **Keep dependencies updated**
   ```bash
   npm outdated      # Check for updates
   npm update        # Update dependencies
   ```

## Deployment Checklist

Before deploying major changes:

- [ ] Code tested locally
- [ ] Tests passing (`npm test`)
- [ ] Production build works (`npm run build`)
- [ ] Committed and pushed to GitHub
- [ ] Environment variables checked on VPS
- [ ] Deployment script runs successfully
- [ ] PM2 status shows app running
- [ ] Browser test at https://resume-hunter.jbresearch-llc.com
- [ ] Check PM2 logs for errors

## Alternative: Automated Deployment

For even more automation, consider setting up GitHub Actions to automatically deploy when you push to master:

1. Create `.github/workflows/deploy.yml`
2. Add SSH keys to GitHub secrets
3. Configure workflow to SSH and run update script

This is optional and can be set up later if desired.

## Support

For deployment issues:
- Check logs: `pm2 logs resume-hunter`
- Check nginx: `sudo tail -f /var/log/nginx/resume-hunter.error.log`
- Full guide: `deployment/DEPLOYMENT.md`
- Quick guide: `deployment/QUICKSTART.md`


# Deployment Guide

Complete deployment documentation and scripts for AI-Assisted Job Hunter.

## Quick Links

- **[Quick Start Guide](QUICKSTART.md)** - 5-minute deployment
- **[Full Deployment Guide](DEPLOYMENT.md)** - Complete setup instructions
- **[Git Workflow](GIT_WORKFLOW.md)** - Git-based deployment workflow

## Deployment Files

### Configuration Files

#### `ecosystem.config.js` - PM2 Configuration Template

**Important:** This is a **TEMPLATE file** - do not modify it directly on the server.

During deployment, the script:
1. Reads this template
2. Replaces `__APP_DIR__` placeholder with actual deployment path
3. Generates `ecosystem.config.local.js` (git-ignored)
4. PM2 uses the generated local config

This approach ensures:
- ✅ Git-tracked files remain unchanged
- ✅ Deployments are idempotent (can run multiple times)
- ✅ Template can be versioned and updated
- ✅ No git state pollution

#### `nginx/resume-hunter.jbresearch-llc.com.conf` - Nginx Configuration

Nginx reverse proxy configuration for the application. Copy this to `/etc/nginx/sites-available/` on the VPS.

#### `.env.production` - Environment Template

Template for production environment variables. Copy to `.env.local` and fill in your API keys.

### Scripts

#### `deploy.sh` - Initial Deployment Script

Automated script for first-time deployment. Handles:
- PM2 installation
- Directory creation
- Application cloning from git
- Dependency installation
- Nginx configuration
- SSL certificate setup
- PM2 process startup

**Usage:**
```bash
ssh user@45.90.109.196
cd /var/www/resume-hunter
./deployment/deploy.sh
```

#### `update-app.sh` - Quick Update Script

Fast update script for deploying changes after git push.

**Usage:**
```bash
ssh user@45.90.109.196
cd /var/www/resume-hunter
./deployment/update-app.sh
```

Automatically:
- Pulls latest code from git
- Installs/updates dependencies
- Rebuilds the application
- Restarts PM2

## Deployment Workflow

### Initial Setup

```bash
# 1. Clone repository on VPS
ssh user@45.90.109.196
sudo git clone https://github.com/gametimebrizzle/deep-ai-job-researcher.git /var/www/resume-hunter
sudo chown -R $USER:$USER /var/www/resume-hunter

# 2. Run deployment script
cd /var/www/resume-hunter
./deployment/deploy.sh

# 3. Configure environment
nano .env.local  # Add API keys

# 4. Restart
pm2 restart resume-hunter
```

### Regular Updates

```bash
# Local: Push changes
git add .
git commit -m "Your changes"
git push origin master

# VPS: Update and deploy
ssh user@45.90.109.196
cd /var/www/resume-hunter
./deployment/update-app.sh
```

## Configuration Management

### Git-Ignored Files (Generated During Deployment)

These files are created during deployment and should NOT be committed:

- `ecosystem.config.local.js` - Generated PM2 config with actual paths
- `.env.local` - Production environment variables with actual API keys

### Git-Tracked Files (Templates)

These files are versioned and safe to commit:

- `deployment/ecosystem.config.js` - PM2 template
- `deployment/nginx/*.conf` - Nginx configurations
- `deployment/.env.production` - Environment variable template
- `deployment/*.sh` - Deployment scripts

## Production Setup

- **Repository**: https://github.com/gametimebrizzle/deep-ai-job-researcher.git
- **Deployed URL**: https://resume-hunter.jbresearch-llc.com
- **VPS IP**: 45.90.109.196
- **VPS User**: user
- **App Directory**: /var/www/resume-hunter
- **App Port**: 3030
- **Process Manager**: PM2
- **Web Server**: Nginx (reverse proxy)
- **SSL**: Let's Encrypt (auto-renewal)

## Troubleshooting

### Git shows modified files after deployment

This should no longer happen with the template approach. If you still see modified files:

```bash
git status
git diff ecosystem.config.js
```

If `ecosystem.config.js` is modified, you're using an old deployment script. Pull the latest version.

### PM2 can't find config file

Make sure the local config was generated:

```bash
ls -la ecosystem.config.local.js
```

If missing, regenerate it:

```bash
sed "s|__APP_DIR__|$(pwd)|g" deployment/ecosystem.config.js > ecosystem.config.local.js
pm2 restart resume-hunter
```

### Deployment is not idempotent

The new template approach makes deployments idempotent. You can run `deploy.sh` multiple times safely.

## Best Practices

1. **Never modify `ecosystem.config.js` directly on the server** - it's a template
2. **Always use the deployment scripts** - they handle configuration properly
3. **Keep API keys in `.env.local`** - never commit them
4. **Use git for all code changes** - don't edit files directly on VPS
5. **Test locally before deploying** - run tests and build locally first

## Support

For issues:
- Check PM2 logs: `pm2 logs resume-hunter`
- Check nginx logs: `sudo tail -f /var/log/nginx/resume-hunter.error.log`
- Review deployment logs in terminal output
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting


# Deployment Guide - PM2 + nginx

## Prerequisites

Ensure you have these environment variables set in production `.env.local` or `.env.production`:

```bash
# Required
HYPERBROWSER_API_KEY=your_hyperbrowser_key

# At least ONE AI provider key (priority: OpenAI > Anthropic > Google)
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
# OR
GOOGLE_AI_API_KEY=your_google_key

# Optional: Explicitly set provider
AI_PROVIDER=openai  # or claude, or google
```

## Deployment Process

### 1. Pull Latest Code

```bash
cd /var/www/resume-hunter
git pull origin master
```

### 2. Install Dependencies

```bash
# Install any new dependencies
npm install

# Or use clean install for production
npm ci
```

### 3. Build the Next.js Application

```bash
# Build for production
npm run build
```

**Expected output:**
- `.next/` directory with compiled production build
- Should see "Compiled successfully" message
- Build time: ~30-60 seconds

### 4. Restart PM2 Process

```bash
# Restart the app (replace 'resume-hunter' with your PM2 app name)
pm2 restart resume-hunter

# Or if you want to reload without downtime
pm2 reload resume-hunter

# Verify it's running
pm2 list
pm2 logs resume-hunter --lines 50
```

### 5. Save PM2 Configuration

```bash
# Save the current PM2 process list
pm2 save

# Ensure PM2 starts on boot
pm2 startup
```

## PM2 Configuration

If you don't have a PM2 ecosystem file yet, create one:

### `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'resume-hunter',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/resume-hunter',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000  // Change if different
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

**Start/restart using ecosystem file:**

```bash
pm2 start ecosystem.config.js
# or
pm2 reload ecosystem.config.js
```

## nginx Configuration

### Basic Configuration

Your nginx config should proxy to the Next.js port (default 3000):

```nginx
# /etc/nginx/sites-available/resume-hunter

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # For Let's Encrypt SSL (if using)
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Important for large file uploads (resume PDFs)
        client_max_body_size 10M;

        # Timeouts for long-running API calls
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "public, immutable";
    }

    # Cache images
    location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# SSL Configuration (if using HTTPS)
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # Same location blocks as HTTP above
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        client_max_body_size 10M;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
        send_timeout 300;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### Important nginx Settings for This App

1. **`client_max_body_size 10M`** - Allows PDF uploads up to 10MB (our limit is 5MB)
2. **Long timeouts (300s)** - LinkedIn scraping and job crawling can take time
3. **Proper headers** - Ensures X-Forwarded-* headers are set for logging

### Apply nginx Changes

```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx (no downtime)
sudo systemctl reload nginx

# Or restart if needed
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
```

## Complete Deployment Script

Create a deployment script for easy updates:

### `deploy.sh`

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Exit on error
set -e

# Navigate to project directory
cd /var/www/resume-hunter

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build application
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "♻️  Restarting PM2 process..."
pm2 reload resume-hunter

# Save PM2 state
pm2 save

# Show status
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 list

echo ""
echo "📝 Recent logs:"
pm2 logs resume-hunter --lines 20 --nostream

echo ""
echo "🌐 Testing endpoints..."
curl -s http://localhost:3000/api/analyze/resume | head -20
```

**Make it executable:**

```bash
chmod +x deploy.sh
```

**Run deployment:**

```bash
./deploy.sh
```

## Testing the Live App

### 1. Health Checks

```bash
# Check PM2 status
pm2 list
pm2 logs resume-hunter --lines 50

# Check Next.js is responding
curl http://localhost:3000

# Check API endpoints
curl http://localhost:3000/api/analyze/resume
curl http://localhost:3000/api/analyze/portfolio
curl http://localhost:3000/api/analyze/linkedin
```

### 2. Browser Testing

Visit your domain and test each mode:

**Resume Mode:**
- Upload a PDF resume
- Verify analysis completes
- Check job matches display

**Portfolio Mode:**
- Enter a portfolio URL
- Verify scraping works
- Check job matches

**LinkedIn Mode (NEW):**
- Upload PDF resume
- Enter LinkedIn profile URL
- Verify:
  - Profile scraping works
  - LinkedIn + resume merge
  - LinkedIn jobs appear
  - Score breakdowns display

### 3. Check Logs

```bash
# PM2 logs (live tail)
pm2 logs resume-hunter

# PM2 logs (specific lines)
pm2 logs resume-hunter --lines 100

# nginx access logs
sudo tail -f /var/log/nginx/access.log

# nginx error logs
sudo tail -f /var/log/nginx/error.log

# Application error logs
tail -f /var/www/resume-hunter/logs/err.log
```

### 4. Monitor Performance

```bash
# PM2 monitoring
pm2 monit

# Check memory/CPU usage
pm2 show resume-hunter

# System resources
htop
```

## Common Issues & Solutions

### Issue: Build Fails

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Issue: PM2 Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Restart PM2
pm2 delete resume-hunter
pm2 start ecosystem.config.js
```

### Issue: 502 Bad Gateway

```bash
# Check if Next.js is running
pm2 list

# Check if it's listening on correct port
netstat -tulpn | grep 3000

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: File Upload Fails

```bash
# Check nginx client_max_body_size
sudo nginx -T | grep client_max_body_size

# Should be at least 10M
```

### Issue: API Timeouts

```bash
# Check nginx timeout settings
sudo nginx -T | grep timeout

# Should have:
# proxy_connect_timeout 300
# proxy_read_timeout 300
# proxy_send_timeout 300
```

## Environment Variables Check

Verify all required env vars are set:

```bash
# Check .env.local or .env.production exists
ls -la /var/www/resume-hunter/.env*

# Verify key variables (without exposing values)
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('HYPERBROWSER_API_KEY:', process.env.HYPERBROWSER_API_KEY ? '✅ Set' : '❌ Missing');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? '✅ Set' : '❌ Missing');
"
```

## Rollback Procedure

If something goes wrong:

```bash
# Rollback to previous commit
git log --oneline -5  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart resume-hunter
```

## Monitoring & Alerts

### Set up PM2 monitoring (optional)

```bash
# Link to PM2 Plus for monitoring
pm2 link <secret-key> <public-key>

# Or use PM2 logs with logrotate
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Performance Optimization

### 1. Enable nginx Caching

Already configured in the nginx config above for static assets.

### 2. PM2 Cluster Mode

If you need to scale (multiple CPU cores):

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'resume-hunter',
    script: 'npm',
    args: 'start',
    instances: 2,  // Or 'max' for all CPUs
    exec_mode: 'cluster',
    // ... rest of config
  }]
}
```

### 3. Enable Compression

nginx gzip compression (add to nginx config):

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

## Quick Reference Commands

```bash
# Deployment
./deploy.sh                          # Full deployment

# PM2
pm2 restart resume-hunter            # Restart app
pm2 reload resume-hunter             # Zero-downtime reload
pm2 logs resume-hunter               # View logs
pm2 monit                            # Monitor resources
pm2 save                             # Save process list

# nginx
sudo nginx -t                        # Test config
sudo systemctl reload nginx          # Reload config
sudo systemctl restart nginx         # Restart nginx
sudo tail -f /var/log/nginx/error.log  # View errors

# Git
git pull origin master               # Pull updates
git status                           # Check status
git log --oneline -5                 # Recent commits

# Build
npm run build                        # Build Next.js
npm ci                               # Clean install deps
rm -rf .next                         # Clear cache
```

## Success Checklist

After deployment, verify:

- [ ] Code pulled successfully
- [ ] Dependencies installed
- [ ] Build completed without errors
- [ ] PM2 process restarted
- [ ] nginx responding (200 OK)
- [ ] All 3 modes accessible (Resume, Portfolio, LinkedIn)
- [ ] Resume upload works
- [ ] Portfolio scraping works
- [ ] LinkedIn mode accepts PDF + URL
- [ ] Job matches display correctly
- [ ] Score breakdowns show
- [ ] No errors in PM2 logs
- [ ] No errors in nginx logs

## Support

If you encounter issues:

1. Check logs: `pm2 logs resume-hunter`
2. Check nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verify env vars are set
4. Ensure API keys are valid
5. Check Hyperbrowser API status

---

**Deployment Time:** ~2-3 minutes
**Downtime:** 0 seconds (with `pm2 reload`)
**Rollback Time:** ~1 minute

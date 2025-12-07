# Deployment Guide for AI-Assisted Job Hunter

Deploy to `resume-hunter.jbresearch-llc.com` on Hostinger VPS.

## Server Information

- **Domain**: resume-hunter.jbresearch-llc.com
- **VPS IP**: 45.90.109.196 (IPv4), 2a02:4780:10:4182::1 (IPv6)
- **OS**: Debian 11
- **App Port**: 3030
- **DNS Status**: ✓ Configured (A record pointing to VPS)

## Prerequisites

Before deployment, ensure you have:

1. SSH access to the VPS: `ssh user@45.90.109.196`
2. API keys ready:
   - Hyperbrowser API key
   - At least one AI provider key (OpenAI, Anthropic, or Google AI)

## Quick Deployment

### Option 1: Automated Deployment Script

```bash
# On your local machine, upload code to VPS
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@45.90.109.196:/var/www/resume-hunter/

# SSH into VPS
ssh user@45.90.109.196

# Run deployment script
cd /var/www/resume-hunter
./deployment/deploy.sh
```

The script will:
- Install nginx, certbot, PM2
- Build the Next.js app
- Configure nginx as reverse proxy
- Obtain SSL certificate
- Start app with PM2

### Option 2: Manual Deployment

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js, nginx, certbot
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Install PM2 globally
sudo npm install -g pm2
```

#### 2. Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/resume-hunter
sudo chown -R $USER:$USER /var/www/resume-hunter

# Upload code (from local machine)
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@45.90.109.196:/var/www/resume-hunter/

# SSH to VPS and navigate to app
cd /var/www/resume-hunter

# Install dependencies
npm install

# Build production app
npm run build
```

#### 3. Configure Environment Variables

```bash
# Copy production env template
cp deployment/.env.production .env.local

# Edit with your API keys
nano .env.local
```

Add your keys:
```env
HYPERBROWSER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

#### 4. Configure nginx

```bash
# Copy nginx config
sudo cp deployment/nginx/resume-hunter.jbresearch-llc.com.conf \
  /etc/nginx/sites-available/resume-hunter.jbresearch-llc.com

# Enable site
sudo ln -s /etc/nginx/sites-available/resume-hunter.jbresearch-llc.com \
  /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

#### 5. Obtain SSL Certificate

```bash
# Create directory for certbot challenges
sudo mkdir -p /var/www/certbot

# Get certificate
sudo certbot --nginx -d resume-hunter.jbresearch-llc.com
```

#### 6. Start Application with PM2

```bash
# Update ecosystem config path
sed -i "s|/path/to/ai-assited-job-researcher|/var/www/resume-hunter|g" \
  deployment/ecosystem.config.js

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Start app
pm2 start deployment/ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

## Verification

1. **Check DNS propagation**:
   ```bash
   dig resume-hunter.jbresearch-llc.com
   # Should return: 45.90.109.196
   ```

2. **Check app is running**:
   ```bash
   pm2 status
   curl http://localhost:3030
   ```

3. **Check nginx**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

4. **Visit in browser**:
   - http://resume-hunter.jbresearch-llc.com (redirects to HTTPS)
   - https://resume-hunter.jbresearch-llc.com

## Updating the Application

```bash
# SSH to VPS
ssh user@45.90.109.196

# Navigate to app directory
cd /var/www/resume-hunter

# Pull latest code (or upload with rsync)
git pull  # if using git
# OR from local: rsync -avz ./ user@45.90.109.196:/var/www/resume-hunter/

# Install any new dependencies
npm install

# Rebuild app
npm run build

# Restart PM2
pm2 restart resume-hunter
```

## Monitoring & Management

### PM2 Commands

```bash
pm2 status              # View all apps
pm2 logs resume-hunter  # View logs
pm2 monit              # Monitor CPU/memory
pm2 restart resume-hunter  # Restart app
pm2 stop resume-hunter     # Stop app
pm2 delete resume-hunter   # Remove from PM2
```

### View Logs

```bash
# Application logs
pm2 logs resume-hunter

# Nginx access logs
sudo tail -f /var/log/nginx/resume-hunter.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/resume-hunter.error.log

# PM2 logs
tail -f /var/log/pm2/resume-hunter-out.log
tail -f /var/log/pm2/resume-hunter-error.log
```

### SSL Certificate Renewal

Certbot auto-renews certificates. To manually renew:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Troubleshooting

### App won't start

```bash
# Check logs
pm2 logs resume-hunter

# Check environment variables
cat .env.local

# Ensure build completed
ls -la .next/

# Try rebuilding
npm run build
pm2 restart resume-hunter
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status
curl http://localhost:3030

# Check nginx error logs
sudo tail -f /var/log/nginx/resume-hunter.error.log

# Restart services
pm2 restart resume-hunter
sudo systemctl restart nginx
```

### Port already in use

```bash
# Check what's using port 3030
sudo lsof -i :3030
sudo netstat -tlnp | grep 3030

# Kill process if needed
sudo kill -9 <PID>
```

### DNS not resolving

```bash
# Check DNS records
dig resume-hunter.jbresearch-llc.com

# Wait for propagation (up to 48 hours, usually minutes)
# Use online DNS checker: https://dnschecker.org/
```

## Firewall Configuration

If using UFW firewall:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Performance Optimization

### Enable Gzip in nginx

Already configured in the nginx config file.

### PM2 Cluster Mode (Optional)

To use all CPU cores, edit `deployment/ecosystem.config.js`:

```javascript
instances: 'max',  // Instead of 1
exec_mode: 'cluster'
```

Then restart:
```bash
pm2 restart resume-hunter
```

## Security Checklist

- [x] SSL certificate configured (HTTPS)
- [x] HSTS header enabled
- [x] Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- [x] Firewall configured (allow 80, 443, 22)
- [ ] Keep system updated: `sudo apt update && sudo apt upgrade`
- [ ] Regular SSL certificate renewal (automatic via certbot)
- [ ] Monitor logs for suspicious activity

## Removing Hostinger Managed Hosting

Since you're now serving from VPS, you can cancel the premium hosting for `jbresearch-llc.com`:

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com/)
2. Go to **Billing > Subscriptions**
3. Find the web hosting subscription for `jbresearch-llc.com`
4. Cancel the subscription

**Note**: Keep the domain registration active! Only cancel the web hosting service.

## Support

For issues:
- Check application logs: `pm2 logs resume-hunter`
- Check nginx logs: `/var/log/nginx/resume-hunter.*.log`
- Verify DNS: `dig resume-hunter.jbresearch-llc.com`
- Test locally: `curl http://localhost:3030`

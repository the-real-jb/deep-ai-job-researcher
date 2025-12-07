# Quick Start Deployment

Deploy AI-Assisted Job Hunter to `resume-hunter.jbresearch-llc.com` in 5 minutes.

## TL;DR

```bash
# 1. Upload code to VPS
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@45.90.109.196:/var/www/resume-hunter/

# 2. SSH to VPS
ssh user@45.90.109.196

# 3. Run automated deployment
cd /var/www/resume-hunter
./deployment/deploy.sh

# 4. Edit environment variables
nano .env.local  # Add your API keys

# 5. Restart app
pm2 restart resume-hunter
```

## What's Been Configured

✅ **DNS**: resume-hunter.jbresearch-llc.com → 45.90.109.196
✅ **Port**: 3030
✅ **Nginx**: Reverse proxy configuration ready
✅ **SSL**: Auto-configured via Let's Encrypt
✅ **PM2**: Process manager config ready

## Deployment Files

- `deployment/nginx/resume-hunter.jbresearch-llc.com.conf` - Nginx configuration
- `deployment/ecosystem.config.js` - PM2 configuration
- `deployment/.env.production` - Environment template
- `deployment/deploy.sh` - Automated deployment script
- `deployment/DEPLOYMENT.md` - Full deployment guide

## Essential Commands

```bash
# Application
pm2 status                  # Check status
pm2 logs resume-hunter      # View logs
pm2 restart resume-hunter   # Restart app

# Nginx
sudo systemctl status nginx
sudo nginx -t               # Test config
sudo systemctl restart nginx

# SSL
sudo certbot renew          # Renew certificate

# Logs
pm2 logs resume-hunter
sudo tail -f /var/log/nginx/resume-hunter.access.log
sudo tail -f /var/log/nginx/resume-hunter.error.log
```

## Environment Variables Required

```env
HYPERBROWSER_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here  # or ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY
PORT=3030
NODE_ENV=production
```

## Verify Deployment

1. Check DNS: `dig resume-hunter.jbresearch-llc.com`
2. Check app: `curl http://localhost:3030`
3. Visit: https://resume-hunter.jbresearch-llc.com

## Support

Full documentation: `deployment/DEPLOYMENT.md`

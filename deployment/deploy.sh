#!/bin/bash

# Deployment script for AI-Assisted Job Hunter
# Run this script on your VPS (45.90.109.196)

set -e  # Exit on error

echo "=========================================="
echo "AI-Assisted Job Hunter Deployment Script"
echo "=========================================="

# Configuration
APP_NAME="resume-hunter"
APP_DIR="/var/www/resume-hunter"
NGINX_CONFIG="/etc/nginx/sites-available/resume-hunter.jbresearch-llc.com"
DOMAIN="resume-hunter.jbresearch-llc.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should NOT be run as root${NC}"
   echo "Run as your regular user with sudo access"
   exit 1
fi

echo -e "${GREEN}Step 2: Installing PM2 globally...${NC}"
sudo npm install -g pm2

echo -e "${GREEN}Step 3: Creating application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

echo -e "${GREEN}Step 4: Creating directories...${NC}"
sudo mkdir -p /var/www/certbot
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

echo -e "${YELLOW}Step 5: Deploying application code...${NC}"
echo "Please upload your application code to: $APP_DIR"
echo "You can use: scp, rsync, or git clone"
echo ""
echo "Example with rsync:"
echo "  rsync -avz --exclude 'node_modules' --exclude '.next' ./ user@45.90.109.196:$APP_DIR/"
echo ""
read -p "Press Enter once you've uploaded the code..."

cd $APP_DIR

echo -e "${GREEN}Step 6: Installing Node.js dependencies...${NC}"
npm install

echo -e "${GREEN}Step 7: Building Next.js production app...${NC}"
npm run build

echo -e "${GREEN}Step 8: Setting up environment variables...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local from template...${NC}"
    cp deployment/.env.production .env.local
    echo -e "${RED}IMPORTANT: Edit .env.local and add your API keys!${NC}"
    echo "  nano .env.local"
    read -p "Press Enter after editing .env.local..."
fi

echo -e "${GREEN}Step 9: Configuring nginx...${NC}"

# Check if certificates exist to decide which config to use
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}Certificates not found. Using bootstrap configuration...${NC}"
    sudo cp deployment/nginx/resume-hunter.jbresearch-llc.com.conf.bootstrap $NGINX_CONFIG
else
    echo "Certificates found. Using full configuration."
    sudo cp deployment/nginx/resume-hunter.jbresearch-llc.com.conf $NGINX_CONFIG
fi

sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/

echo -e "${GREEN}Step 10: Testing nginx configuration...${NC}"
sudo nginx -t

echo -e "${GREEN}Step 11: Restarting nginx...${NC}"
sudo systemctl restart nginx

echo -e "${GREEN}Step 12: Obtaining SSL certificate with Let's Encrypt...${NC}"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "Obtaining certificates..."
    sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --non-interactive --agree-tos --email admin@jbresearch-llc.com
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Certificates obtained successfully! Switching to full Nginx configuration...${NC}"
        sudo cp deployment/nginx/resume-hunter.jbresearch-llc.com.conf $NGINX_CONFIG
        sudo nginx -t
        sudo systemctl restart nginx
    else
        echo -e "${RED}Failed to obtain certificates. Please check logs.${NC}"
        exit 1
    fi
else
    echo "Certificates already exist. Ensuring full config is active..."
    sudo cp deployment/nginx/resume-hunter.jbresearch-llc.com.conf $NGINX_CONFIG
    sudo nginx -t
    sudo systemctl reload nginx
fi

echo -e "${GREEN}Step 13: Starting application with PM2...${NC}"
# Update the ecosystem config with actual path
sed -i "s|/path/to/ai-assited-job-researcher|$APP_DIR|g" deployment/ecosystem.config.js

pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup

echo -e "${YELLOW}Copy and run the startup command shown above if this is first PM2 setup${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Your application is now running at:"
echo "  https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check app status"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart app"
echo "  pm2 stop $APP_NAME      - Stop app"
echo "  pm2 monit               - Monitor resources"
echo ""
echo "Nginx logs:"
echo "  sudo tail -f /var/log/nginx/resume-hunter.access.log"
echo "  sudo tail -f /var/log/nginx/resume-hunter.error.log"
echo ""

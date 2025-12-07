#!/bin/bash

# Quick update script for AI-Assisted Job Hunter
# Run this script on your VPS to pull and deploy latest changes

set -e  # Exit on error

APP_NAME="resume-hunter"
APP_DIR="/var/www/resume-hunter"
BRANCH="${1:-master}"  # Default to master, can pass branch as argument

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Updating ${APP_NAME} from git...${NC}"
echo -e "${GREEN}================================================${NC}"

cd $APP_DIR

echo -e "${YELLOW}Step 1: Pulling latest changes from ${BRANCH}...${NC}"
git fetch origin
git pull origin $BRANCH

echo -e "${YELLOW}Step 2: Installing/updating dependencies...${NC}"
npm install

echo -e "${YELLOW}Step 3: Building application...${NC}"
npm run build

echo -e "${YELLOW}Step 4: Restarting PM2...${NC}"
pm2 restart $APP_NAME

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Update complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "App status:"
pm2 status $APP_NAME

echo ""
echo "View logs: pm2 logs $APP_NAME"


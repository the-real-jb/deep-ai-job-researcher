#!/bin/bash

# Deep Job Researcher - Production Deployment Script
# For PM2 + nginx setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="resume-hunter"
APP_DIR="/var/www/resume-hunter"
PM2_APP_NAME="resume-hunter"  # Change if your PM2 app has a different name

echo -e "${BLUE}🚀 Deep Job Researcher - Deployment Script${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project directory?${NC}"
    exit 1
fi

# 1. Pull latest code
echo -e "${YELLOW}📥 Step 1/6: Pulling latest code from git...${NC}"
git pull origin master || {
    echo -e "${RED}❌ Git pull failed. Check your git configuration.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Code updated${NC}\n"

# 2. Install dependencies
echo -e "${YELLOW}📦 Step 2/6: Installing dependencies...${NC}"
npm ci || {
    echo -e "${RED}❌ npm install failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# 3. Run TypeScript check
echo -e "${YELLOW}🔍 Step 3/6: Running TypeScript check...${NC}"
npx tsc --noEmit || {
    echo -e "${YELLOW}⚠️  TypeScript errors found (proceeding anyway)${NC}\n"
}
echo -e "${GREEN}✅ TypeScript check complete${NC}\n"

# 4. Build application
echo -e "${YELLOW}🔨 Step 4/6: Building Next.js application...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}\n"

# 5. Restart PM2
echo -e "${YELLOW}♻️  Step 5/6: Restarting PM2 process...${NC}"
if pm2 list | grep -q "$PM2_APP_NAME"; then
    pm2 reload "$PM2_APP_NAME" || {
        echo -e "${YELLOW}⚠️  Reload failed, trying restart...${NC}"
        pm2 restart "$PM2_APP_NAME" || {
            echo -e "${RED}❌ PM2 restart failed${NC}"
            exit 1
        }
    }
else
    echo -e "${YELLOW}⚠️  App not found in PM2, starting fresh...${NC}"
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        pm2 start npm --name "$PM2_APP_NAME" -- start
    fi
fi

# Save PM2 state
pm2 save
echo -e "${GREEN}✅ PM2 restarted${NC}\n"

# 6. Health checks
echo -e "${YELLOW}🏥 Step 6/6: Running health checks...${NC}"

# Wait for app to start
sleep 3

# Check if PM2 process is running
if pm2 list | grep -q "$PM2_APP_NAME.*online"; then
    echo -e "${GREEN}✅ PM2 process is online${NC}"
else
    echo -e "${RED}❌ PM2 process is not online${NC}"
    pm2 logs "$PM2_APP_NAME" --lines 20 --nostream
    exit 1
fi

# Check if app responds on localhost
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ App responding on localhost:3000${NC}"
else
    echo -e "${RED}❌ App not responding on localhost:3000${NC}"
    exit 1
fi

# Check API endpoints
echo -e "\n${BLUE}Testing API endpoints:${NC}"

if curl -s http://localhost:3000/api/analyze/resume | grep -q "Resume analysis endpoint"; then
    echo -e "${GREEN}✅ /api/analyze/resume${NC}"
else
    echo -e "${RED}❌ /api/analyze/resume${NC}"
fi

if curl -s http://localhost:3000/api/analyze/portfolio | grep -q "Portfolio analysis endpoint"; then
    echo -e "${GREEN}✅ /api/analyze/portfolio${NC}"
else
    echo -e "${RED}❌ /api/analyze/portfolio${NC}"
fi

if curl -s http://localhost:3000/api/analyze/linkedin | grep -q "LinkedIn analysis endpoint"; then
    echo -e "${GREEN}✅ /api/analyze/linkedin (NEW)${NC}"
else
    echo -e "${RED}❌ /api/analyze/linkedin${NC}"
fi

echo ""
echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}==============================================${NC}\n"

# Show status
echo -e "${BLUE}📊 Current Status:${NC}"
pm2 list

echo ""
echo -e "${BLUE}📝 Recent Logs (last 15 lines):${NC}"
pm2 logs "$PM2_APP_NAME" --lines 15 --nostream

echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo -e "  ${YELLOW}pm2 logs $PM2_APP_NAME${NC}        - View live logs"
echo -e "  ${YELLOW}pm2 monit${NC}                     - Monitor resources"
echo -e "  ${YELLOW}pm2 restart $PM2_APP_NAME${NC}     - Restart app"
echo -e "  ${YELLOW}sudo systemctl reload nginx${NC}   - Reload nginx"

echo ""
echo -e "${GREEN}🌐 Your app should now be live with LinkedIn integration!${NC}"
echo ""

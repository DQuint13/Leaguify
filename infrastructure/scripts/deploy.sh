#!/bin/bash

# Deployment script for Leaguify infrastructure
# Usage: ./deploy.sh [environment] [region]

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_PREFIX="${ENVIRONMENT}-leaguify"

echo "Deploying Leaguify infrastructure..."
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local template_file=$2
    local parameters=$3
    
    echo -e "${YELLOW}Deploying ${stack_name}...${NC}"
    
    if [ -z "$parameters" ]; then
        aws cloudformation deploy \
            --template-file "${template_file}" \
            --stack-name "${stack_name}" \
            --region "${REGION}" \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides Environment="${ENVIRONMENT}"
    else
        aws cloudformation deploy \
            --template-file "${template_file}" \
            --stack-name "${stack_name}" \
            --region "${REGION}" \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides Environment="${ENVIRONMENT}" ${parameters}
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${stack_name} deployed successfully${NC}"
    else
        echo -e "Error deploying ${stack_name}"
        exit 1
    fi
}

# Step 1: Deploy main stack (VPC, networking)
deploy_stack "${STACK_PREFIX}-main-stack" \
    "cloudformation/main-stack.yaml"

# Step 2: Deploy database stack
echo -e "${YELLOW}Please provide database credentials:${NC}"
read -sp "Database username (default: postgres): " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-postgres}
read -sp "Database password (min 8 chars): " DB_PASSWORD
echo ""

deploy_stack "${STACK_PREFIX}-database-stack" \
    "cloudformation/database-stack.yaml" \
    "DBUsername=${DB_USERNAME} DBPassword=${DB_PASSWORD}"

# Get API Gateway URL from backend stack (will be created in next step)
# For now, we'll use a placeholder
API_GATEWAY_URL_PLACEHOLDER="https://api.example.com"

# Step 3: Deploy backend stack
deploy_stack "${STACK_PREFIX}-backend-stack" \
    "cloudformation/backend-stack.yaml"

# Get the actual API Gateway URL
API_GATEWAY_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-backend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
    --output text)

echo -e "${GREEN}API Gateway URL: ${API_GATEWAY_URL}${NC}"

# Step 4: Deploy frontend stack
deploy_stack "${STACK_PREFIX}-frontend-stack" \
    "cloudformation/frontend-stack.yaml" \
    "ApiGatewayUrl=${API_GATEWAY_URL}"

# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-frontend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" \
    --output text)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "CloudFront URL: ${CLOUDFRONT_URL}"
echo -e "API Gateway URL: ${API_GATEWAY_URL}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Build the frontend: cd frontend && npm install && npm run build"
echo "2. Upload to S3: aws s3 sync frontend/dist s3://${STACK_PREFIX}-frontend-$(aws sts get-caller-identity --query Account --output text) --delete"
echo "3. Deploy backend Lambda: cd backend && serverless deploy --stage ${ENVIRONMENT}"
echo "4. Update frontend API URL in environment variables"

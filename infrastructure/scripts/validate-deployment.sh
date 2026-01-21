#!/bin/bash

# Bash script to validate Leaguify deployment
# Usage: ./validate-deployment.sh [environment] [region]

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_PREFIX="${ENVIRONMENT}-leaguify"

echo "Validating Leaguify deployment..."
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ALL_VALID=true

# Function to check stack status
test_stack() {
    local stack_name=$1
    local description=$2
    
    echo -e "${YELLOW}Checking ${description}...${NC}"
    local stack_status=$(aws cloudformation describe-stacks \
        --stack-name "${stack_name}" \
        --region "${REGION}" \
        --query "Stacks[0].StackStatus" \
        --output text 2>&1)
    
    if [ $? -eq 0 ] && [[ "$stack_status" =~ CREATE_COMPLETE|UPDATE_COMPLETE ]]; then
        echo -e "${GREEN}✓ ${description} is deployed (Status: ${stack_status})${NC}"
        return 0
    else
        echo -e "${RED}✗ ${description} is not ready (Status: ${stack_status})${NC}"
        return 1
    fi
}

# Check all stacks
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Stack Status Validation${NC}"
echo -e "${CYAN}========================================${NC}"

test_stack "${STACK_PREFIX}-main-stack" "Main Stack (VPC)" || ALL_VALID=false
test_stack "${STACK_PREFIX}-database-stack" "Database Stack (RDS)" || ALL_VALID=false
test_stack "${STACK_PREFIX}-backend-stack" "Backend Stack (API Gateway, Lambda)" || ALL_VALID=false
test_stack "${STACK_PREFIX}-frontend-stack" "Frontend Stack (S3, CloudFront)" || ALL_VALID=false

echo ""

# Check API Gateway
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}API Gateway Validation${NC}"
echo -e "${CYAN}========================================${NC}"

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-backend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$API_URL" ]; then
    echo -e "${GREEN}✓ API Gateway URL: ${API_URL}${NC}"
    
    # Test API endpoint
    echo -e "${YELLOW}Testing API Gateway endpoint...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${API_URL}/health" | grep -q "200"; then
        echo -e "${GREEN}✓ API Gateway is responding${NC}"
    else
        echo -e "${YELLOW}⚠ Could not reach API Gateway endpoint (Lambda may not be deployed yet)${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve API Gateway URL${NC}"
    ALL_VALID=false
fi

echo ""

# Check S3 Buckets
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}S3 Buckets Validation${NC}"
echo -e "${CYAN}========================================${NC}"

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-frontend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$FRONTEND_BUCKET" ]; then
    echo -e "${GREEN}✓ Frontend bucket: ${FRONTEND_BUCKET}${NC}"
    
    # Check if bucket exists and is accessible
    if aws s3 ls "s3://${FRONTEND_BUCKET}" --region "${REGION}" &>/dev/null; then
        echo -e "${GREEN}✓ Frontend bucket is accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend bucket may not be accessible${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve frontend bucket name${NC}"
    ALL_VALID=false
fi

AVATAR_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-backend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$AVATAR_BUCKET" ]; then
    echo -e "${GREEN}✓ Avatar bucket: ${AVATAR_BUCKET}${NC}"
    
    # Check if bucket exists and is accessible
    if aws s3 ls "s3://${AVATAR_BUCKET}" --region "${REGION}" &>/dev/null; then
        echo -e "${GREEN}✓ Avatar bucket is accessible${NC}"
    else
        echo -e "${YELLOW}⚠ Avatar bucket may not be accessible${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve avatar bucket name${NC}"
    ALL_VALID=false
fi

echo ""

# Check CloudFront
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}CloudFront Validation${NC}"
echo -e "${CYAN}========================================${NC}"

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-frontend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$CLOUDFRONT_ID" ]; then
    echo -e "${GREEN}✓ CloudFront Distribution ID: ${CLOUDFRONT_ID}${NC}"
    
    DIST_STATUS=$(aws cloudfront get-distribution \
        --id "${CLOUDFRONT_ID}" \
        --query "Distribution.Status" \
        --output text 2>&1)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ CloudFront Status: ${DIST_STATUS}${NC}"
        if [ "$DIST_STATUS" != "Deployed" ]; then
            echo -e "${YELLOW}⚠ CloudFront distribution is still deploying${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to retrieve CloudFront distribution ID${NC}"
    ALL_VALID=false
fi

echo ""

# Check RDS
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}RDS Database Validation${NC}"
echo -e "${CYAN}========================================${NC}"

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-database-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$DB_ENDPOINT" ]; then
    echo -e "${GREEN}✓ RDS Endpoint: ${DB_ENDPOINT}${NC}"
    
    # Check if the instance exists
    DB_INSTANCE_ID="${ENVIRONMENT}-leaguify-db"
    DB_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier "${DB_INSTANCE_ID}" \
        --region "${REGION}" \
        --query "DBInstances[0].DBInstanceStatus" \
        --output text 2>&1)
    
    if [ $? -eq 0 ] && [ -n "$DB_STATUS" ]; then
        echo -e "${GREEN}✓ RDS Status: ${DB_STATUS}${NC}"
        if [ "$DB_STATUS" != "available" ]; then
            echo -e "${YELLOW}⚠ RDS instance is not yet available${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to retrieve RDS endpoint${NC}"
    ALL_VALID=false
fi

echo ""

# Check Lambda
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Lambda Function Validation${NC}"
echo -e "${CYAN}========================================${NC}"

LAMBDA_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-backend-stack" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
    --output text 2>&1)

if [ $? -eq 0 ] && [ -n "$LAMBDA_ARN" ]; then
    echo -e "${GREEN}✓ Lambda ARN: ${LAMBDA_ARN}${NC}"
    
    LAMBDA_NAME="${ENVIRONMENT}-leaguify-api"
    LAMBDA_STATE=$(aws lambda get-function-configuration \
        --function-name "${LAMBDA_NAME}" \
        --region "${REGION}" \
        --query "State" \
        --output text 2>&1)
    
    if [ $? -eq 0 ] && [ -n "$LAMBDA_STATE" ]; then
        echo -e "${GREEN}✓ Lambda State: ${LAMBDA_STATE}${NC}"
        if [ "$LAMBDA_STATE" != "Active" ]; then
            echo -e "${YELLOW}⚠ Lambda function is not active${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to retrieve Lambda ARN${NC}"
    ALL_VALID=false
fi

echo ""

# Summary
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Validation Summary${NC}"
echo -e "${CYAN}========================================${NC}"

if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN}✓ All critical components are deployed and accessible${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Deploy Lambda function code: cd backend && serverless deploy --stage ${ENVIRONMENT}"
    echo "2. Build and upload frontend: cd frontend && npm run build && aws s3 sync dist/ s3://${FRONTEND_BUCKET} --delete"
    echo "3. Test the application end-to-end"
    exit 0
else
    echo -e "${RED}✗ Some components failed validation. Please check the errors above.${NC}"
    exit 1
fi

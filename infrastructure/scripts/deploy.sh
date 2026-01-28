#!/bin/bash

# Deployment script for Leaguify infrastructure
# Usage: ./deploy.sh [environment] [region] [profile]
# Environment variables: DB_USERNAME, DB_PASSWORD, AWS_PROFILE

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
PROFILE=${3:-${AWS_PROFILE:-}}

STACK_PREFIX="${ENVIRONMENT}-leaguify"

# Build AWS CLI profile argument if profile is specified
PROFILE_ARG=""
if [ -n "$PROFILE" ]; then
    PROFILE_ARG="--profile $PROFILE"
    echo "Using AWS profile: $PROFILE"
fi

echo "Deploying Leaguify infrastructure..."
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Validate AWS CLI is installed
echo -e "${YELLOW}Validating AWS CLI...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi
AWS_VERSION=$(aws --version)
echo -e "${GREEN}✓ AWS CLI found: ${AWS_VERSION}${NC}"

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if [ -n "$PROFILE_ARG" ]; then
    if ! aws sts get-caller-identity --region "${REGION}" $PROFILE_ARG &> /dev/null; then
        echo -e "${RED}✗ AWS credentials not configured. Please run 'aws configure' or set AWS_PROFILE.${NC}"
        exit 1
    fi
else
    if ! aws sts get-caller-identity --region "${REGION}" &> /dev/null; then
        echo -e "${RED}✗ AWS credentials not configured. Please run 'aws configure' or set AWS_PROFILE.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ AWS credentials validated${NC}"

# Validate CloudFormation templates exist
echo -e "${YELLOW}Validating CloudFormation templates...${NC}"
TEMPLATES=(
    "cloudformation/main-stack.yaml"
    "cloudformation/database-stack.yaml"
    "cloudformation/backend-stack.yaml"
    "cloudformation/frontend-stack.yaml"
)

for template in "${TEMPLATES[@]}"; do
    if [ ! -f "$template" ]; then
        echo -e "${RED}✗ Template not found: ${template}${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All templates found${NC}"
echo ""

# Function to check stack status
check_stack_status() {
    local stack_name=$1
    local status
    if [ -n "$PROFILE_ARG" ]; then
        status=$(aws cloudformation describe-stacks \
            --stack-name "${stack_name}" \
            --region "${REGION}" \
            $PROFILE_ARG \
            --query "Stacks[0].StackStatus" \
            --output text 2>/dev/null)
    else
        status=$(aws cloudformation describe-stacks \
            --stack-name "${stack_name}" \
            --region "${REGION}" \
            --query "Stacks[0].StackStatus" \
            --output text 2>/dev/null)
    fi
    echo "$status"
}

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local template_file=$2
    local parameters=$3
    shift 3
    local depends_on=("$@")
    
    # Check dependencies
    for dep in "${depends_on[@]}"; do
        echo -e "${GRAY}Checking dependency: ${dep}...${NC}"
        local dep_status=$(check_stack_status "${dep}")
        if [[ ! "$dep_status" =~ CREATE_COMPLETE|UPDATE_COMPLETE ]]; then
            echo -e "${RED}✗ Dependency ${dep} is not ready (Status: ${dep_status})${NC}"
            echo -e "${YELLOW}Please deploy dependencies first or check stack status.${NC}"
            exit 1
        fi
    done
    
    echo -e "${YELLOW}Deploying ${stack_name}...${NC}"
    
    if [ -z "$parameters" ]; then
        if [ -n "$PROFILE_ARG" ]; then
            if ! aws cloudformation deploy \
                --template-file "${template_file}" \
                --stack-name "${stack_name}" \
                --region "${REGION}" \
                $PROFILE_ARG \
                --capabilities CAPABILITY_IAM \
                --parameter-overrides Environment="${ENVIRONMENT}"; then
                echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
                echo -e "${YELLOW}Troubleshooting:${NC}"
                echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
                echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
                echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
                exit 1
            fi
        else
            if ! aws cloudformation deploy \
                --template-file "${template_file}" \
                --stack-name "${stack_name}" \
                --region "${REGION}" \
                --capabilities CAPABILITY_IAM \
                --parameter-overrides Environment="${ENVIRONMENT}"; then
                echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
                echo -e "${YELLOW}Troubleshooting:${NC}"
                echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
                echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
                echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
                exit 1
            fi
        fi
    else
        if [ -n "$PROFILE_ARG" ]; then
            if ! aws cloudformation deploy \
                --template-file "${template_file}" \
                --stack-name "${stack_name}" \
                --region "${REGION}" \
                $PROFILE_ARG \
                --capabilities CAPABILITY_IAM \
                --parameter-overrides Environment="${ENVIRONMENT}" ${parameters}; then
                echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
                echo -e "${YELLOW}Troubleshooting:${NC}"
                echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
                echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
                echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
                exit 1
            fi
        else
            if ! aws cloudformation deploy \
                --template-file "${template_file}" \
                --stack-name "${stack_name}" \
                --region "${REGION}" \
                --capabilities CAPABILITY_IAM \
                --parameter-overrides Environment="${ENVIRONMENT}" ${parameters}; then
                echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
                echo -e "${YELLOW}Troubleshooting:${NC}"
                echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
                echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
                echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
                exit 1
            fi
        fi
    fi
    
    echo -e "${GREEN}✓ ${stack_name} deployed successfully${NC}"
}
            echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
            echo -e "${YELLOW}Troubleshooting:${NC}"
            echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
            echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
            echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
            exit 1
        fi
    else
        if ! aws cloudformation deploy \
            --template-file "${template_file}" \
            --stack-name "${stack_name}" \
            --region "${REGION}" \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides Environment="${ENVIRONMENT}" ${parameters}; then
            echo -e "${RED}✗ Error deploying ${stack_name}${NC}"
            echo -e "${YELLOW}Troubleshooting:${NC}"
            echo -e "${YELLOW}- Check CloudFormation console for detailed error messages${NC}"
            echo -e "${YELLOW}- Verify all dependencies are deployed successfully${NC}"
            echo -e "${YELLOW}- Check IAM permissions for CloudFormation operations${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ ${stack_name} deployed successfully${NC}"
}

# Step 1: Deploy main stack (VPC, networking)
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Step 1: Deploying Main Stack (VPC, Networking)${NC}"
echo -e "${CYAN}========================================${NC}"
deploy_stack "${STACK_PREFIX}-main-stack" \
    "cloudformation/main-stack.yaml"

# Step 2: Deploy database stack
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Step 2: Deploying Database Stack (RDS)${NC}"
echo -e "${CYAN}========================================${NC}"

# Get database credentials from environment variables or prompt
if [ -z "$DB_USERNAME" ]; then
    echo -e "${YELLOW}Database username not found in environment. Please provide:${NC}"
    read -p "Database username (default: postgres): " DB_USERNAME
    DB_USERNAME=${DB_USERNAME:-postgres}
else
    echo -e "${GREEN}Using database username from environment variable${NC}"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Database password not found in environment. Please provide:${NC}"
    read -sp "Database password (min 8 chars): " DB_PASSWORD
    echo ""
else
    echo -e "${GREEN}Using database password from environment variable${NC}"
fi

# Validate password length
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo -e "${RED}✗ Database password must be at least 8 characters${NC}"
    exit 1
fi

deploy_stack "${STACK_PREFIX}-database-stack" \
    "cloudformation/database-stack.yaml" \
    "DBUsername=${DB_USERNAME} DBPassword=${DB_PASSWORD}" \
    "${STACK_PREFIX}-main-stack"

# Step 3: Deploy backend stack
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Step 3: Deploying Backend Stack (API Gateway, Lambda, S3)${NC}"
echo -e "${CYAN}========================================${NC}"
deploy_stack "${STACK_PREFIX}-backend-stack" \
    "cloudformation/backend-stack.yaml" \
    "" \
    "${STACK_PREFIX}-main-stack"

# Step 3.5: Deploy Lambda function code using SAM
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Step 3.5: Deploying Lambda Function Code (SAM)${NC}"
echo -e "${CYAN}========================================${NC}"

# Get required values from CloudFormation stacks
echo -e "${YELLOW}Retrieving CloudFormation stack outputs...${NC}"

if [ -n "$PROFILE_ARG" ]; then
    LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaExecutionRoleArn'].OutputValue" \
        --output text 2>&1)

    AVATAR_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" \
        --output text 2>&1)

    SUBNET1=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet1Id'].OutputValue" \
        --output text 2>&1)

    SUBNET2=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet2Id'].OutputValue" \
        --output text 2>&1)

    SECURITY_GROUP=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" \
        --output text 2>&1)
else
    LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaExecutionRoleArn'].OutputValue" \
        --output text 2>&1)

    AVATAR_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" \
        --output text 2>&1)

    SUBNET1=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet1Id'].OutputValue" \
        --output text 2>&1)

    SUBNET2=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet2Id'].OutputValue" \
        --output text 2>&1)

    SECURITY_GROUP=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-main-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" \
        --output text 2>&1)
fi

if [ $? -ne 0 ] || [ -z "$LAMBDA_ROLE_ARN" ]; then
    echo -e "${RED}✗ Failed to retrieve required CloudFormation outputs${NC}"
    echo -e "${YELLOW}Skipping Lambda deployment. You can deploy it manually later.${NC}"
else
    echo -e "${YELLOW}Deploying Lambda function code...${NC}"
    
    # Change to backend directory
    BACKEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)/backend"
    cd "$BACKEND_DIR" || exit 1
    
    # Check if SAM CLI is installed
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}✗ SAM CLI not found. Please install AWS SAM CLI.${NC}"
        echo -e "${YELLOW}Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html${NC}"
        echo -e "${YELLOW}Skipping Lambda deployment. You can deploy it manually later.${NC}"
    else
        SAM_VERSION=$(sam --version)
        echo -e "${GREEN}✓ SAM CLI found: ${SAM_VERSION}${NC}"
        
        # Build the Lambda function
        echo -e "${YELLOW}Building Lambda function...${NC}"
        if [ -n "$PROFILE_ARG" ]; then
            export AWS_PROFILE="$PROFILE"
        fi
        npm install
        
        # Check if Docker is available for container build (recommended for sharp module)
        if docker ps &>/dev/null; then
            echo -e "${GREEN}Docker is running. Using container build (recommended for native dependencies like sharp)...${NC}"
            npm run build:container
        else
            echo -e "${YELLOW}Docker is not running. Using regular build...${NC}"
            echo -e "${YELLOW}Note: If you encounter 'sharp' module errors, use Docker container build instead.${NC}"
            npm run build
        fi
        
        if [ $? -eq 0 ]; then
            # Update the existing Lambda function code directly
            echo -e "${YELLOW}Updating Lambda function code...${NC}"
            FUNCTION_NAME="${ENVIRONMENT}-leaguify-api"
            
            # Create a zip file from the built function
            FUNCTION_DIR=".aws-sam/build/ApiFunction"
            ZIP_FILE=".aws-sam/build/lambda-code.zip"
            
            if [ -f "$ZIP_FILE" ]; then
                rm -f "$ZIP_FILE"
            fi
            
            # Create zip file
            echo -e "${GRAY}Creating deployment package...${NC}"
            cd "$FUNCTION_DIR" || exit 1
            zip -r "../lambda-code.zip" . -q
            cd - > /dev/null || exit 1
            
            if [ -f "$ZIP_FILE" ]; then
                # Update Lambda function code and handler configuration
                echo -e "${YELLOW}Updating Lambda function code and configuration...${NC}"
                
                # First, update the function code
                if [ -n "$PROFILE_ARG" ]; then
                    aws lambda update-function-code \
                        --function-name "${FUNCTION_NAME}" \
                        --zip-file "fileb://${ZIP_FILE}" \
                        --region "${REGION}" \
                        $PROFILE_ARG
                else
                    aws lambda update-function-code \
                        --function-name "${FUNCTION_NAME}" \
                        --zip-file "fileb://${ZIP_FILE}" \
                        --region "${REGION}"
                fi
                
                if [ $? -eq 0 ]; then
                    echo -e "${YELLOW}Waiting for code update to complete...${NC}"
                    sleep 3
                    
                    # Update the handler configuration to match SAM template
                    echo -e "${YELLOW}Updating Lambda handler configuration...${NC}"
                    if [ -n "$PROFILE_ARG" ]; then
                        aws lambda update-function-configuration \
                            --function-name "${FUNCTION_NAME}" \
                            --handler "src/lambda.handler" \
                            --region "${REGION}" \
                            $PROFILE_ARG
                    else
                        aws lambda update-function-configuration \
                            --function-name "${FUNCTION_NAME}" \
                            --handler "src/lambda.handler" \
                            --region "${REGION}"
                    fi
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${YELLOW}Waiting for configuration update to complete...${NC}"
                        sleep 3
                        echo -e "${GREEN}✓ Lambda function updated successfully${NC}"
                    else
                        echo -e "${YELLOW}⚠ Code updated but handler configuration update failed.${NC}"
                        echo -e "${YELLOW}You may need to manually update the handler to 'src/lambda.handler'${NC}"
                    fi
                else
                    echo -e "${RED}✗ Lambda function code update failed. Check the error messages above.${NC}"
                fi
            else
                echo -e "${RED}✗ Failed to create deployment package${NC}"
            fi
        else
            echo -e "${RED}✗ Build failed. Skipping deployment.${NC}"
        fi
    fi
    
    # Return to original directory
    cd - > /dev/null || exit 1
fi

# Get API Gateway URL
echo -e "${YELLOW}Retrieving API Gateway URL...${NC}"
if [ -n "$PROFILE_ARG" ]; then
    API_GATEWAY_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
        --output text 2>&1)
else
    API_GATEWAY_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
        --output text 2>&1)
fi

if [ $? -ne 0 ] || [ -z "$API_GATEWAY_URL" ]; then
    echo -e "${RED}✗ Failed to retrieve API Gateway URL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API Gateway URL: ${API_GATEWAY_URL}${NC}"

# Get Avatar Bucket Name
if [ -n "$PROFILE_ARG" ]; then
    AVATAR_BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" \
        --output text 2>&1)
else
    AVATAR_BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" \
        --output text 2>&1)
fi

# Step 4: Deploy frontend stack
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Step 4: Deploying Frontend Stack (S3, CloudFront)${NC}"
echo -e "${CYAN}========================================${NC}"
deploy_stack "${STACK_PREFIX}-frontend-stack" \
    "cloudformation/frontend-stack.yaml" \
    "ApiGatewayUrl=${API_GATEWAY_URL}" \
    "${STACK_PREFIX}-backend-stack"

# Get all outputs
echo ""
echo -e "${YELLOW}Retrieving deployment outputs...${NC}"

if [ -n "$PROFILE_ARG" ]; then
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-frontend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" \
        --output text 2>&1)

    FRONTEND_BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-frontend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
        --output text 2>&1)

    LAMBDA_FUNCTION_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
        --output text 2>&1)

    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-database-stack" \
        --region "${REGION}" \
        $PROFILE_ARG \
        --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" \
        --output text 2>&1)
else
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-frontend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" \
        --output text 2>&1)

    FRONTEND_BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-frontend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
        --output text 2>&1)

    LAMBDA_FUNCTION_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-backend-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
        --output text 2>&1)

    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-database-stack" \
        --region "${REGION}" \
        --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" \
        --output text 2>&1)
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Deployment Summary:${NC}"
echo -e "${CYAN}-------------------${NC}"
echo "Environment:        ${ENVIRONMENT}"
echo "Region:            ${REGION}"
echo ""
echo -e "${YELLOW}Frontend:${NC}"
echo "  CloudFront URL:  ${CLOUDFRONT_URL}"
echo "  S3 Bucket:       ${FRONTEND_BUCKET_NAME}"
echo ""
echo -e "${YELLOW}Backend:${NC}"
echo "  API Gateway URL: ${API_GATEWAY_URL}"
echo "  Lambda ARN:      ${LAMBDA_FUNCTION_ARN}"
echo "  Avatar Bucket:   ${AVATAR_BUCKET_NAME}"
echo ""
echo -e "${YELLOW}Database:${NC}"
echo "  RDS Endpoint:    ${DB_ENDPOINT}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "1. Build the frontend:"
echo "   cd frontend"
echo "   npm install"
echo "   export VITE_API_BASE_URL='${API_GATEWAY_URL}'"
echo "   npm run build"
echo ""
echo "2. Upload frontend to S3:"
echo "   aws s3 sync frontend/dist s3://${FRONTEND_BUCKET_NAME} --delete"
echo ""
echo "3. Invalidate CloudFront cache:"
if [ -n "$PROFILE" ]; then
    echo "   DIST_ID=\$(aws cloudformation describe-stacks --stack-name ${STACK_PREFIX}-frontend-stack --region ${REGION} --profile ${PROFILE} --query 'Stacks[0].Outputs[?OutputKey==\`\"CloudFrontDistributionId\"\`].OutputValue' --output text)"
else
    echo "   DIST_ID=\$(aws cloudformation describe-stacks --stack-name ${STACK_PREFIX}-frontend-stack --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==\`\"CloudFrontDistributionId\"\`].OutputValue' --output text)"
fi
echo "   aws cloudfront create-invalidation --distribution-id \$DIST_ID --paths '/*'"
echo ""
echo "4. Deploy backend Lambda:"
echo "   cd backend"
echo "   npm install"
echo "   npm run build"
echo "   sam deploy --parameter-overrides Environment=${ENVIRONMENT} LambdaExecutionRoleArn=\$LAMBDA_ROLE_ARN AvatarBucketName=\$AVATAR_BUCKET PrivateSubnet1Id=\$SUBNET1 PrivateSubnet2Id=\$SUBNET2 LambdaSecurityGroupId=\$SECURITY_GROUP"
echo ""
echo "   Or use the helper script:"
echo "   ./deploy-lambda.sh ${ENVIRONMENT} ${REGION}"
echo ""

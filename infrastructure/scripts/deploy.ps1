# PowerShell deployment script for Leaguify infrastructure
# Usage: .\deploy.ps1 [environment] [region]
# Environment variables: DB_USERNAME, DB_PASSWORD

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$StackPrefix = "${Environment}-leaguify"

Write-Host "Deploying Leaguify infrastructure..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Validate AWS CLI is installed and configured
Write-Host "Validating AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
    exit 1
}

# Validate AWS credentials
Write-Host "Validating AWS credentials..." -ForegroundColor Yellow
try {
    $callerIdentity = aws sts get-caller-identity --region $Region 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "AWS credentials not configured"
    }
    Write-Host "✓ AWS credentials validated" -ForegroundColor Green
} catch {
    Write-Host "✗ AWS credentials not configured. Please run 'aws configure'." -ForegroundColor Red
    exit 1
}

# Validate CloudFormation templates exist
Write-Host "Validating CloudFormation templates..." -ForegroundColor Yellow
$templates = @(
    "cloudformation\main-stack.yaml",
    "cloudformation\database-stack.yaml",
    "cloudformation\backend-stack.yaml",
    "cloudformation\frontend-stack.yaml"
)

foreach ($template in $templates) {
    if (-not (Test-Path $template)) {
        Write-Host "✗ Template not found: $template" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ All templates found" -ForegroundColor Green
Write-Host ""

function Deploy-Stack {
    param(
        [string]$StackName,
        [string]$TemplateFile,
        [string]$Parameters = "",
        [string[]]$DependsOn = @()
    )
    
    # Check dependencies
    foreach ($dependency in $DependsOn) {
        Write-Host "Checking dependency: $dependency..." -ForegroundColor Gray
        $stackStatus = aws cloudformation describe-stacks `
            --stack-name $dependency `
            --region $Region `
            --query "Stacks[0].StackStatus" `
            --output text 2>&1
        
        if ($LASTEXITCODE -ne 0 -or $stackStatus -notmatch "CREATE_COMPLETE|UPDATE_COMPLETE") {
            Write-Host "✗ Dependency $dependency is not ready (Status: $stackStatus)" -ForegroundColor Red
            Write-Host "Please deploy dependencies first or check stack status." -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "Deploying $StackName..." -ForegroundColor Yellow
    
    $deployParams = @{
        TemplateFile = $TemplateFile
        StackName = $StackName
        Region = $Region
        Capabilities = @("CAPABILITY_IAM")
        ParameterOverrides = @{
            Environment = $Environment
        }
    }
    
    if ($Parameters) {
        $paramPairs = $Parameters -split ' '
        foreach ($pair in $paramPairs) {
            if ($pair -match '^(.+)=(.+)$') {
                $deployParams.ParameterOverrides[$matches[1]] = $matches[2]
            }
        }
    }
    
    try {
        $output = aws cloudformation deploy @deployParams 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Error deploying $StackName" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
            Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
            Write-Host "- Check CloudFormation console for detailed error messages" -ForegroundColor Yellow
            Write-Host "- Verify all dependencies are deployed successfully" -ForegroundColor Yellow
            Write-Host "- Check IAM permissions for CloudFormation operations" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "✓ $StackName deployed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Error deploying $StackName: $_" -ForegroundColor Red
        exit 1
    }
}

# Step 1: Deploy main stack
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Deploying Main Stack (VPC, Networking)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-main-stack" `
    -TemplateFile "cloudformation\main-stack.yaml"

# Step 2: Deploy database stack
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Deploying Database Stack (RDS)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get database credentials from environment variables or prompt
$DBUsername = $env:DB_USERNAME
$DBPasswordPlain = $env:DB_PASSWORD

if ([string]::IsNullOrEmpty($DBUsername)) {
    Write-Host "Database username not found in environment. Please provide:" -ForegroundColor Yellow
    $DBUsername = Read-Host "Database username (default: postgres)"
    if ([string]::IsNullOrEmpty($DBUsername)) {
        $DBUsername = "postgres"
    }
} else {
    Write-Host "Using database username from environment variable" -ForegroundColor Green
}

if ([string]::IsNullOrEmpty($DBPasswordPlain)) {
    Write-Host "Database password not found in environment. Please provide:" -ForegroundColor Yellow
    $DBPassword = Read-Host "Database password (min 8 chars)" -AsSecureString
    $DBPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPassword)
    )
} else {
    Write-Host "Using database password from environment variable" -ForegroundColor Green
}

# Validate password length
if ($DBPasswordPlain.Length -lt 8) {
    Write-Host "✗ Database password must be at least 8 characters" -ForegroundColor Red
    exit 1
}

Deploy-Stack -StackName "${StackPrefix}-database-stack" `
    -TemplateFile "cloudformation\database-stack.yaml" `
    -Parameters "DBUsername=$DBUsername DBPassword=$DBPasswordPlain" `
    -DependsOn @("${StackPrefix}-main-stack")

# Step 3: Deploy backend stack
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Deploying Backend Stack (API Gateway, Lambda, S3)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-backend-stack" `
    -TemplateFile "cloudformation\backend-stack.yaml" `
    -DependsOn @("${StackPrefix}-main-stack")

# Get API Gateway URL
Write-Host "Retrieving API Gateway URL..." -ForegroundColor Yellow
$ApiGatewayUrl = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-backend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
    --output text 2>&1

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($ApiGatewayUrl)) {
    Write-Host "✗ Failed to retrieve API Gateway URL" -ForegroundColor Red
    exit 1
}

Write-Host "✓ API Gateway URL: $ApiGatewayUrl" -ForegroundColor Green

# Get Avatar Bucket Name
$AvatarBucketName = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-backend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
    --output text 2>&1

# Step 4: Deploy frontend stack
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Deploying Frontend Stack (S3, CloudFront)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-frontend-stack" `
    -TemplateFile "cloudformation\frontend-stack.yaml" `
    -Parameters "ApiGatewayUrl=$ApiGatewayUrl" `
    -DependsOn @("${StackPrefix}-backend-stack")

# Get all outputs
Write-Host ""
Write-Host "Retrieving deployment outputs..." -ForegroundColor Yellow

$CloudFrontUrl = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-frontend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" `
    --output text 2>&1

$FrontendBucketName = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-frontend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
    --output text 2>&1

$LambdaFunctionArn = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-backend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" `
    --output text 2>&1

$DBEndpoint = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-database-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" `
    --output text 2>&1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor Cyan
Write-Host "Environment:        $Environment"
Write-Host "Region:            $Region"
Write-Host ""
Write-Host "Frontend:" -ForegroundColor Yellow
Write-Host "  CloudFront URL:  $CloudFrontUrl"
Write-Host "  S3 Bucket:       $FrontendBucketName"
Write-Host ""
Write-Host "Backend:" -ForegroundColor Yellow
Write-Host "  API Gateway URL: $ApiGatewayUrl"
Write-Host "  Lambda ARN:      $LambdaFunctionArn"
Write-Host "  Avatar Bucket:   $AvatarBucketName"
Write-Host ""
Write-Host "Database:" -ForegroundColor Yellow
Write-Host "  RDS Endpoint:    $DBEndpoint"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Build the frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   `$env:VITE_API_BASE_URL='$ApiGatewayUrl'" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Upload frontend to S3:" -ForegroundColor White
Write-Host "   aws s3 sync frontend\dist s3://$FrontendBucketName --delete" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Invalidate CloudFront cache:" -ForegroundColor White
Write-Host "   `$DistId = aws cloudformation describe-stacks --stack-name ${StackPrefix}-frontend-stack --region $Region --query 'Stacks[0].Outputs[?OutputKey==\`"CloudFrontDistributionId\`"].OutputValue' --output text" -ForegroundColor Gray
Write-Host "   aws cloudfront create-invalidation --distribution-id `$DistId --paths '/*'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Deploy backend Lambda:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   serverless deploy --stage $Environment" -ForegroundColor Gray
Write-Host ""

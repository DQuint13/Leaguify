# PowerShell deployment script for Leaguify infrastructure
# Usage: .\deploy.ps1 [environment] [region]

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

function Deploy-Stack {
    param(
        [string]$StackName,
        [string]$TemplateFile,
        [string]$Parameters = ""
    )
    
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
        aws cloudformation deploy @deployParams
        Write-Host "✓ $StackName deployed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error deploying $StackName" -ForegroundColor Red
        exit 1
    }
}

# Step 1: Deploy main stack
Deploy-Stack -StackName "${StackPrefix}-main-stack" `
    -TemplateFile "cloudformation\main-stack.yaml"

# Step 2: Deploy database stack
Write-Host "Please provide database credentials:" -ForegroundColor Yellow
$DBUsername = Read-Host "Database username (default: postgres)"
if ([string]::IsNullOrEmpty($DBUsername)) {
    $DBUsername = "postgres"
}

$DBPassword = Read-Host "Database password (min 8 chars)" -AsSecureString
$DBPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DBPassword)
)

Deploy-Stack -StackName "${StackPrefix}-database-stack" `
    -TemplateFile "cloudformation\database-stack.yaml" `
    -Parameters "DBUsername=$DBUsername DBPassword=$DBPasswordPlain"

# Step 3: Deploy backend stack
Deploy-Stack -StackName "${StackPrefix}-backend-stack" `
    -TemplateFile "cloudformation\backend-stack.yaml"

# Get API Gateway URL
$ApiGatewayUrl = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-backend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
    --output text

Write-Host "API Gateway URL: $ApiGatewayUrl" -ForegroundColor Green

# Step 4: Deploy frontend stack
Deploy-Stack -StackName "${StackPrefix}-frontend-stack" `
    -TemplateFile "cloudformation\frontend-stack.yaml" `
    -Parameters "ApiGatewayUrl=$ApiGatewayUrl"

# Get CloudFront URL
$CloudFrontUrl = aws cloudformation describe-stacks `
    --stack-name "${StackPrefix}-frontend-stack" `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" `
    --output text

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "CloudFront URL: $CloudFrontUrl"
Write-Host "API Gateway URL: $ApiGatewayUrl"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build the frontend: cd frontend; npm install; npm run build"
Write-Host "2. Upload to S3: aws s3 sync frontend\dist s3://${StackPrefix}-frontend-$(aws sts get-caller-identity --query Account --output text) --delete"
Write-Host "3. Deploy backend Lambda: cd backend; serverless deploy --stage $Environment"
Write-Host "4. Update frontend API URL in environment variables"

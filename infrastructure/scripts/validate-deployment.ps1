# PowerShell script to validate Leaguify deployment
# Usage: .\validate-deployment.ps1 [environment] [region]

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$StackPrefix = "${Environment}-leaguify"

Write-Host "Validating Leaguify deployment..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

$allValid = $true

# Function to check stack status
function Test-Stack {
    param(
        [string]$StackName,
        [string]$Description
    )
    
    Write-Host "Checking $Description..." -ForegroundColor Yellow
    $stackStatus = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].StackStatus" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and ($stackStatus -match "CREATE_COMPLETE|UPDATE_COMPLETE")) {
        Write-Host "✓ $Description is deployed (Status: $stackStatus)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $Description is not ready (Status: $stackStatus)" -ForegroundColor Red
        return $false
    }
}

# Check all stacks
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stack Status Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$mainStack = Test-Stack "${StackPrefix}-main-stack" "Main Stack (VPC)"
$dbStack = Test-Stack "${StackPrefix}-database-stack" "Database Stack (RDS)"
$backendStack = Test-Stack "${StackPrefix}-backend-stack" "Backend Stack (API Gateway, Lambda)"
$frontendStack = Test-Stack "${StackPrefix}-frontend-stack" "Frontend Stack (S3, CloudFront)"

if (-not ($mainStack -and $dbStack -and $backendStack -and $frontendStack)) {
    $allValid = $false
}

Write-Host ""

# Check API Gateway
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Gateway Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $apiUrl = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($apiUrl)) {
        Write-Host "✓ API Gateway URL: $apiUrl" -ForegroundColor Green
        
        # Test API endpoint
        Write-Host "Testing API Gateway endpoint..." -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET -TimeoutSec 10 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ API Gateway is responding" -ForegroundColor Green
            } else {
                Write-Host "⚠ API Gateway returned status code: $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠ Could not reach API Gateway endpoint (Lambda may not be deployed yet)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Failed to retrieve API Gateway URL" -ForegroundColor Red
        $allValid = $false
    }
} catch {
    Write-Host "✗ Error checking API Gateway: $_" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

# Check S3 Buckets
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "S3 Buckets Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $frontendBucket = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-frontend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($frontendBucket)) {
        Write-Host "✓ Frontend bucket: $frontendBucket" -ForegroundColor Green
        
        # Check if bucket exists and is accessible
        $bucketCheck = aws s3 ls "s3://$frontendBucket" --region $Region 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Frontend bucket is accessible" -ForegroundColor Green
        } else {
            Write-Host "⚠ Frontend bucket may not be accessible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Failed to retrieve frontend bucket name" -ForegroundColor Red
        $allValid = $false
    }
    
    $avatarBucket = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($avatarBucket)) {
        Write-Host "✓ Avatar bucket: $avatarBucket" -ForegroundColor Green
        
        # Check if bucket exists and is accessible
        $bucketCheck = aws s3 ls "s3://$avatarBucket" --region $Region 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Avatar bucket is accessible" -ForegroundColor Green
        } else {
            Write-Host "⚠ Avatar bucket may not be accessible" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Failed to retrieve avatar bucket name" -ForegroundColor Red
        $allValid = $false
    }
} catch {
    Write-Host "✗ Error checking S3 buckets: $_" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

# Check CloudFront
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CloudFront Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $cloudFrontId = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-frontend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($cloudFrontId)) {
        Write-Host "✓ CloudFront Distribution ID: $cloudFrontId" -ForegroundColor Green
        
        $distStatus = aws cloudfront get-distribution `
            --id $cloudFrontId `
            --query "Distribution.Status" `
            --output text 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ CloudFront Status: $distStatus" -ForegroundColor Green
            if ($distStatus -ne "Deployed") {
                Write-Host "⚠ CloudFront distribution is still deploying" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✗ Failed to retrieve CloudFront distribution ID" -ForegroundColor Red
        $allValid = $false
    }
} catch {
    Write-Host "✗ Error checking CloudFront: $_" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

# Check RDS
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RDS Database Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $dbEndpoint = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-database-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($dbEndpoint)) {
        Write-Host "✓ RDS Endpoint: $dbEndpoint" -ForegroundColor Green
        
        # Note: We can't directly test RDS connectivity without credentials
        # But we can check if the instance exists
        $dbInstanceId = "${Environment}-leaguify-db"
        $dbStatus = aws rds describe-db-instances `
            --db-instance-identifier $dbInstanceId `
            --region $Region `
            --query "DBInstances[0].DBInstanceStatus" `
            --output text 2>&1
        
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($dbStatus)) {
            Write-Host "✓ RDS Status: $dbStatus" -ForegroundColor Green
            if ($dbStatus -ne "available") {
                Write-Host "⚠ RDS instance is not yet available" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✗ Failed to retrieve RDS endpoint" -ForegroundColor Red
        $allValid = $false
    }
} catch {
    Write-Host "✗ Error checking RDS: $_" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

# Check Lambda
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Lambda Function Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $lambdaArn = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrEmpty($lambdaArn)) {
        Write-Host "✓ Lambda ARN: $lambdaArn" -ForegroundColor Green
        
        $lambdaName = "${Environment}-leaguify-api"
        $lambdaConfig = aws lambda get-function-configuration `
            --function-name $lambdaName `
            --region $Region 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $lambdaState = ($lambdaConfig | ConvertFrom-Json).State
            Write-Host "✓ Lambda State: $lambdaState" -ForegroundColor Green
            if ($lambdaState -ne "Active") {
                Write-Host "⚠ Lambda function is not active" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✗ Failed to retrieve Lambda ARN" -ForegroundColor Red
        $allValid = $false
    }
} catch {
    Write-Host "✗ Error checking Lambda: $_" -ForegroundColor Red
    $allValid = $false
}

Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($allValid) {
    Write-Host "✓ All critical components are deployed and accessible" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Deploy Lambda function code: cd backend; serverless deploy --stage $Environment"
    Write-Host "2. Build and upload frontend: cd frontend; npm run build; aws s3 sync dist/ s3://$frontendBucket --delete"
    Write-Host "3. Test the application end-to-end"
    exit 0
} else {
    Write-Host "✗ Some components failed validation. Please check the errors above." -ForegroundColor Red
    exit 1
}

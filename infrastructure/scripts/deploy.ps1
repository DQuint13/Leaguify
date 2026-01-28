# PowerShell deployment script for Leaguify infrastructure
# Usage: .\deploy.ps1 [environment] [region] [profile]
# Environment variables: DB_USERNAME, DB_PASSWORD, AWS_PROFILE

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1",
    [string]$Profile = ""
)

$ErrorActionPreference = "Stop"
$StackPrefix = "${Environment}-leaguify"

# Get the script directory and set base path for templates
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TemplateBasePath = Join-Path (Split-Path -Parent $ScriptDir) "cloudformation"

# Use profile from parameter, environment variable, or default
if ([string]::IsNullOrEmpty($Profile)) {
    $Profile = $env:AWS_PROFILE
}

# Display profile if specified
if (-not [string]::IsNullOrEmpty($Profile)) {
    Write-Host "Using AWS profile: $Profile" -ForegroundColor Cyan
}

Write-Host "Deploying Leaguify infrastructure..." -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Validate AWS CLI is installed and configured
Write-Host "Validating AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
    exit 1
}

# Validate AWS credentials
Write-Host "Validating AWS credentials..." -ForegroundColor Yellow
try {
    if (-not [string]::IsNullOrEmpty($Profile)) {
        $callerIdentity = aws sts get-caller-identity --region $Region --profile $Profile 2>&1
    } else {
        $callerIdentity = aws sts get-caller-identity --region $Region 2>&1
    }
    if ($LASTEXITCODE -ne 0) {
        throw "AWS credentials not configured"
    }
    Write-Host "AWS credentials validated" -ForegroundColor Green
} catch {
    Write-Host "AWS credentials not configured. Please run 'aws configure' or set AWS_PROFILE." -ForegroundColor Red
    exit 1
}

# Validate CloudFormation templates exist
Write-Host "Validating CloudFormation templates..." -ForegroundColor Yellow
$templates = @(
    "main-stack.yaml",
    "database-stack.yaml",
    "backend-stack.yaml",
    "frontend-stack.yaml"
)

foreach ($templateName in $templates) {
    $templatePath = Join-Path $TemplateBasePath $templateName
    if (-not (Test-Path $templatePath)) {
        Write-Host "Template not found: $templatePath" -ForegroundColor Red
        exit 1
    }
}
Write-Host "All templates found" -ForegroundColor Green
Write-Host ""

function Deploy-Stack {
    param(
        [string]$StackName,
        [string]$TemplateFile,
        [string]$Parameters = "",
        [string[]]$DependsOn = @()
    )
    
    # Resolve template file path relative to cloudformation directory
    if (-not [System.IO.Path]::IsPathRooted($TemplateFile)) {
        $TemplateFile = Join-Path $TemplateBasePath $TemplateFile
    }
    
    # Check dependencies
    foreach ($dependency in $DependsOn) {
        Write-Host "Checking dependency: $dependency..." -ForegroundColor Gray
        if (-not [string]::IsNullOrEmpty($Profile)) {
            $stackStatus = aws cloudformation describe-stacks `
                --stack-name $dependency `
                --region $Region `
                --profile $Profile `
                --query "Stacks[0].StackStatus" `
                --output text 2>&1
        } else {
            $stackStatus = aws cloudformation describe-stacks `
                --stack-name $dependency `
                --region $Region `
                --query "Stacks[0].StackStatus" `
                --output text 2>&1
        }
        
        if ($LASTEXITCODE -ne 0 -or $stackStatus -notmatch "CREATE_COMPLETE|UPDATE_COMPLETE") {
            Write-Host "Dependency $dependency is not ready (Status: $stackStatus)" -ForegroundColor Red
            Write-Host "Please deploy dependencies first or check stack status." -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "Deploying $StackName..." -ForegroundColor Yellow
    
    try {
        # Build parameter overrides
        $paramOverrides = @("Environment=$Environment")
        if ($Parameters) {
            $paramPairs = $Parameters -split ' '
            foreach ($pair in $paramPairs) {
                if ($pair -match '^(.+)=(.+)$') {
                    $paramOverrides += "$pair"
                }
            }
        }
        
        # Build AWS CLI arguments
        $awsArgs = @(
            "cloudformation", "deploy",
            "--template-file", $TemplateFile,
            "--stack-name", $StackName,
            "--region", $Region,
            "--capabilities", "CAPABILITY_IAM",
            "--parameter-overrides"
        ) + $paramOverrides
        
        # Add profile if specified
        if (-not [string]::IsNullOrEmpty($Profile)) {
            $awsArgs = @("--profile", $Profile) + $awsArgs
        }
        
        $output = & aws $awsArgs 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error deploying $StackName" -ForegroundColor Red
            Write-Host $output -ForegroundColor Red
            Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
            Write-Host "- Check CloudFormation console for detailed error messages" -ForegroundColor Yellow
            Write-Host "- Verify all dependencies are deployed successfully" -ForegroundColor Yellow
            Write-Host "- Check IAM permissions for CloudFormation operations" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Success: $StackName deployed successfully" -ForegroundColor Green
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "Error deploying ${StackName}: ${errorMsg}" -ForegroundColor Red
        exit 1
    }
}

# Step 1: Deploy main stack
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Deploying Main Stack (VPC, Networking)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-main-stack" `
    -TemplateFile "main-stack.yaml"

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
    Write-Host "Database password must be at least 8 characters" -ForegroundColor Red
    exit 1
}

Deploy-Stack -StackName "${StackPrefix}-database-stack" `
    -TemplateFile "database-stack.yaml" `
    -Parameters "DBUsername=$DBUsername DBPassword=$DBPasswordPlain" `
    -DependsOn @("${StackPrefix}-main-stack")

# Step 3: Deploy backend stack
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Deploying Backend Stack (API Gateway, Lambda, S3)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-backend-stack" `
    -TemplateFile "backend-stack.yaml" `
    -DependsOn @("${StackPrefix}-main-stack")

# Step 3.5: Deploy Lambda function code using SAM
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3.5: Deploying Lambda Function Code (SAM)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get required values from CloudFormation stacks
Write-Host "Retrieving CloudFormation stack outputs..." -ForegroundColor Yellow

if (-not [string]::IsNullOrEmpty($Profile)) {
    $LambdaRoleArn = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaExecutionRoleArn'].OutputValue" `
        --output text 2>&1

    $AvatarBucket = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
        --output text 2>&1

    $Subnet1 = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet1Id'].OutputValue" `
        --output text 2>&1

    $Subnet2 = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet2Id'].OutputValue" `
        --output text 2>&1

    $SecurityGroup = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" `
        --output text 2>&1
} else {
    $LambdaRoleArn = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaExecutionRoleArn'].OutputValue" `
        --output text 2>&1

    $AvatarBucket = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
        --output text 2>&1

    $Subnet1 = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet1Id'].OutputValue" `
        --output text 2>&1

    $Subnet2 = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='PrivateSubnet2Id'].OutputValue" `
        --output text 2>&1

    $SecurityGroup = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-main-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaSecurityGroupId'].OutputValue" `
        --output text 2>&1
}

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($LambdaRoleArn)) {
    Write-Host "Failed to retrieve required CloudFormation outputs" -ForegroundColor Red
    Write-Host "Skipping Lambda deployment. You can deploy it manually later." -ForegroundColor Yellow
} else {
    Write-Host "Deploying Lambda function code..." -ForegroundColor Yellow
    
    # Change to backend directory
    $BackendDir = Join-Path (Split-Path -Parent (Split-Path -Parent $ScriptDir)) "backend"
    Push-Location $BackendDir
    
    try {
        # Check if SAM CLI is installed
        $samVersion = sam --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "SAM CLI not found. Please install AWS SAM CLI." -ForegroundColor Red
            Write-Host "Visit: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html" -ForegroundColor Yellow
            Write-Host "Skipping Lambda deployment. You can deploy it manually later." -ForegroundColor Yellow
        } else {
            Write-Host "SAM CLI found: $samVersion" -ForegroundColor Green
            
            # Build the Lambda function
            Write-Host "Building Lambda function..." -ForegroundColor Yellow
            if (-not [string]::IsNullOrEmpty($Profile)) {
                $env:AWS_PROFILE = $Profile
            }
            npm install
            
            # Try to clean .aws-sam directory if it exists (Windows permission fix)
            $awsSamDir = Join-Path $BackendDir ".aws-sam"
            if (Test-Path $awsSamDir) {
                Write-Host "Cleaning previous SAM build directory..." -ForegroundColor Gray
                try {
                    # Force close any processes that might be locking files
                    Get-Process | Where-Object {
                        $_.Path -like "*$BackendDir*" -or 
                        $_.Modules.FileName -like "*$BackendDir*"
                    } | ForEach-Object {
                        Write-Host "Closing process that might be locking files: $($_.Name)" -ForegroundColor Gray
                        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                    }
                    
                    # Wait a moment for processes to release locks
                    Start-Sleep -Seconds 1
                    
                    # Try to remove with retry and longer delays
                    $maxRetries = 5
                    $retryCount = 0
                    $cleaned = $false
                    while ($retryCount -lt $maxRetries -and -not $cleaned) {
                        try {
                            # Try to remove individual subdirectories first
                            $buildDir = Join-Path $awsSamDir "build"
                            if (Test-Path $buildDir) {
                                Get-ChildItem -Path $buildDir -Recurse -Force | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
                                Remove-Item -Path $buildDir -Recurse -Force -ErrorAction SilentlyContinue
                            }
                            
                            # Remove the entire directory
                            Remove-Item -Path $awsSamDir -Recurse -Force -ErrorAction Stop
                            $cleaned = $true
                            Write-Host "Successfully cleaned .aws-sam directory" -ForegroundColor Green
                        } catch {
                            $retryCount++
                            if ($retryCount -lt $maxRetries) {
                                Write-Host "Retry ${retryCount}/${maxRetries}: Waiting before retry..." -ForegroundColor Yellow
                                Start-Sleep -Seconds 3
                            } else {
                                Write-Host "Warning: Could not fully clean .aws-sam directory. SAM build will attempt to continue." -ForegroundColor Yellow
                                Write-Host "If build fails, manually delete .aws-sam directory and try again." -ForegroundColor Yellow
                            }
                        }
                    }
                    
                    # Final wait after cleanup
                    if ($cleaned) {
                        Start-Sleep -Seconds 1
                    }
                } catch {
                    Write-Host "Warning: Could not clean .aws-sam directory: $_" -ForegroundColor Yellow
                    Write-Host "SAM build will attempt to continue, but may fail if files are locked." -ForegroundColor Yellow
                }
            }
            
            # Check if Docker is available for container build (recommended for sharp module)
            $dockerRunning = docker ps 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Docker is running. Using container build (recommended for native dependencies like sharp)..." -ForegroundColor Green
                npm run build:container
            } else {
                Write-Host "Docker is not running. Using regular build..." -ForegroundColor Yellow
                Write-Host "Note: If you encounter 'sharp' module errors, use Docker container build instead." -ForegroundColor Yellow
                npm run build
                
                # If build fails due to file locks, provide guidance
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "Build failed. Options:" -ForegroundColor Red
                    Write-Host "1. Start Docker Desktop and rerun - container build avoids file locks and sharp issues" -ForegroundColor Yellow
                    Write-Host "2. Close all programs (file explorer, IDE, etc.) and try again" -ForegroundColor Yellow
                    Write-Host "3. Manually delete .aws-sam directory: Remove-Item -Path .aws-sam -Recurse -Force" -ForegroundColor Yellow
                }
            }
            
            if ($LASTEXITCODE -eq 0) {
                # Update the existing Lambda function code directly
                Write-Host "Updating Lambda function code..." -ForegroundColor Yellow
                $functionName = "${Environment}-leaguify-api"
                
                # Create a zip file from the built function
                $functionDir = ".aws-sam\build\ApiFunction"
                $zipFile = ".aws-sam\build\lambda-code.zip"
                
                if (Test-Path $zipFile) {
                    Remove-Item $zipFile -Force
                }
                
                # Create zip file
                Write-Host "Creating deployment package..." -ForegroundColor Gray
                Compress-Archive -Path "$functionDir\*" -DestinationPath $zipFile -Force
                
                if (Test-Path $zipFile) {
                    # Update Lambda function code using zip file
                    $updateArgs = @(
                        "lambda", "update-function-code",
                        "--function-name", $functionName,
                        "--zip-file", "fileb://$zipFile",
                        "--region", $Region
                    )
                    
                    if (-not [string]::IsNullOrEmpty($Profile)) {
                        $updateArgs = @("--profile", $Profile) + $updateArgs
                    }
                    
                    & aws $updateArgs
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "Waiting for code update to complete..." -ForegroundColor Yellow
                        Start-Sleep -Seconds 3
                        
                        # Update the handler configuration to match SAM template
                        Write-Host "Updating Lambda handler configuration..." -ForegroundColor Yellow
                        $updateConfigArgs = @(
                            "lambda", "update-function-configuration",
                            "--function-name", $functionName,
                            "--handler", "src/lambda.handler",
                            "--region", $Region
                        )
                        
                        if (-not [string]::IsNullOrEmpty($Profile)) {
                            $updateConfigArgs = @("--profile", $Profile) + $updateConfigArgs
                        }
                        
                        & aws $updateConfigArgs
                        
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "Waiting for configuration update to complete..." -ForegroundColor Yellow
                            Start-Sleep -Seconds 3
                            Write-Host "Lambda function updated successfully" -ForegroundColor Green
                        } else {
                            Write-Host "Warning: Code updated but handler configuration update failed." -ForegroundColor Yellow
                            Write-Host "You may need to manually update the handler to 'src/lambda.handler'" -ForegroundColor Yellow
                        }
                    } else {
                        Write-Host "Lambda function code update failed. Check the error messages above." -ForegroundColor Red
                    }
                } else {
                    Write-Host "Failed to create deployment package" -ForegroundColor Red
                }
            } else {
                Write-Host "Build failed. Skipping deployment." -ForegroundColor Red
            }
        }
    } finally {
        Pop-Location
    }
}

# Get API Gateway URL
Write-Host "Retrieving API Gateway URL..." -ForegroundColor Yellow
if (-not [string]::IsNullOrEmpty($Profile)) {
    $ApiGatewayUrl = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
        --output text 2>&1
} else {
    $ApiGatewayUrl = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" `
        --output text 2>&1
}

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($ApiGatewayUrl)) {
    Write-Host "Failed to retrieve API Gateway URL" -ForegroundColor Red
    exit 1
}

Write-Host "API Gateway URL: $ApiGatewayUrl" -ForegroundColor Green

# Get Avatar Bucket Name
if (-not [string]::IsNullOrEmpty($Profile)) {
    $AvatarBucketName = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
        --output text 2>&1
} else {
    $AvatarBucketName = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='AvatarBucketName'].OutputValue" `
        --output text 2>&1
}

# Step 4: Deploy frontend stack
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Deploying Frontend Stack (S3, CloudFront)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Deploy-Stack -StackName "${StackPrefix}-frontend-stack" `
    -TemplateFile "frontend-stack.yaml" `
    -Parameters "ApiGatewayUrl=$ApiGatewayUrl" `
    -DependsOn @("${StackPrefix}-backend-stack")

# Get all outputs
Write-Host ""
Write-Host "Retrieving deployment outputs..." -ForegroundColor Yellow

if (-not [string]::IsNullOrEmpty($Profile)) {
    $CloudFrontUrl = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-frontend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionUrl'].OutputValue" `
        --output text 2>&1

    $FrontendBucketName = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-frontend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" `
        --output text 2>&1

    $LambdaFunctionArn = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-backend-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" `
        --output text 2>&1

    $DBEndpoint = aws cloudformation describe-stacks `
        --stack-name "${StackPrefix}-database-stack" `
        --region $Region `
        --profile $Profile `
        --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" `
        --output text 2>&1
} else {
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
}

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
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host "   sam deploy --parameter-overrides Environment=$Environment LambdaExecutionRoleArn=`$LambdaRoleArn AvatarBucketName=`$AvatarBucket PrivateSubnet1Id=`$Subnet1 PrivateSubnet2Id=`$Subnet2 LambdaSecurityGroupId=`$SecurityGroup" -ForegroundColor Gray
Write-Host ""
Write-Host "   Or use the helper script:" -ForegroundColor White
Write-Host "   .\deploy-lambda.ps1 $Environment $Region" -ForegroundColor Gray
Write-Host ""

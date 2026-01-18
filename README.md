# Leaguify - League Statistics Tracker

A web application for creating leagues, tracking game statistics, and managing player rankings. Built with React, Node.js/Express, PostgreSQL, and deployed on AWS using CloudFormation.

## Features

- **League Management**: Create leagues with a specified number of players and games
- **Game Tracking**: Track game outcomes and scores
- **Statistics Dashboard**: View detailed statistics including:
  - Win/Loss records
  - Total points scored/against
  - Win percentage
  - League rankings
  - Point differentials

## Architecture

- **Frontend**: React SPA deployed to S3 with CloudFront
- **Backend**: Node.js/Express API deployed as Lambda functions behind API Gateway
- **Database**: RDS PostgreSQL instance
- **Infrastructure**: AWS CloudFormation templates

## Project Structure

```
Leaguify/
├── frontend/          # React frontend application
├── backend/           # Node.js/Express backend API
├── infrastructure/    # CloudFormation templates and deployment scripts
└── README.md
```

## Prerequisites

- Node.js 18.x or higher
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create:
  - VPC, Subnets, Internet Gateway, NAT Gateway
  - RDS PostgreSQL instances
  - Lambda functions
  - API Gateway
  - S3 buckets
  - CloudFront distributions
  - IAM roles and policies

## Local Development

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### Database Setup

For local development, you'll need a PostgreSQL database. You can use Docker:

```bash
docker run --name leaguify-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=leaguify -p 5432:5432 -d postgres:15
```

The application will automatically create the necessary tables on startup.

## AWS Deployment

### Step 1: Deploy Infrastructure

Navigate to the infrastructure directory and run the deployment script:

**Linux/Mac:**
```bash
cd infrastructure/scripts
chmod +x deploy.sh
./deploy.sh dev us-east-1
```

**Windows (PowerShell):**
```powershell
cd infrastructure\scripts
.\deploy.ps1 dev us-east-1
```

This will deploy the CloudFormation stacks in the correct order:
1. Main stack (VPC, networking)
2. Database stack (RDS PostgreSQL)
3. Backend stack (API Gateway, Lambda)
4. Frontend stack (S3, CloudFront)

### Step 2: Deploy Backend

1. Install Serverless Framework:
```bash
npm install -g serverless
```

2. Deploy the Lambda function:
```bash
cd backend
npm install
serverless deploy --stage dev
```

### Step 3: Build and Deploy Frontend

1. Build the React application:
```bash
cd frontend
npm install
npm run build
```

2. Get your S3 bucket name from CloudFormation outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name dev-leaguify-frontend-stack \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text
```

3. Upload the build to S3:
```bash
aws s3 sync dist/ s3://<bucket-name> --delete
```

4. Invalidate CloudFront cache:
```bash
aws cloudformation describe-stacks \
  --stack-name dev-leaguify-frontend-stack \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
  --output text | xargs -I {} aws cloudfront create-invalidation \
  --distribution-id {} \
  --paths "/*"
```

### Step 4: Configure Frontend API URL

Before building the frontend, create a `.env.production` file in the `frontend` directory:

```env
VITE_API_BASE_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev
```

Get the API Gateway URL from CloudFormation outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name dev-leaguify-backend-stack \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text
```

Then rebuild and redeploy:
```bash
npm run build
aws s3 sync dist/ s3://<bucket-name> --delete
```

## API Endpoints

### Leagues
- `POST /api/leagues` - Create a new league
- `GET /api/leagues/:id` - Get league details
- `GET /api/leagues/:id/players` - Get all players in a league
- `GET /api/leagues/:id/games` - Get all games in a league

### Games
- `POST /api/games/:gameId/outcomes` - Add game outcomes
- `GET /api/games/:gameId/outcomes` - Get game outcomes

### Statistics
- `GET /api/statistics/leagues/:id` - Get league statistics and rankings

## Database Schema

- **leagues**: League information
- **players**: Player information
- **games**: Game information
- **game_outcomes**: Individual game results

## Cost Considerations

The default configuration uses:
- `db.t3.micro` RDS instance (eligible for free tier)
- Lambda with 512MB memory
- S3 and CloudFront (pay-per-use)

For production, consider:
- Using RDS Multi-AZ for high availability
- Increasing Lambda memory/timeout as needed
- Setting up CloudFront caching policies
- Enabling RDS automated backups

## Troubleshooting

### Database Connection Issues
- Verify security groups allow Lambda to access RDS on port 5432
- Check that Lambda is in the correct VPC subnets
- Verify database credentials in Parameter Store

### API Gateway Issues
- Ensure Lambda function has proper permissions
- Check Lambda function logs in CloudWatch
- Verify API Gateway integration settings

### Frontend Not Loading
- Check S3 bucket policy allows CloudFront access
- Verify CloudFront distribution is deployed
- Check browser console for API errors

## License

MIT

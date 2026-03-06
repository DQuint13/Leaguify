# Leaguify – Deployment Runbook

Repeatable steps for deploying Leaguify to AWS. Replace `dev` and `us-east-1` with your environment and region if different.

## Prerequisites

- AWS CLI installed and configured (`aws configure` or `AWS_PROFILE` set).
- Account permissions for VPC, RDS, Lambda, API Gateway, S3, CloudFront, IAM.
- For full infrastructure: `DB_USERNAME` and `DB_PASSWORD` set (or passed into deploy scripts).

---

## 1. Deploying code-only updates (backend + frontend)

Use when application code has changed and AWS stacks are already deployed.

### 1.1 Backend (Lambda)

1. From the repo root:
   ```powershell
   cd backend
   npm install
   npm run build
   ```
   Use `npm run build:container` if Docker is running and you need the container build for native deps (e.g. `sharp`).

2. Update the Lambda function with the new code:
   ```powershell
   Compress-Archive -Path ".aws-sam\build\ApiFunction\*" -DestinationPath ".aws-sam\build\lambda-code.zip" -Force
   aws lambda update-function-code --function-name dev-leaguify-api --zip-file "fileb://.aws-sam\build\lambda-code.zip" --region us-east-1
   ```
   Add `--profile your-profile` to the `aws` command if using a profile.

### 1.2 Frontend (S3 + CloudFront)

1. Get your API URL and frontend bucket from CloudFormation:
   ```powershell
   $ApiUrl = aws cloudformation describe-stacks --stack-name dev-leaguify-backend-stack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
   $Bucket = aws cloudformation describe-stacks --stack-name dev-leaguify-frontend-stack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text
   ```

2. Build and upload:
   ```powershell
   cd frontend
   $env:VITE_API_BASE_URL = $ApiUrl
   npm install
   npm run build
   aws s3 sync dist s3://$Bucket --delete --region us-east-1
   ```

3. (Optional) Invalidate CloudFront so users get the new assets immediately:
   ```powershell
   $DistId = aws cloudformation describe-stacks --stack-name dev-leaguify-frontend-stack --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
   aws cloudfront create-invalidation --distribution-id $DistId --paths "/*" --region us-east-1
   ```

---

## 2. Full infrastructure deploy

Deploy stacks in order: main → database → backend → frontend.

### 2.1 Deploy infrastructure (VPC, database, backend Lambda, frontend S3/CloudFront)

```bash
cd infrastructure/scripts
# Linux/Mac
./deploy.sh dev us-east-1
# Windows PowerShell
.\deploy.ps1 dev us-east-1
```

Set `DB_USERNAME` and `DB_PASSWORD` (or use script parameters) as required by the database stack.

### 2.2 Deploy backend (Lambda code after stacks exist)

1. Get CloudFormation outputs for the backend stack (e.g. VPC, subnets, DB host) and any required parameters.
2. From repo root:
   ```bash
   cd backend
   npm install
   npm run build
   sam deploy --stack-name dev-leaguify-backend-lambda --parameter-overrides Environment=dev ...
   ```
   Fill in `...` with the parameter overrides your `samconfig.toml` or stack expects (e.g. from infrastructure outputs).

### 2.3 Deploy frontend (build and upload to S3)

```bash
cd frontend
export VITE_API_BASE_URL=$(aws cloudformation describe-stacks --stack-name dev-leaguify-backend-stack --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text)
npm install
npm run build
aws s3 sync dist/ s3://$(aws cloudformation describe-stacks --stack-name dev-leaguify-frontend-stack --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text) --delete
```

On Windows PowerShell, set `$env:VITE_API_BASE_URL` and use the same `aws s3 sync` with the bucket name from CloudFormation.

### 2.4 Validate deployment

```bash
cd infrastructure/scripts
# Linux/Mac
./validate-deployment.sh dev us-east-1
# Windows PowerShell
.\validate-deployment.ps1 dev us-east-1
```

---

## 3. Configuring a custom domain (AWS Console)

To serve the frontend on your own domain (e.g. `app.yourdomain.com`) instead of the default CloudFront URL.

### 3.1 Request an SSL certificate (ACM)

1. Open **AWS Certificate Manager** in **us-east-1 (N. Virginia)** (required for CloudFront).
2. **Request a certificate**.
3. Choose **Request a public certificate**, enter your domain (e.g. `app.yourdomain.com` or `*.yourdomain.com`).
4. Choose **DNS validation**, then **Request**.
5. In the certificate list, open the certificate and **Create records in Route 53** (if your domain is in Route 53), or add the shown **CNAME name** and **CNAME value** in your DNS provider.
6. Wait until the certificate status is **Issued**.

### 3.2 Add the domain to CloudFront

1. Open **CloudFront** in the console.
2. Find your frontend distribution (e.g. from your frontend stack). Note its **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`).
3. Open the distribution, then **Edit** (General tab).
4. **Alternate domain names (CNAMEs):** add your domain, e.g. `app.yourdomain.com`.
5. **Custom SSL certificate:** choose the ACM certificate you created (must be in us-east-1).
6. **Save changes**. Deployment can take a few minutes.

### 3.3 Point DNS to CloudFront

- **Route 53:** Create a record (A or AAAA) with **Alias** to your CloudFront distribution, or a CNAME to the CloudFront domain name.
- **Other DNS:** Create a **CNAME** record: name = your subdomain (e.g. `app`), value = the CloudFront distribution domain (e.g. `d1234abcd.cloudfront.net`).

After DNS propagates, open `https://app.yourdomain.com` to confirm.

**Note:** Redeploying the frontend CloudFormation stack can overwrite console changes to the distribution. To keep a custom domain in code, use stack parameters `DomainName` and `CertificateArn` in `infrastructure/cloudformation/frontend-stack.yaml`.

---

## 4. Using a domain from Cloudflare

Example: domain `yourdomain.com`, frontend at `app.yourdomain.com`.

### 4.1 Request an SSL certificate in AWS (ACM)

1. In **AWS Certificate Manager**, region **us-east-1**, **Request a certificate**.
2. **Request a public certificate**, domain: `app.yourdomain.com` (or `*.yourdomain.com` for a wildcard).
3. **DNS validation**, then **Request**.
4. On the certificate page, note the **CNAME name** and **CNAME value** for the next step.

### 4.2 Add the validation CNAME in Cloudflare

1. **Cloudflare Dashboard** → your domain → **DNS** → **Records**.
2. **Add record**: Type **CNAME**, **Name:** host part of the ACM CNAME name (e.g. `_abc123.app`), **Target:** ACM CNAME value, **Proxy status:** DNS only (grey cloud).
3. Save. Wait until ACM shows **Issued**.

### 4.3 Add the domain to CloudFront (AWS Console)

1. **CloudFront** → your frontend distribution → **Edit**.
2. **Alternate domain names (CNAMEs):** add `app.yourdomain.com`.
3. **Custom SSL certificate:** select the ACM certificate (us-east-1).
4. **Save**. Note the **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`).

### 4.4 Point your Cloudflare domain to CloudFront

1. **Cloudflare** → **DNS** → **Records** → **Add record**.
2. Type **CNAME**, Name **app**, Target = your CloudFront distribution domain (e.g. `d1234abcd.cloudfront.net`), no `https://` or trailing slash.
3. **Proxy status:** DNS only (grey) or Proxied (orange). If Proxied, set **SSL/TLS** → **Encryption mode** to **Full (strict)**.
4. Save.

After DNS propagates, open `https://app.yourdomain.com`.

**Root domain:** Use a CNAME for `@` to the CloudFront domain (Cloudflare CNAME flattening), or use Redirect Rules to send `yourdomain.com` → `https://app.yourdomain.com`.

---

## 5. Serving both root and www (e.g. kinddesert.com and www.kinddesert.com)

### 5.1 Certificate covering both names

1. In **ACM** (us-east-1), **Request a certificate** → **Request a public certificate**.
2. **Domain names** – use one of:
   - **Option A:** `kinddesert.com` and `www.kinddesert.com`
   - **Option B:** `*.kinddesert.com` and `kinddesert.com` (wildcard does not include root; add root explicitly).
3. **DNS validation**, then **Request**.
4. Add all validation CNAMEs in Cloudflare (or your DNS), **DNS only**. Wait until **Issued**.

### 5.2 CloudFront: add both domain names

1. **CloudFront** → your frontend distribution → **Edit**.
2. **Alternate domain names (CNAMEs):** add `kinddesert.com` and `www.kinddesert.com`.
3. **Custom SSL certificate:** select the certificate that lists both names.
4. **Save**. Note the **Distribution domain name**.

### 5.3 Cloudflare DNS: two records

| Type  | Name | Target                    | Proxy   |
|-------|------|---------------------------|--------|
| CNAME | `www` | `d1234abcd.cloudfront.net` | Your choice |
| CNAME | `@`   | `d1234abcd.cloudfront.net` | Your choice |

Replace with your real CloudFront domain. If Proxied, set **SSL/TLS** → **Encryption mode** to **Full (strict)**.

**Optional redirect (e.g. root → www):** **Cloudflare** → **Rules** → **Redirect Rules** → Create rule: When `(http.host eq "kinddesert.com")`, Then redirect to `https://www.kinddesert.com${uri.path}`, 301.

---

## 6. Troubleshooting

### Database connection issues

- Verify security groups allow Lambda to access RDS on port 5432.
- Confirm Lambda is in the correct VPC subnets.
- Verify database credentials in Parameter Store.

### API Gateway issues

- Ensure Lambda function has proper permissions.
- Check Lambda function logs in CloudWatch.
- Verify API Gateway integration settings.

### Frontend not loading

- Check S3 bucket policy allows CloudFront access.
- Verify CloudFront distribution is deployed.
- Check browser console for API errors (e.g. wrong API URL or CORS).

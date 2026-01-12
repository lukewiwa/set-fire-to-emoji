# GitHub Actions AWS CDK Deployment

This repository uses GitHub Actions to automatically deploy AWS CDK infrastructure using OpenID Connect (OIDC) authentication.

## 🔐 AWS OIDC Authentication Setup

OIDC is the most secure method for AWS authentication in GitHub Actions as it eliminates the need to store long-lived AWS access keys.

**NEW**: The OIDC infrastructure is now managed as a CDK stack! This automates the entire setup process.

### Prerequisites

- AWS Account with administrator access
- AWS CLI configured with admin credentials (for initial bootstrap)
- GitHub repository with Actions enabled
- Node.js 18+ installed

## 🚀 Quick Start (Automated Setup)

### Step 1: Bootstrap CDK (if not already done)

```bash
cd infra
export CDK_DEFAULT_ACCOUNT=123456789012  # Your AWS Account ID
export CDK_DEFAULT_REGION=us-east-1      # Your preferred region
npx cdk bootstrap aws://${CDK_DEFAULT_ACCOUNT}/${CDK_DEFAULT_REGION}
```

### Step 2: Deploy the GitHub OIDC Stack

This stack creates the OIDC provider and IAM role automatically:

```bash
cd infra
npx cdk deploy SetFireGitHubOidcStack
```

This will output the Role ARN that you'll need for GitHub Actions.

**Example output:**
```
✅  SetFireGitHubOidcStack

Outputs:
SetFireGitHubOidcStack.GitHubActionsRoleArn = arn:aws:iam::123456789012:role/GitHubActions-CDK-Deploy
SetFireGitHubOidcStack.GitHubOidcProviderArn = arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com
SetFireGitHubOidcStack.AllowedRepository = lukewiwa/set-fire-to-emoji
```

### Step 3: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:
   - `AWS_ROLE_ARN`: Copy the `GitHubActionsRoleArn` output from Step 2
   - `FULLY_QUALIFIED_DOMAIN`: Your base domain (e.g., `example.com`)
   - `SUB_DOMAIN`: Your subdomain (e.g., `app` or leave empty for root domain)
   - `DJANGO_SECRET_KEY`: Your Django secret key

**That's it!** GitHub Actions can now deploy your infrastructure.

---

## 📋 Manual Setup (Alternative)

If you prefer to set up the OIDC infrastructure manually through the AWS Console instead of using CDK, see the [Manual Setup Guide](#manual-setup-guide) below.

## 📦 CDK Stack Architecture

This project consists of three CDK stacks:

### 1. **SetFireGitHubOidcStack** (Bootstrap - Deploy First)
- Creates GitHub OIDC identity provider
- Creates IAM role with deployment permissions
- Must be deployed manually before GitHub Actions can run
- **Deploy command**: `npx cdk deploy SetFireGitHubOidcStack`

### 2. **SetFireCertificateStack** (Deployed by GitHub Actions)
- Creates ACM SSL/TLS certificate
- Deployed to `us-east-1` (required for CloudFront)
- Uses DNS validation via Route 53

### 3. **SetFireInfraStack** (Deployed by GitHub Actions)
- Lambda function (Django app in Docker container)
- S3 bucket for static files
- API Gateway HTTP API
- CloudFront distribution with custom domain
- Route 53 DNS records
- CloudWatch logs

## 🚀 Deployment

### Automatic Deployment

The workflow automatically triggers on:
- Push to the `main` branch
- Manual workflow dispatch (via Actions tab)

**Note**: The workflow deploys `SetFireCertificateStack` and `SetFireInfraStack` only. The `SetFireGitHubOidcStack` is not redeployed as it's used for authentication.

### Manual Deployment

1. Go to the **Actions** tab in your GitHub repository
2. Select **Deploy to AWS** workflow
3. Click **Run workflow**
4. Select the branch and environment
5. Click **Run workflow**

## 📝 Workflow Details

The deployment workflow:
1. ✅ Checks out the code
2. ✅ Sets up Node.js 18
3. ✅ Installs CDK dependencies
4. ✅ Authenticates with AWS using OIDC (no access keys needed!)
5. ✅ Builds the CDK project
6. ✅ Shows diff of changes (`cdk diff SetFireCertificateStack SetFireInfraStack`)
7. ✅ Deploys application stacks (`cdk deploy SetFireCertificateStack SetFireInfraStack`)

## 🔒 Security Benefits of OIDC

- ✅ No long-lived AWS credentials stored in GitHub
- ✅ Automatic credential rotation
- ✅ Fine-grained access control via IAM policies
- ✅ Audit trail in AWS CloudTrail
- ✅ Credentials expire after each workflow run

## 🛠️ Customization

### Change Deployment Region

Edit the `AWS_REGION` environment variable in `.github/workflows/deploy.yml`:

```yaml
env:
  AWS_REGION: 'us-west-2'  # Change to your preferred region
```

### Add Additional Environments

You can create separate workflows for different environments (staging, production) by:
1. Creating different IAM roles for each environment
2. Using different secrets or variables for each environment
3. Modifying the workflow to use environment-specific configurations

### Deploy Specific Stacks

To deploy only specific stacks, modify the deploy step:

```yaml
- name: CDK Deploy
  run: |
    cd infra
    npx cdk deploy CertificateStack --require-approval never
```

---

## 📖 Manual Setup Guide

<details>
<summary>Click to expand manual setup instructions (if not using the CDK stack)</summary>

### Manual Step 1: Create GitHub OIDC Provider in AWS

1. Sign in to the AWS Management Console
2. Navigate to **IAM** → **Identity providers**
3. Click **Add provider**
4. Select **OpenID Connect**
5. Configure the provider:
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`
6. Click **Add provider**

### Manual Step 2: Create IAM Role for GitHub Actions

1. Navigate to **IAM** → **Roles**
2. Click **Create role**
3. Select **Web identity** as the trusted entity type
4. Configure:
   - **Identity provider**: Select the GitHub OIDC provider you created
   - **Audience**: `sts.amazonaws.com`
5. Click **Next**
6. Attach the following policies:
   - `AWSCloudFormationFullAccess`
   - `IAMFullAccess`
   - `AmazonS3FullAccess`
   - `AWSLambda_FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonRoute53FullAccess`
   - `AWSCertificateManagerFullAccess`
   - `CloudWatchLogsFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AmazonEC2ContainerRegistryFullAccess`
7. Name the role (e.g., `GitHubActions-CDK-Deploy`)
8. Click **Create role**

### Manual Step 3: Update Role Trust Policy

1. Open the role you just created
2. Go to the **Trust relationships** tab
3. Click **Edit trust policy**
4. Replace with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:lukewiwa/set-fire-to-emoji:*"
        }
      }
    }
  ]
}
```

5. Click **Update policy**

</details>

---

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [GitHub Actions OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Identity Providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

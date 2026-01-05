# GitHub Actions AWS CDK Deployment

This repository uses GitHub Actions to automatically deploy AWS CDK infrastructure using OpenID Connect (OIDC) authentication.

## 🔐 AWS OIDC Authentication Setup

OIDC is the most secure method for AWS authentication in GitHub Actions as it eliminates the need to store long-lived AWS access keys.

### Prerequisites

- AWS Account with administrator access
- GitHub repository with Actions enabled

### Step 1: Create GitHub OIDC Provider in AWS

1. Sign in to the AWS Management Console
2. Navigate to **IAM** → **Identity providers**
3. Click **Add provider**
4. Select **OpenID Connect**
5. Configure the provider:
   - **Provider URL**: `https://token.actions.githubusercontent.com`
   - **Audience**: `sts.amazonaws.com`
6. Click **Add provider**

### Step 2: Create IAM Role for GitHub Actions

1. Navigate to **IAM** → **Roles**
2. Click **Create role**
3. Select **Web identity** as the trusted entity type
4. Configure:
   - **Identity provider**: Select the GitHub OIDC provider you created
   - **Audience**: `sts.amazonaws.com`
5. Click **Next**
6. Attach the following policies (or create a custom policy with least privilege):
   - `AWSCloudFormationFullAccess`
   - `IAMFullAccess`
   - `AmazonS3FullAccess`
   - `AWSLambda_FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonRoute53FullAccess`
   - `AWSCertificateManagerFullAccess`
   - `CloudWatchLogsFullAccess`
   - `AmazonAPIGatewayAdministrator`
7. Name the role (e.g., `GitHubActions-CDK-Deploy-Role`)
8. Click **Create role**

### Step 3: Update Role Trust Policy

1. Open the role you just created
2. Go to the **Trust relationships** tab
3. Click **Edit trust policy**
4. Replace with the following policy (update `YOUR_GITHUB_ORG` and `YOUR_REPO_NAME`):

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
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO_NAME:*"
        }
      }
    }
  ]
}
```

5. Click **Update policy**

### Step 4: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:
   - `AWS_ROLE_ARN`: The ARN of the IAM role (e.g., `arn:aws:iam::123456789012:role/GitHubActions-CDK-Deploy-Role`)
   - `FULLY_QUALIFIED_DOMAIN`: Your base domain (e.g., `example.com`)
   - `SUB_DOMAIN`: Your subdomain (e.g., `app` or leave empty for root domain)
   - `DJANGO_SECRET_KEY`: Your Django secret key

## 🚀 Deployment

### Automatic Deployment

The workflow automatically triggers on:
- Push to the `main` branch
- Manual workflow dispatch (via Actions tab)

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
6. ✅ Shows diff of changes (`cdk diff`)
7. ✅ Deploys all stacks (`cdk deploy --all`)

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

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [GitHub Actions OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Identity Providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)

# CDK Deployment Guide

## Initial Setup (One-time)

### 1. Bootstrap CDK

```bash
export CDK_DEFAULT_ACCOUNT=123456789012  # Replace with your AWS Account ID
export CDK_DEFAULT_REGION=us-east-1      # Replace with your preferred region

npx cdk bootstrap aws://${CDK_DEFAULT_ACCOUNT}/${CDK_DEFAULT_REGION}
```

### 2. Deploy GitHub OIDC Stack (for CI/CD)

```bash
npx cdk deploy SetFireGitHubOidcStack
```

**Note the output:** Copy the `GitHubActionsRoleArn` - you'll need this for GitHub Secrets.

### 3. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ROLE_ARN` - From the output above
- `FULLY_QUALIFIED_DOMAIN` - e.g., `example.com`
- `SUB_DOMAIN` - e.g., `app`
- `DJANGO_SECRET_KEY` - Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

### 4. Deploy Application Infrastructure

You can either:

**Option A: Via GitHub Actions** (recommended)
- Push to `main` branch, and GitHub Actions will deploy automatically

**Option B: Manually**
```bash
export FULLY_QUALIFIED_DOMAIN=example.com
export SUB_DOMAIN=app
export DJANGO_SECRET_KEY=your-secret-key

npm run build
npx cdk deploy SetFireCertificateStack SetFireInfraStack
```

## Stack Overview

| Stack Name | Purpose | Deploy Method |
|------------|---------|---------------|
| `SetFireGitHubOidcStack` | GitHub Actions authentication | Manual (once) |
| `SetFireCertificateStack` | SSL/TLS certificate | GitHub Actions or Manual |
| `SetFireInfraStack` | Application infrastructure | GitHub Actions or Manual |

## Useful Commands

```bash
# List all stacks
npx cdk list

# Show what will change
npx cdk diff SetFireInfraStack

# Deploy a specific stack
npx cdk deploy SetFireInfraStack

# Deploy all stacks
npx cdk deploy --all

# Destroy a stack (careful!)
npx cdk destroy SetFireInfraStack

# Synthesize CloudFormation template
npx cdk synth SetFireInfraStack
```

## Customizing GitHub OIDC Stack

Edit `infra/bin/infra.ts` to customize the OIDC configuration:

```typescript
const githubOidcStack = new GitHubOidcStack(app, "SetFireGitHubOidcStack", {
  githubOrg: "your-org",           // Change this
  githubRepo: "your-repo",         // Change this
  allowedBranches: ["main"],       // Optional: restrict to specific branches
  env: { /* ... */ },
});
```

## Troubleshooting

### "No environment variable found for FULLY_QUALIFIED_DOMAIN"

Make sure you've set the required environment variables:
```bash
export FULLY_QUALIFIED_DOMAIN=example.com
export SUB_DOMAIN=app
export DJANGO_SECRET_KEY=your-secret-key
```

### GitHub Actions fails with "User is not authorized to perform: sts:AssumeRoleWithWebIdentity"

1. Verify the `AWS_ROLE_ARN` secret is correctly set in GitHub
2. Check that the role's trust policy allows your repository
3. Ensure the OIDC provider is created in AWS

### Certificate validation pending

The ACM certificate uses DNS validation. Make sure:
1. The domain is managed by Route 53
2. The hosted zone exists
3. DNS propagation has completed (can take a few minutes)

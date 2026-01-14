# SetFire Infrastructure

CDK infrastructure for SetFire deployed using AWS CDK v2 with GitHub Actions OIDC.

## Architecture

The infrastructure consists of four stacks:

1. **OidcStack** - GitHub OIDC provider and IAM role for CI/CD
2. **DNSStack** - Route53 hosted zone
3. **CertificateStack** - ACM certificate (us-east-1 for CloudFront)
4. **InfraStack** - Lambda, S3, API Gateway, and CloudFront distribution

## Prerequisites

- Node.js 22+
- AWS CLI configured
- CDK CLI: `npm install -g aws-cdk`

## Initial Setup

### 1. Bootstrap CDK

Bootstrap CDK in your primary region and us-east-1:

```bash
just bootstrap
# Then bootstrap us-east-1
AWS_DEFAULT_REGION=us-east-1 just bootstrap
```

### 2. Configure Context

Update `cdk.context.json` with your domain and GitHub details.

### 3. Deploy OIDC Stack

```bash
just deploy-oidc
```

Note the `DeployRoleArn` output for GitHub Actions.

### 4. Deploy Application Stacks

```bash
just deploy "your-django-secret-key"
```

### 5. Update DNS Name Servers

Get the name servers from Route53 and update your domain registrar:

```bash
aws route53 list-hosted-zones
aws route53 get-hosted-zone --id <HOSTED_ZONE_ID>
```

### 6. Configure GitHub Actions

Add these secrets to your GitHub repository:

- `AWS_DEPLOY_ROLE_ARN` - The ARN from step 3
- `DJANGO_SECRET_KEY` - Your Django secret key

Deployments will trigger automatically on semver tags (e.g., `v1.0.0`).

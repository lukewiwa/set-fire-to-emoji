# Set Fire To Emoji

A website to quickly overlay a fire gif on top of an image.

Django app deployed on AWS Lambda with CDK infrastructure.

## Quick Start

### Local Development
```bash
make dev      # Start Django dev server
make test     # Run tests
```

### Deploy to AWS

**First time setup:**
```bash
cd infra
export CDK_DEFAULT_ACCOUNT=your-account-id
export CDK_DEFAULT_REGION=us-east-1

# Bootstrap CDK
npx cdk bootstrap

# Deploy OIDC stack for GitHub Actions
npx cdk deploy SetFireGitHubOidcStack
```

Copy the `GitHubActionsRoleArn` output and add these GitHub Secrets:
- `AWS_ROLE_ARN` - The role ARN from above
- `FULLY_QUALIFIED_DOMAIN` - Your domain
- `SUB_DOMAIN` - Your subdomain
- `DJANGO_SECRET_KEY` - Django secret

**Deploy application:**
```bash
# Via GitHub Actions (push to main)
# OR manually:
export FULLY_QUALIFIED_DOMAIN=example.com
export SUB_DOMAIN=app
export DJANGO_SECRET_KEY=your-secret
make deploy
```

## Architecture

- **Lambda**: Django app in Docker container (ARM64)
- **API Gateway**: HTTP API frontend
- **CloudFront**: CDN with custom domain
- **S3**: Static files storage
- **Route53**: DNS management
- **ACM**: SSL certificates
- **GitHub Actions**: CI/CD with OIDC authentication

## CDK Stacks

| Stack | Purpose | Deploy |
|-------|---------|--------|
| `SetFireGitHubOidcStack` | GitHub OIDC auth | Manual (once) |
| `SetFireCertificateStack` | SSL certificate | Auto via Actions |
| `SetFireInfraStack` | App infrastructure | Auto via Actions |

## Useful Commands

```bash
# CDK
cd infra
npx cdk list                    # List stacks
npx cdk diff SetFireInfraStack  # Show changes
npx cdk deploy --all            # Deploy all stacks

# Django
cd src
uv run python manage.py migrate
uv run python manage.py createsuperuser
```

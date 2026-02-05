# CLAUDE.md - AI Assistant Guide for Set Fire To Emoji

This document provides comprehensive guidance for AI assistants working with the Set Fire To Emoji codebase.

## Project Overview

**Set Fire To Emoji** is a serverless web application that overlays fire GIFs and meme images on user-uploaded photos. Built with Django and deployed to AWS Lambda via AWS CDK.

- **Live Site:** https://setfire.lukewiwa.com
- **Primary Language:** Python 3.13 (Django 4.2)
- **Infrastructure:** TypeScript (AWS CDK 2.x)
- **Architecture:** Serverless (Lambda + API Gateway + CloudFront + S3)
- **Region:** ap-southeast-2 (Australia)

## Key Technologies Stack

### Backend
- **Django 4.2** - Web framework with class-based views
- **Pillow** - Image processing (animated GIF support)
- **Gunicorn** - WSGI server
- **uv** - Modern Python package manager (replacement for pip/poetry)
- **WhiteNoise** - Static file serving
- **django-storages** - S3 backend for file uploads

### Infrastructure
- **AWS Lambda** (ARM64, 1024MB memory, 20s timeout)
- **API Gateway v2** (HTTP API, not REST API)
- **CloudFront** - CDN with custom domain
- **S3** - Temporary file storage (1-day lifecycle)
- **Route53** - DNS management
- **ACM** - SSL/TLS certificates
- **AWS CDK 2.234.1** - Infrastructure as Code

### Frontend
- **Bootstrap 5** - CSS framework (CDN-based)
- **Django Templates** - Server-side rendering
- **Crispy Forms** - Form rendering with Bootstrap 5

### Development
- **VS Code Dev Containers** - Reproducible development environment
- **Just** - Task runner (modern Make alternative)
- **Docker Compose** - Local services (LocalStack S3 mock)
- **ty** - Python type checker (migrated from mypy)
- **ruff** - Python linter and formatter

## Repository Structure

```
set-fire-to-emoji/
├── src/                           # Django application
│   ├── config/                    # Django project configuration
│   │   ├── settings.py           # Main settings (use django-environ)
│   │   ├── urls.py               # Root URL configuration
│   │   ├── wsgi.py               # WSGI entry point
│   │   └── asgi.py               # ASGI entry point
│   ├── core/                      # Main application
│   │   ├── views.py              # 3 class-based views (SetFire, OldManYellsAt, Result)
│   │   ├── models.py             # TempFile model with UUID primary key
│   │   ├── forms.py              # SetFireForm, OldManYellsAtForm
│   │   ├── urls.py               # App URL patterns
│   │   ├── migrations/           # Database migrations
│   │   ├── templates/core/       # Django templates (Bootstrap 5)
│   │   └── static/templates/     # Binary assets (fire.gif, old-man-yells-at.png)
│   ├── public/                    # Static files (favicon, etc.)
│   ├── manage.py                  # Django management commands
│   ├── gunicorn.conf.py          # Gunicorn configuration for Lambda
│   ├── pyproject.toml            # Python dependencies (uv format)
│   └── uv.lock                   # Locked dependencies
├── infra/                         # AWS CDK infrastructure
│   ├── bin/infra.ts              # CDK app entry point
│   ├── lib/                       # CDK stacks
│   │   ├── infra-stack.ts        # Main stack (Lambda, API Gateway, CloudFront)
│   │   ├── certificate-stack.ts  # ACM certificate (must be us-east-1)
│   │   ├── dns-stack.ts          # Route53 hosted zone
│   │   ├── oidc-stack.ts         # GitHub Actions OIDC authentication
│   │   └── forwardHostFunction.js # CloudFront Lambda@Edge for Host header
│   ├── test/infra.test.ts        # Jest tests for CDK stacks
│   ├── package.json              # Node.js dependencies
│   ├── tsconfig.json             # TypeScript configuration (strict mode)
│   ├── cdk.json                  # CDK context and configuration
│   └── jest.config.js            # Jest test configuration
├── .devcontainer/                # VS Code dev container configuration
│   ├── devcontainer.json         # Container setup with extensions
│   ├── docker-compose.yml        # Local services (Django + LocalStack S3)
│   └── .env.example              # Environment variable template
├── Dockerfile                     # Production Lambda container image
├── Justfile                       # Task automation commands
├── .gitignore                    # Git ignore patterns
└── README.md                     # User-facing documentation
```

## Development Workflows

### Initial Setup

1. **Clone and open in VS Code Dev Container:**
   ```bash
   # Ensure Docker is running
   # Open folder in VS Code
   # Click "Reopen in Container" when prompted
   ```

2. **Copy environment variables:**
   ```bash
   cp .devcontainer/.env.example .devcontainer/.env
   ```

3. **Install Python dependencies:**
   ```bash
   just install
   # Equivalent to: cd src && uv sync --dev
   ```

4. **Start development server:**
   ```bash
   just runserver
   # Django dev server runs on 0.0.0.0:8080
   # LocalStack S3 mock on port 9000
   # S3 admin UI on port 9001
   ```

### Common Commands (via Justfile)

```bash
just install           # Install Python dependencies with uv
just runserver         # Start Django dev server on port 8080
just collectstatic     # Collect static files into /bundle
just sso-login         # AWS SSO authentication
just bootstrap         # Bootstrap CDK (one-time setup)
just deploy-oidc       # Deploy OIDC stack for GitHub Actions
just deploy            # Deploy all CDK infrastructure
just infra-install     # Install Node.js dependencies for CDK
```

### Manual Commands

```bash
# Python package management
cd src
uv sync --dev          # Install all dependencies
uv add <package>       # Add new package
uv remove <package>    # Remove package
uv lock                # Update lock file

# Django commands
cd src
python manage.py migrate            # Run migrations
python manage.py makemigrations     # Create migrations
python manage.py createsuperuser    # Create admin user
python manage.py shell              # Django shell
python manage.py collectstatic      # Collect static files

# Infrastructure
cd infra
npm install            # Install Node dependencies
npm test               # Run Jest tests
cdk diff               # Show infrastructure changes
cdk synth              # Synthesize CloudFormation
cdk deploy             # Deploy infrastructure
```

### Local Development Environment

The dev container provides:
- **Python 3.13** with uv package manager
- **Node.js 22** for CDK
- **LocalStack S3 mock** (rustfs) for testing S3 operations
- **AWS CLI** pre-configured
- **VS Code extensions:**
  - Python, Pylance, Django support
  - Prettier, ESLint, Ruff
  - Docker, YAML support

Access local services:
- **Django app:** http://localhost:8080
- **S3 mock:** http://localhost:9000
- **S3 admin UI:** http://localhost:9001

## Code Conventions

### Python (Django)

#### Views
- **Use class-based views:** `TemplateView`, `CreateView`, `DetailView`
- **Handle errors gracefully:** Check for missing objects, return 404 or redirect
- **Image processing in `form_valid()`:** Keep business logic in the form processing
- **Use logging:** Import `logging` module and log at INFO level for important actions

Example pattern from `core/views.py`:
```python
class SetFire(CreateView):
    """View for creating fire overlays"""
    model = TempFile
    form_class = SetFireForm
    template_name = "core/tempfile_form.html"

    def form_valid(self, form):
        # Process image here
        logger.info(f"Processing image for {self.object.id}")
        return super().form_valid(form)
```

#### Models
- **Use UUID primary keys:** String-based UUIDs, not auto-increment integers
- **Define `get_absolute_url()`:** For reverse URL lookups
- **Use FileField for uploads:** Stored in S3 via django-storages

Example from `core/models.py`:
```python
class TempFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    input_file = models.ImageField(upload_to="uploads/")
    output_file = models.FileField(upload_to="outputs/")

    def get_absolute_url(self):
        return reverse("core:result", kwargs={"pk": self.id})
```

#### Forms
- **Use ModelForm:** For model-backed forms
- **Add help text:** Guide users on expected input
- **Exclude auto-generated fields:** Like output_file

Example from `core/forms.py`:
```python
class SetFireForm(forms.ModelForm):
    class Meta:
        model = TempFile
        fields = ["input_file", "transparent"]
        exclude = ["output_file"]
```

#### Settings (`config/settings.py`)
- **Use django-environ:** For environment variable configuration
- **Configure S3 storage:** Via django-storages with boto3
- **Enable WhiteNoise:** For static file serving
- **Use migrate middleware:** Runs migrations on startup (important for Lambda)

Key settings pattern:
```python
import environ
env = environ.Env()

# S3 Configuration
AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

# Static files
STATIC_URL = "/static/"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```

#### Templates
- **Inherit from base.html:** Block-based template inheritance
- **Use Bootstrap 5 classes:** Container, grid system, utilities
- **Use Crispy Forms:** `{% crispy form %}` for consistent form rendering
- **Static file references:** `{% load static %}` and `{% static "path" %}`

#### Code Quality
- **Type hints:** Use Python type hints for all functions
- **Run ty:** Type checker (replacement for mypy): `cd src && ty check`
- **Run ruff:** Linter and formatter: `cd src && ruff check` and `ruff format`
- **Follow PEP 8:** Standard Python style conventions

### TypeScript (AWS CDK)

#### Stack Structure
- **Export classes extending `cdk.Stack`:**
  ```typescript
  export class InfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: InfraStackProps) {
      super(scope, id, props);
      // Stack resources
    }
  }
  ```

- **Use typed props interfaces:**
  ```typescript
  export interface InfraStackProps extends cdk.StackProps {
    certificate: acm.ICertificate;
    hostedZone: route53.IHostedZone;
  }
  ```

- **Manage dependencies:** Use `stack.addDependency()` for cross-stack dependencies

#### Construct Patterns
- **Use L2 constructs:** Higher-level constructs (e.g., `DockerImageFunction`, not `CfnFunction`)
- **Configure logging:** Set retention policies for CloudWatch logs
- **Use context values:** Externalize configuration in `cdk.json`
- **Descriptive IDs:** Clear construct identifiers (e.g., `"SetFireBucket"`, `"SetFireFunctionDocker"`)

#### Naming Conventions
- **PascalCase:** Classes, interfaces, types
- **camelCase:** Properties, variables, functions
- **UPPER_SNAKE_CASE:** Constants
- **Construct IDs:** Descriptive and unique within stack

#### Code Quality
- **Strict TypeScript:** Enabled in `tsconfig.json`
- **Run tests:** `cd infra && npm test`
- **Validate stacks:** `cd infra && cdk synth` to check for errors
- **Use ESLint:** For code linting (optional via VS Code extension)

## Architecture and Infrastructure

### Stack Deployment Order

1. **OidcStack** (SetFireOidcStack)
   - GitHub OIDC provider for keyless AWS authentication
   - IAM role for GitHub Actions
   - Deploy once: `just deploy-oidc`

2. **DNSStack** (SetFireDNSStack)
   - Route53 hosted zone for domain
   - Domain from context: `fullyQualifiedDomain` in `cdk.json`

3. **CertificateStack** (SetFireCertificateStack)
   - ACM certificate for HTTPS
   - **MUST be in us-east-1** (CloudFront requirement)
   - DNS validation via Route53
   - Depends on DNSStack

4. **InfraStack** (SetFireInfraStack)
   - Lambda function (Docker image)
   - API Gateway HTTP API
   - CloudFront distribution
   - S3 bucket for temporary files
   - Route53 A record (alias to CloudFront)
   - Depends on CertificateStack and DNSStack

### Lambda Configuration

**Key Settings:**
- **Architecture:** ARM64 (cost-optimized)
- **Memory:** 1024 MB
- **Timeout:** 20 seconds
- **Image:** Multi-stage Docker build from `python:3.13-slim-bookworm`
- **Handler:** Uses Lambda Adapter (0.9.1) for HTTP compatibility
- **Port:** 8000 (Gunicorn)

**Environment Variables:**
- `DJANGO_SECRET_KEY` - Secret key for Django
- `ALLOWED_HOSTS` - Domain + 127.0.0.1
- `AWS_STORAGE_BUCKET_NAME` - S3 bucket name
- `PORT` - 8000 (for Lambda Adapter)
- `REMOVE_MIGRATE_MIDDLEWARE` - Not set (migrations run on startup)

**Important:** Django's migrate middleware automatically runs migrations on Lambda startup. This is essential for serverless deployments where database state may not persist.

### CloudFront Configuration

**Key Settings:**
- **Origin:** API Gateway HTTP API
- **Cache Policy:** CachingOptimized
- **Origin Request Policy:** AllowAllViewerExceptHostHeader
- **Lambda@Edge Function:** `forwardHostFunction.js` adds `x-forwarded-host` header
- **HTTP Methods:** GET, POST, OPTIONS, etc. (all allowed)
- **HTTPS:** Required (HTTP redirects to HTTPS)

**Why Lambda@Edge?** Django's `ALLOWED_HOSTS` validation requires the original Host header. CloudFront replaces it with the origin hostname, so Lambda@Edge forwards it via `x-forwarded-host`.

### S3 Storage

**Configuration:**
- **Public Access:** Blocked (all settings enabled)
- **Lifecycle:** 1-day expiration (automatic cleanup)
- **Overwrite:** Disabled (prevents filename collisions)
- **Access:** Private by default

**Usage Pattern:** Users upload images, Django processes them, stores output in S3, and serves download links. Files automatically delete after 24 hours for privacy.

### Database

**Development:** SQLite (local file)
**Production:** SQLite in Lambda `/tmp` directory (ephemeral, 512MB limit)

**Important:** Database does NOT persist between Lambda invocations. Only S3 files persist. The TempFile model tracks uploaded/processed files, but records may disappear between requests. Design views to handle missing database records gracefully.

### GitHub Actions CI/CD

**Trigger:** Semantic version tags matching `v*.*.*` (e.g., `v1.0.0`)

**Workflow:**
1. Checkout code
2. Configure AWS credentials via OIDC (no stored secrets)
3. Setup Node.js 22
4. Install dependencies: `npm ci`
5. Deploy CDK: `cdk deploy SetFireInfraStack --require-approval never`

**Secrets Required:**
- `DJANGO_SECRET_KEY` - Django secret key (GitHub secret)

**Region:** ap-southeast-2 (Sydney)
**Runner:** ubuntu-24.04-arm (ARM architecture)

## Testing Guidelines

### Current State
- **Infrastructure Tests:** Placeholder Jest tests in `infra/test/infra.test.ts`
- **Application Tests:** No pytest/unittest tests currently

### Testing Infrastructure Changes

```bash
cd infra
npm test
# Runs Jest tests with aws-cdk/assertions
```

**Pattern for CDK tests:**
```typescript
import { Template } from 'aws-cdk-lib/assertions';

test('Lambda function created', () => {
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'provided.al2',
    Architectures: ['arm64']
  });
});
```

### Manual Testing

1. **Local development:** Run `just runserver` and test at http://localhost:8080
2. **S3 operations:** Verify uploads work with LocalStack S3 mock
3. **Image processing:** Upload test images and verify output quality
4. **Error handling:** Test with invalid inputs, large files, unsupported formats

### Adding Application Tests

When adding pytest tests:
1. Create `src/tests/` directory
2. Add `pytest` and `pytest-django` to dev dependencies: `uv add --dev pytest pytest-django`
3. Create `pytest.ini` or `pyproject.toml` test configuration
4. Write tests for views, models, forms
5. Update Justfile with `test` command

## Common Tasks and Troubleshooting

### Adding a New Python Dependency

```bash
cd src
uv add <package-name>
# Updates pyproject.toml and uv.lock
# Rebuilds Docker image on next deployment
```

### Adding a New CDK Dependency

```bash
cd infra
npm install <package-name>
# Updates package.json and package-lock.json
```

### Updating Python to New Version

1. Update `pyproject.toml`: `requires-python = ">=3.14"`
2. Update `Dockerfile`: `FROM public.ecr.aws/docker/library/python:3.14-slim-bookworm`
3. Update `.devcontainer/devcontainer.json`: Python version feature
4. Rebuild dev container
5. Redeploy infrastructure

### Debugging Lambda Locally

The Lambda function runs Django via Gunicorn with Lambda Adapter. To simulate:

```bash
cd src
export DJANGO_SECRET_KEY="test-secret-key-for-development"
export ALLOWED_HOSTS="localhost,127.0.0.1"
export AWS_STORAGE_BUCKET_NAME="setfiretempbucket"
export AWS_S3_ENDPOINT_URL="http://localhost:9000"
gunicorn -c gunicorn.conf.py config.wsgi:application
```

Access at http://localhost:8000

### Viewing CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups --region ap-southeast-2

# Tail Lambda logs
aws logs tail /aws/lambda/SetFireInfraStack-SetFireFunctionDocker-<hash> --follow --region ap-southeast-2

# Tail API Gateway logs
aws logs tail SetFireInfraStack-SetFireApiLogs-<hash> --follow --region ap-southeast-2
```

### Fixing Migration Issues

If Lambda fails due to migration errors:

1. **Local fix:**
   ```bash
   cd src
   python manage.py makemigrations
   python manage.py migrate
   git add core/migrations/
   git commit -m "Add missing migrations"
   ```

2. **Redeploy:**
   ```bash
   git push
   # Or for immediate deployment
   just deploy
   ```

The migrate middleware will automatically apply migrations on next Lambda cold start.

### S3 Access Issues

**Symptoms:** Files not uploading, permission errors

**Solutions:**
1. **Check IAM permissions:** Lambda execution role needs S3 read/write to bucket
2. **Verify bucket name:** Check `AWS_STORAGE_BUCKET_NAME` environment variable
3. **Check S3 lifecycle:** Files delete after 1 day, adjust if needed
4. **Local S3 mock:** Ensure LocalStack is running: `docker compose ps`

### CloudFront Cache Issues

**Symptoms:** Old content still served after deployment

**Solutions:**
1. **Create invalidation:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id <DISTRIBUTION_ID> \
     --paths "/*"
   ```

2. **Update cache policy:** Modify `CachingOptimized` in `infra-stack.ts` if needed

### ALLOWED_HOSTS Errors

**Symptoms:** Django returns 400 Bad Request with "Invalid HTTP_HOST header"

**Solutions:**
1. **Verify Lambda@Edge function:** Check `forwardHostFunction.js` is attached to CloudFront
2. **Check ALLOWED_HOSTS:** Should include domain name in Lambda environment
3. **Test locally:** Add hostname to `ALLOWED_HOSTS` in `.env`

## Important Constraints and Considerations

### Lambda Limitations

1. **Execution Time:** 20-second timeout (adjust if processing large images)
2. **Memory:** 1024 MB (increase if OOM errors occur)
3. **Ephemeral Storage:** 512 MB in `/tmp` by default
4. **Cold Starts:** First request after idle period is slower (ARM64 helps)
5. **No Persistent State:** Database and filesystem do NOT persist

### Image Processing

1. **Animated GIF Support:** Pillow handles frame-by-frame processing
2. **Transparency:** Optional transparency mode for fire overlay
3. **File Size Limits:** API Gateway has 10 MB payload limit for HTTP API
4. **Supported Formats:** PNG, JPEG, GIF (input); GIF (output for fire), PNG (output for meme)

### Security Considerations

1. **Django Secret Key:** NEVER commit to version control, use GitHub Secrets
2. **S3 Public Access:** Always blocked, files served via signed URLs or public reads disabled
3. **ALLOWED_HOSTS:** Must include domain to prevent host header injection
4. **OIDC Role:** Currently uses AdministratorAccess (scope down for production)
5. **File Uploads:** Validate file types and sizes to prevent abuse

### Cost Optimization

1. **ARM64 Architecture:** ~20% cheaper than x86_64 for Lambda
2. **CloudFront Caching:** Reduces Lambda invocations
3. **S3 Lifecycle:** Automatic deletion prevents storage costs from growing
4. **HTTP API:** Cheaper than REST API (API Gateway)
5. **1-day File Retention:** Balance between user convenience and storage costs

### Development Best Practices

1. **Use Dev Container:** Ensures consistent environment across team
2. **Test Locally First:** Use LocalStack S3 mock before deploying
3. **Small Commits:** Incremental changes are easier to debug
4. **Type Everything:** Python type hints + TypeScript strict mode
5. **Log Appropriately:** Use logging for debugging, not print statements
6. **Handle Missing Data:** Views should gracefully handle missing TempFile records

### Deployment Best Practices

1. **Test CDK Changes:** Run `cdk synth` and `cdk diff` before deploying
2. **Use Semantic Versioning:** GitHub Actions triggers on `v*.*.*` tags
3. **Monitor Logs:** Check CloudWatch after deployment for errors
4. **Invalidate Cache:** Create CloudFront invalidation if static files change
5. **Backup CDK Context:** `cdk.json` contains critical configuration

## Migration from mypy to ty

**Recent Change:** The project migrated from mypy to ty for Python type checking.

**Why ty?** Faster type checking, better error messages, modern Python support.

**Usage:**
```bash
cd src
ty check              # Type check all files
ty check core/        # Type check specific directory
```

**Configuration:** Uses `pyproject.toml` for ty settings (similar to mypy).

**Type Stubs:** Uses `django-types` for Django type hints.

## Key Files Reference

- **`src/config/settings.py`** - Django configuration, environment variables
- **`src/core/views.py`** - Main application views (SetFire, OldManYellsAt, Result)
- **`src/core/models.py`** - TempFile model definition
- **`src/core/forms.py`** - Form definitions for image uploads
- **`Dockerfile`** - Lambda container image build
- **`infra/lib/infra-stack.ts`** - Main infrastructure stack
- **`infra/lib/forwardHostFunction.js`** - CloudFront Lambda@Edge function
- **`infra/cdk.json`** - CDK configuration and context values
- **`Justfile`** - Task automation commands
- **`.devcontainer/devcontainer.json`** - Dev container configuration
- **`.github/workflows/deploy.yml`** - CI/CD pipeline

## Getting Help

If you encounter issues:

1. **Check CloudWatch Logs:** Most errors appear in Lambda or API Gateway logs
2. **Review Recent Changes:** Git history shows what changed recently
3. **Test Locally:** Reproduce issue in dev container with LocalStack
4. **Check AWS Console:** Verify resources exist and are configured correctly
5. **CDK Diff:** See what infrastructure changes are pending

## Summary for AI Assistants

When working with this codebase:

1. **Respect the architecture:** Serverless constraints (no persistent state)
2. **Use the right tools:** uv for Python, npm for Node.js, Just for tasks
3. **Follow conventions:** Class-based views, ModelForms, typed CDK stacks
4. **Test thoroughly:** Local dev with S3 mock, then deploy to staging
5. **Mind the dependencies:** InfraStack depends on Certificate and DNS stacks
6. **Log appropriately:** Use logging module, check CloudWatch for errors
7. **Handle ephemeral state:** Database does NOT persist in Lambda
8. **Optimize for cost:** ARM64, CloudFront caching, S3 lifecycle
9. **Security first:** Never commit secrets, validate inputs, block public S3 access
10. **Document changes:** Update this file when architecture or conventions change

This codebase is production-ready, well-structured, and follows AWS serverless best practices. Treat it with care and maintain the high quality standards already established.

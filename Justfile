# Common project tasks

# Install Python deps (including dev extras) into .venv via uv
install:
	cd src && uv sync --dev

# Run Django dev server on port 8080
runserver:
	cd src && uv run python ./manage.py runserver 0.0.0.0:8080

# Collect static assets into /bundle
collectstatic:
	cd src && ALLOWED_HOSTS="," SECRET_KEY=dummy uv run python ./manage.py collectstatic --noinput --clear

# Login to AWS via SSO (defaults to the 'default' profile)
sso-login profile="default":
	aws sso login --profile {{profile}}

# Bootstrap CDK (uses the region from your logged-in profile)
bootstrap:
	cd infra && npm run cdk -- bootstrap

# Deploy OIDC stack (one-time setup for GitHub Actions)
deploy-oidc:
	cd infra && npm ci && npm run cdk -- deploy SetFireOidcStack --require-approval never

# Deploy CDK stacks (no approval prompts)
deploy secret_key:
	cd infra && npm ci && npm run cdk -- deploy SetFireInfraStack --require-approval never --context djangoSecretKey="{{secret_key}}"

# Install Node deps for infra
infra-install:
	cd infra && npm ci

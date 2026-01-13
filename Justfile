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

# Deploy CDK stacks (no approval prompts)
deploy:
	cd infra && npm ci && npm run cdk -- deploy --require-approval never

# Install Node deps for infra
infra-install:
	cd infra && npm ci

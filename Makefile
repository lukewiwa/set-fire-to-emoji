.PHONY: runserver
runserver:
	cd src && uv run python ./manage.py runserver 0.0.0.0:8080

.PHONY: deploy
deploy:
	cd infra && npm run cdk -- deploy --require-approval never

.PHONY: static-build
static-build:
	cd src && uv run python ./manage.py collectstatic --noinput --clear
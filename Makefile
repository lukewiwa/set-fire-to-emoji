.PHONY: runserver
runserver:
	python ./src/manage.py runserver 0.0.0.0:${DJANGO_PORT}

.PHONY: deploy
deploy:
	cd infra && npm run cdk -- deploy --require-approval never

.PHONY: static-build
static-build:
	python src/manage.py collectstatic --noinput --clear
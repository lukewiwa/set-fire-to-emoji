ARG FUNCTION_DIR="/function"
FROM python:3.12-slim AS base
ARG FUNCTION_DIR

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.3 /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=ghcr.io/astral-sh/uv:0.3.0 /uv /usr/local/bin/uv
ENV UV_CACHE_DIR=/tmp/uv UV_LINK_MODE=copy

WORKDIR ${FUNCTION_DIR}

FROM base AS builder

COPY src/ ${FUNCTION_DIR}

RUN --mount=type=cache,target=/tmp/uv \
  uv sync --no-dev


# Collect all static files
WORKDIR ${FUNCTION_DIR}
ENV DJANGO_SECRET_KEY="dummy-secret-key-for-static-files-collection" ALLOWED_HOSTS=""

RUN uv run ./manage.py collectstatic --noinput --clear

FROM base AS prod
ARG FUNCTION_DIR

# Copy django static files
COPY --from=builder /bundle /bundle

COPY src/ ${FUNCTION_DIR}
COPY --from=builder ${FUNCTION_DIR}/.venv ${FUNCTION_DIR}/.venv


EXPOSE 8080

CMD ["uv", "run", "gunicorn", "config.wsgi:application"]

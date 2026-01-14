ARG FUNCTION_DIR="/function"
FROM public.ecr.aws/docker/library/python:3.13-slim-bookworm AS base
ARG FUNCTION_DIR

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /usr/local/bin/uv
ENV UV_CACHE_DIR=/tmp/uv UV_LINK_MODE=copy

WORKDIR ${FUNCTION_DIR}

FROM base AS builder
ENV UV_NO_SYNC=true

COPY src/ ${FUNCTION_DIR}

RUN --mount=type=cache,target=/tmp/uv \
  uv sync --no-dev


# Collect all static files
WORKDIR ${FUNCTION_DIR}
RUN ALLOWED_HOSTS=, DJANGO_SECRET_KEY=$RANDOM  AWS_STORAGE_BUCKET_NAME=$RANDOM \
  uv run ./manage.py collectstatic --noinput --clear

FROM base AS prod
ARG FUNCTION_DIR
ENV UV_NO_SYNC=true UV_FROZEN=true

# Copy django static files
COPY --from=builder /bundle /bundle

COPY src/ ${FUNCTION_DIR}
COPY --from=builder ${FUNCTION_DIR}/.venv ${FUNCTION_DIR}/.venv


EXPOSE 8080

CMD ["uv", "run", "gunicorn", "config.wsgi:application"]

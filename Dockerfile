ARG FUNCTION_DIR="/function"
FROM python:3.12-slim as base
ARG FUNCTION_DIR

ENV POETRY_VIRTUALENVS_CREATE="false"
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip poetry

# Install project deps
RUN --mount=type=cache,target=/root/.cache/pypoetry \
    --mount=type=bind,source=src,target=/tmp/pip-tmp/ \
    poetry --directory=/tmp/pip-tmp/ install

WORKDIR ${FUNCTION_DIR}

FROM base AS builder

COPY src/ ${FUNCTION_DIR}

# Collect all static files
WORKDIR ${FUNCTION_DIR}
ENV DJANGO_SECRET_KEY="dummy-secret-key-for-static-files-collection" ALLOWED_HOSTS=""

RUN python manage.py collectstatic --noinput --clear

FROM base AS prod
ARG FUNCTION_DIR

# Copy django static files
COPY --from=builder /bundle /bundle

COPY src/ ${FUNCTION_DIR}

ENTRYPOINT [ "poetry", "run","python", "-m", "awslambdaric" ]

CMD [ "config.asgi.handler" ]

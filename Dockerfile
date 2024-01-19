ARG FUNCTION_DIR="/function"
FROM python:3.12-slim as base
ARG FUNCTION_DIR

ENV POETRY_VIRTUALENVS_CREATE="false"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir poetry

# Install project deps
WORKDIR /tmp/pip-tmp/
COPY src/poetry.lock src/pyproject.toml ./
RUN cd /tmp/pip-tmp && \
    poetry install && \
    rm -rf /tmp/pip-tmp

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

FROM public.ecr.aws/lambda/python:3.12-preview as base

ENV POETRY_VIRTUALENVS_CREATE="false"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir poetry

# Install project deps
WORKDIR /tmp/pip-tmp/
COPY src/poetry.lock src/pyproject.toml ./
RUN cd /tmp/pip-tmp && \
    poetry install && \
    rm -rf /tmp/pip-tmp

WORKDIR ${LAMBDA_TASK_ROOT}

FROM base AS prod

COPY src/ ${LAMBDA_TASK_ROOT}

CMD [ "config.asgi.handler" ]

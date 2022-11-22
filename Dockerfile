FROM lukewiwa/aws-lambda-python-sqlite:3.9 as base

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

FROM base AS dev

ARG DEV_ENV=""
RUN if [ "${DEV_ENV}" = "vscode" ]; then \
    yum groupinstall -y "Development Tools" && \
    curl -fsSL https://rpm.nodesource.com/setup_16.x | bash - && \
    yum install --debuglevel=1 -y git vim amazon-linux-extras nodejs && \
    PYTHON=python2 amazon-linux-extras install docker -y; \
    fi

FROM base AS prod

COPY src/ ${LAMBDA_TASK_ROOT}

CMD [ "config.asgi.handler" ]

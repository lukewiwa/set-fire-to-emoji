FROM public.ecr.aws/lambda/python:3.9

RUN yum groupinstall -y "Development Tools" && \
    curl -fsSL https://rpm.nodesource.com/setup_16.x | bash - && \
    yum install -y nodejs

ENV POETRY_VIRTUALENVS_CREATE="false"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir poetry

# Install project deps
WORKDIR /tmp/pip-tmp/
COPY src/poetry.lock src/pyproject.toml ./
RUN cd /tmp/pip-tmp && \
    poetry install && \
    rm -rf /tmp/pip-tmp

ARG APP_DIR=/var/task
ENV APP_DIR=${APP_DIR}
WORKDIR ${APP_DIR}

ARG DEV_ENV=""
RUN if [ "${DEV_ENV}" = "vscode" ]; then \
    yum install --debuglevel=1 -y git zsh vim amazon-linux-extras && \
    PYTHON=python2 amazon-linux-extras install docker -y && \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended; \
    fi

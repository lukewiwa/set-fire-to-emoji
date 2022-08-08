#!/bin/bash

./src/manage.py migrate
npm --prefix=infra install

exec "$@"

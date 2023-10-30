#!/bin/bash

npm --prefix=infra install

exec "$@"

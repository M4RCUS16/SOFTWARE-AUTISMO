#!/usr/bin/env bash
set -o errexit
set -o pipefail
set -o nounset

cd backend
export PYTHONPATH=$(pwd)
gunicorn core.wsgi:application

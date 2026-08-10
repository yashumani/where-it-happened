#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Publishing main to https://github.com/yashumani/where-it-happened.git"
git status -sb
git push -u origin main

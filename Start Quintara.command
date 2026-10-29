#!/bin/zsh
# Double-click this file in Finder to start Quintara locally.
set -e
cd "$(dirname "$0")"
exec npm run dev

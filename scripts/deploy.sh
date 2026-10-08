#!/usr/bin/env bash
# Deploys RISK AI NAVIGATOR with the Databricks CLI direct engine (no Terraform).
#
# Usage: ./scripts/deploy.sh [databricks-cli-profile]
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-${DATABRICKS_CONFIG_PROFILE:-DEFAULT}}"
export DATABRICKS_BUNDLE_ENGINE=direct # also set in databricks.yml

if [ ! -f app-dist/server/dist/index.mjs ] || [ ! -f app-dist/client/dist/index.html ]; then
  echo "ERROR: app-dist/ is not built. Run "node scripts/build-offline.mjs" on a machine with npm access." >&2
  exit 1
fi

echo "==> Databricks CLI version (needs >= 0.279.0)"
databricks --version

echo "==> Validating bundle"
databricks bundle validate -p "$PROFILE"

echo "==> Deploying bundle"
databricks bundle deploy -p "$PROFILE"

echo "==> Starting app"
databricks bundle run risk_ai_navigator -p "$PROFILE"

databricks bundle summary -p "$PROFILE"

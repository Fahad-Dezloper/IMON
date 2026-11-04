#!/usr/bin/env bash
# Publish contract ABIs + addresses from the backend to the frontend, so the app
# never needs the Solidity toolchain. Run after any contract interface change or
# new deployment, then commit the updated frontend/lib/abi/*.json + deployments.
set -euo pipefail
cd "$(dirname "$0")/../backend"

forge build >/dev/null
DEST="../frontend/lib/abi"
mkdir -p "$DEST"

# One line per deployed/public contract. Add new contracts here as phases land.
for C in iMONVault; do
  forge inspect "$C" abi > "$DEST/$C.json"
  echo "[export-abi] wrote $DEST/$C.json"
done

# Publish the address book too.
cp deployments/143.json "../frontend/lib/deployments.143.json"
echo "[export-abi] copied deployments/143.json -> frontend/lib/deployments.143.json"

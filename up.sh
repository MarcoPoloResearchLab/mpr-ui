#!/bin/bash
set -e

echo "Select a profile to run:"
echo "  1) tauth           - TAuth demo with YAML config (HTTPS on port 4443)"
echo "  2) tauth-standalone - Standalone login button demo (HTTPS on port 4443)"
echo ""
read -p "Enter choice [1-2]: " choice

case "$choice" in
  1)
    profile="tauth"
    ;;
  2)
    profile="tauth-standalone"
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "Starting profile: $profile"
echo ""

docker compose --profile "$profile" up --build --remove-orphans --force-recreate

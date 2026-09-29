#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${1:-}" == "" || "${FORCE:-false}" != "true" ]]; then
  echo "Usage: FORCE=true $0 path/to/mo-farm-db.dump" >&2
  exit 2
fi
dump="$1"
[[ -f "$dump" ]] || { echo "Dump not found: $dump" >&2; exit 1; }
service="${DB_SERVICE:-db}"

echo "Restoring $dump"
cat "$dump" | docker compose exec -T "$service" sh -c 'tmp=$(mktemp); trap "rm -f $tmp" EXIT; cat > "$tmp"; pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --clean --if-exists --no-owner --exit-on-error "$tmp"'
echo "PostgreSQL restore complete."
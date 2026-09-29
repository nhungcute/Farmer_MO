#!/usr/bin/env bash
set -Eeuo pipefail

output_dir="${BACKUP_DIR:-backups}"
service="${DB_SERVICE:-db}"
mkdir -p "$output_dir"
stamp="$(date -u +%Y%m%d-%H%M%SZ)"
dump="$output_dir/mo-farm-db-$stamp.dump"

if ! docker compose ps --status running --services "$service" | grep -Fxq "$service"; then
  echo "Service '$service' is not running. Start it with: docker compose up -d db" >&2
  exit 1
fi

echo "Creating PostgreSQL dump: $dump"
docker compose exec -T "$service" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$dump"
sha256sum "$dump" > "$dump.sha256"

if [[ "${INCLUDE_API_STATE:-false}" == "true" ]]; then
  docker compose cp api:/data/farm-state.json "$output_dir/farm-state-$stamp.json"
fi

echo "Backup complete: $dump"
#!/usr/bin/env bash
# Консистентный бэкап базы GIGACHAD.
# ВАЖНО: используем `VACUUM INTO`, а не `cp` — он делает целостный снимок
# даже когда данные частично лежат в WAL-файле (обычный cp tandem.db это теряет).
set -e
DB="${1:-/opt/tandem/data/tandem.db}"
DIR="${2:-/root/tandem-backups}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DIR"
OUT="$DIR/db-$STAMP.db"
node -e '
  const {DatabaseSync} = require("node:sqlite");
  const d = new DatabaseSync(process.argv[1]);
  const out = process.argv[2].replace(/'"'"'/g, "");
  d.exec("VACUUM INTO " + "'"'"'" + out + "'"'"'");
  d.close();
' "$DB" "$OUT" 2>&1 | grep -v Warning || true
[ -d "$(dirname "$DB")/uploads" ] && tar -czf "$DIR/uploads-$STAMP.tgz" -C "$(dirname "$DB")" uploads 2>/dev/null || true
echo "бэкап: $OUT ($(stat -c%s "$OUT" 2>/dev/null) байт)"
# чистим бэкапы старше 30 дней
find "$DIR" -name 'db-*.db' -mtime +30 -delete 2>/dev/null || true

#!/usr/bin/env bash
# Деплой «Тандема» на Ubuntu/Debian VPS (запускать от root).
# Использует sslip.io вместо домена: 159-69-153-135.sslip.io -> 159.69.153.135
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

IP="159.69.153.135"
DOMAIN="159-69-153-135.sslip.io"
EMAIL="lksuhodolsky@gmail.com"
APP="/opt/tandem"

echo "=== [1/7] apt update ==="
apt-get update -qq

echo "=== [2/7] Node.js ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

echo "=== [3/7] Код приложения ==="
mkdir -p "$APP"
if [ -d /tmp/tandem-upload ]; then
  cp -a /tmp/tandem-upload/. "$APP"/
  rm -rf /tmp/tandem-upload
fi
cd "$APP"
npm ci --omit=dev --no-fund --no-audit 2>&1 | tail -1

echo "=== [4/7] Пользователь и .env ==="
id -u tandem >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin -d "$APP" tandem
mkdir -p "$APP/data"
if [ ! -f "$APP/.env" ]; then
  INVITE="TNDM-$(openssl rand -hex 3 2>/dev/null || echo "$RANDOM")"
  INVITE="${INVITE^^}"
  cat > "$APP/.env" <<ENV
PORT=3000
HOST=127.0.0.1
TZ=Europe/Moscow
MAX_USERS=4
INVITE_CODE=$INVITE
ENV
  chmod 600 "$APP/.env"
  echo "создан .env (код приглашения: $INVITE)"
else
  echo ".env уже есть — не трогаю"
fi
chown -R tandem:tandem "$APP"

echo "=== [5/7] systemd ==="
cat > /etc/systemd/system/tandem.service <<'UNIT'
[Unit]
Description=BECOME GIGACHAD — LIVE EDITION (tandem)
After=network.target

[Service]
User=tandem
Group=tandem
WorkingDirectory=/opt/tandem
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server.js
Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=15
Environment=NODE_ENV=production
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable tandem >/dev/null 2>&1
systemctl restart tandem
sleep 2
echo "tandem: $(systemctl is-active tandem)"
curl -fsS http://127.0.0.1:3000/api/config && echo

echo "=== [6/7] Caddy (HTTPS) ==="
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi
cat > /etc/caddy/Caddyfile <<CADDY
{
	email $EMAIL
}

$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}

http://$IP {
	redir https://$DOMAIN{uri} permanent
}
CADDY
systemctl enable caddy >/dev/null 2>&1 || true
systemctl restart caddy
sleep 1
echo "caddy: $(systemctl is-active caddy)"

echo "=== [7/7] Firewall ==="
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null   # QUIC / HTTP3 — без него браузеры ловят "Failed to fetch"
  echo "ufw: 80/443 (tcp+udp) открыты"
fi

echo "=== Жду выпуск HTTPS-сертификата ==="
ok=0
for i in $(seq 1 18); do
  sleep 5
  if curl -fsS -m 10 "https://$DOMAIN/api/config" >/dev/null 2>&1; then ok=1; break; fi
  echo "  ...жду ($i/18)"
done
if [ "$ok" = 1 ]; then
  echo "HTTPS РАБОТАЕТ"
  curl -fsS "https://$DOMAIN/api/config"; echo
else
  echo "HTTPS пока не отвечает, лог Caddy:"
  journalctl -u caddy --no-pager -n 25
fi

# ежедневный консистентный бэкап (VACUUM INTO + фото), храним 30 дней
chmod +x /opt/tandem/backup.sh 2>/dev/null || true
cat > /etc/cron.daily/tandem-backup <<'CRON'
#!/bin/sh
/opt/tandem/backup.sh >/dev/null 2>&1
CRON
chmod +x /etc/cron.daily/tandem-backup

echo "=== ИТОГ ==="
echo "URL:  https://$DOMAIN"
echo "Код приглашения: $(grep -oP 'INVITE_CODE=\K.*' "$APP/.env" || echo '—')"

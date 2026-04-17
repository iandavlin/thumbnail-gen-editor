# Thumbnails App

Fabric.js-based thumbnail editor + Node generator scripts.

## Install (EC2, Amazon Linux 2023 / Ubuntu)

```bash
# Node 20+
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -   # Amazon Linux
# or: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -   # Ubuntu
sudo yum install -y nodejs    # or: sudo apt-get install -y nodejs

# sharp needs build tools on some AMIs
sudo yum groupinstall -y "Development Tools"   # Amazon Linux
# or: sudo apt-get install -y build-essential

unzip thumbnails-app.zip
cd thumbnails-app
npm install --omit=dev
```

## Run

```bash
# Defaults: HOST=0.0.0.0 PORT=3333
node serve.js

# Custom:
HOST=127.0.0.1 PORT=8080 node serve.js
```

Open `http://<ec2-public-ip>:3333/` (or whatever port). Make sure the EC2 security group allows inbound on that port — or front it with nginx/Caddy and only expose 80/443.

**No auth is built in.** Anyone who can reach the port gets the editor. Put it behind nginx basic auth, a VPN, or a security-group IP allowlist.

## Run as a systemd service

Copy `thumbnails.service` to `/etc/systemd/system/`, edit the `WorkingDirectory` and `User` lines, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now thumbnails
sudo systemctl status thumbnails
journalctl -u thumbnails -f
```

## Generator scripts

The editor is a visualizer — JSON files in `output/` are the source of truth. Build/edit layouts via the `generate_*.js` scripts:

```bash
node generate.js          # base / generic
node generate_slj.js      # Seth Lee Jones episode
node generate_ted.js      # Ted Bergstrand episode
node generate_1x1.js      # 1x1 variants
node process_episode.js   # episode pipeline
```

Each writes JSON to `output/16x9/` and/or `output/1x1/`. The editor's "Load JSON" button opens them.

Episode-specific assets go in `assets/episode/` (referenced from JSON as `/assets/episode/foo.png`). They aren't bundled — copy them up alongside the app, or change the generator scripts to point at wherever you store them.

## Layout

```
editor.html              # the editor (Fabric.js, single-page)
serve.js                 # static file server (HOST/PORT env)
generate*.js             # JSON layout generators
process_episode.js       # episode pipeline
templates/               # reusable layout JSON + components
output/                  # generated thumbnail JSON (empty in this package)
assets/                  # static images (empty in this package)
SKILL.md                 # workflow notes
```

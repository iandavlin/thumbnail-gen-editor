# Team changelog — thumbnail-gen-editor

Append-only ledger of meaningful changes. Read the last ~30 entries at the
start of a session to catch up. Each entry references the commit SHA(s)
where the work landed.

Format:
  ## YYYY-MM-DD — username
  One-line summary.
  Commits: <sha>, <sha>
  Impact: who/what this affects, gotchas, watch-fors.

---

## 2026-05-15 — ian
Added per-user namespacing for patterns + outputs + personal assets.
The thumb-app now treats `_user_<name>/` folders as private namespaces and
the rest as the team-shared library.
Commits: (this commit)
Impact:
- New endpoints: `whoami`, `patterns-promote`, `patterns-fork`, `assets-mine`.
- Auth now expects nginx to pass `REMOTE_USER` as a fastcgi_param.
- Pattern picker shows a 👤 mine / 👥 shared badge per item; each card has
  a promote (⭐) or fork (📋) button depending on its source.
- Saves default to the user's own namespace; pass `shared:true` in the
  body to write to the team library.
- Existing files under `patterns/`, `output/`, `assets/_permanent/` keep
  working as the "shared" pool — no data migration required.
Watch:
- Each dev's basic-auth username must match a Linux username we recognize
  (lowercase alphanumeric). Other usernames fall back to "guest".
- nginx config on the host must include `fastcgi_param REMOTE_USER
  $remote_user;` in the thumb's `.php` location block.

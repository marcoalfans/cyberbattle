# cyberbattle

Auto-updating viewer for **Standoff 365 cyberbattle** business risks.

A GitHub Action pulls the risk list from the API every 2 hours using your
session (stored as a **GitHub Secret**) and **overwrites** a Gist file with the
latest snapshot. A static page (GitHub Pages) renders that Gist with full
search + filters.

```
Standoff API  ──(every 2h, GitHub Action)──>  Gist (battle-55.json)  ──(fetch)──>  /cyberbattle viewer
```

## 1. Create the Gist
Make one **secret or public** gist with a file named `battle-55.json` containing `[]`.
Note its **id** (the hash in the URL) and its **raw URL**
(`https://gist.githubusercontent.com/<user>/<id>/raw/battle-55.json`).

## 2. Add repository secrets
`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Value |
|---|---|
| `STANDOFF_ACCESS_TOKEN` | the `accessToken` cookie value from the browser request |
| `STANDOFF_DEVICE_UUID` | the `deviceuuid` header / cookie value |
| `GIST_TOKEN` | a GitHub PAT with **`gist`** scope |
| `GIST_ID` | the gist id from step 1 |

> Alternatively set a single `STANDOFF_COOKIE` secret with the full raw `Cookie:`
> header; it overrides the two values above.
>
> Optional repo **variable** `BATTLE_ID` (default `55`).

⚠️ **The `accessToken` is a session token — it expires.** When the Action starts
returning `401/403`, refresh the `STANDOFF_ACCESS_TOKEN` secret with a fresh value.
Never commit it to the repo.

## 3. Run it
`Actions → Update cyberbattle data → Run workflow` (or wait for the 2-hour cron).
It validates the response and PATCHes the gist file (overwrite, not append).

## 4. Enable the viewer
`Settings → Pages → Deploy from branch → main / root`.
The site lands at `https://<user>.github.io/cyberbattle/`.

Open it, click **⚙ Source**, and paste your gist **raw URL** (saved in your
browser). Or load `…/cyberbattle/?src=<raw-url>`. With no source set it shows the
bundled `data.json` sample.

## Files
- `.github/workflows/update-data.yml` — 2-hourly fetch → gist update
- `scripts/fetch.sh` — the API call + validation
- `index.html`, `styles.css`, `app.js` — the searchable viewer
- `data.json` — bundled sample (fallback / demo)

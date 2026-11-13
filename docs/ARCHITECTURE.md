# Architecture

PromptPro Challenge Arena is an Express API plus a static frontend. It stores
collections either in Supabase (when credentials are configured) or in local
JSON files, so the same code runs on a laptop, on Vercel, and in a container.

## Layout

| Path | Responsibility |
|---|---|
| `prompt-code/server.js` | Local entry: starts Express and serves the static frontend |
| `prompt-code/app.js` | Express app, collection routes, settings, seed logic |
| `prompt-code/api/index.js` | Serverless adapter for Vercel/Netlify |
| `prompt-code/db/supabase.js` | Supabase client, retry wrapper, health probe |
| `prompt-code/data/*.json` | Seed data for students, prompts and packs |
| `prompt-code/promptdb/*.json` | Curated prompt and pack seeds |
| `prompt-code/public/*.html` | Static UI: landing and about pages |
| `prompt-code/supabase/schema.sql` | Schema for the Supabase deployment |

## Storage

```
route → readDB(collection)
      → Supabase client, if SUPABASE_URL + key are set
      → otherwise db/<collection>.json (in-process mutex per collection)
```

`writeDB` mirrors the same decision. The mutex serialises read-modify-write
cycles so two concurrent requests cannot lose an update on the file backend.
`withRetry` wraps Supabase calls with three attempts and exponential backoff.

## Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api` | Service banner and endpoint map |
| GET | `/api/health` | Backend type plus per-collection counts |
| GET | `/api/seed` | One-shot seed from the JSON fixtures |
| GET | `/api/:collection` | List a collection |
| POST | `/api/:collection` | Replace a collection (array body) |
| GET | `/api/:collection/:id` | Read one item |
| POST | `/api/:collection/add` | Append an item |
| PUT | `/api/:collection/:id` | Update an item |
| DELETE | `/api/:collection/:id` | Remove an item |
| GET/POST | `/api/settings/key/:name` | Read/write a named setting |
| GET/POST | `/api/settings/pin-hash` | Read/write the admin PIN hash |

Collections are allow-listed; an unknown name returns `400` rather than
creating an arbitrary file.

## Trust boundaries

- Supabase service keys are read from the environment and never returned to
  clients; `/api` reports only which backend is active.
- The local file backend writes under `prompt-code/db/` and is skipped on
  serverless platforms, where the filesystem is read-only.
- `express.json` caps bodies at 50 MB and collection names are validated before
  touching storage.
- Legacy encrypted seeds are decrypted once at seed time; failures fall back to
  plain JSON parsing instead of aborting startup.

## Verification

```bash
cd prompt-code
npm ci
npm test
```

The suite exercises the retry helper, the file-backed round-trip, and the live
Express app over HTTP (`/api`, `/api/health`, a valid collection and an invalid
one). CI runs the same commands on Node 22 for every push and pull request.

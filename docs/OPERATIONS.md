# Deployment And Operations

Updated: 2026-08-02

## Requirements

- Node.js 24;
- FFmpeg and FFprobe;
- built frontend in `apps/web/dist`;
- Bailian credentials CSV;
- CosyVoice profile JSON;
- optional private local preview MP3.

## Local Production Run

```bash
cd apps/web
npm ci
npm run build
HOST=127.0.0.1 PORT=4174 npm start
```

## Secret Variables

```text
BAILIAN_CREDENTIALS_FILE
COSYVOICE_PROFILE_FILE
VOICE_SAMPLE_FILE
RATE_LIMIT_SALT
METRICS_TOKEN
```

Set `TRUST_PROXY=1` only behind a trusted reverse proxy that overwrites
`X-Forwarded-For`.

## Health

```text
GET /healthz
GET /readyz
GET /metrics
Authorization: Bearer $METRICS_TOKEN
```

`/readyz` verifies credentials, voice profile, preview sample, FFmpeg, and
FFprobe. The preview sample is never returned to non-local hosts.

## Container

```bash
docker build -t voice-rights-vault apps/web
docker compose -f apps/web/compose.production.yaml up --build
```

The Compose service:

- runs as non-root;
- uses a read-only root filesystem;
- drops all capabilities;
- mounts secrets read-only;
- enables `no-new-privileges`;
- permits writes only under a bounded `/tmp`.

## TLS Reverse Proxy

The public proxy must:

- terminate TLS;
- overwrite `X-Forwarded-For`;
- set request body limits no higher than the application 12 MB limit;
- preserve `X-Request-Id` or allow the app to generate it;
- restrict `/metrics` to the monitoring network when possible.

## Rate Limits

Default per-client burst limits:

| Endpoint | Burst |
|---|---:|
| synthesis | 5 |
| transcription | 10 |
| policy | 20 |
| provenance | 30 |
| Aleo lookup | 60 |

Limits use an in-memory token bucket and reset when the process restarts.
Multi-instance deployment requires an external shared limiter.

## Logs

Request logs are JSON and contain:

- request ID;
- method;
- normalized route;
- response status;
- duration;
- salted client hash.

They exclude prompts, audio, API keys, raw IPs, private Records, and wallet
inputs.

## Incident Response

Credential leak:

1. revoke the Bailian API key;
2. replace the server secret file;
3. restart instances;
4. inspect logs for affected request IDs;
5. rotate `RATE_LIMIT_SALT` and `METRICS_TOKEN`.

Cloned voice compromise:

1. disable the voice profile file;
2. create a new authorized profile;
3. deploy the new profile;
4. preserve old audit packages but mark the profile retired operationally.

## Backup And Retention

- back up source and Aleo evidence;
- do not back up `/tmp`;
- browser IndexedDB is user-local and not a server backup;
- public Aleo state is independently replicated by the network;
- define hosting log retention before public launch.

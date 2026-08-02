# Free HTTPS Hosting

Updated: 2026-08-02

## Recommendation

Use **Zeabur Free** for the first public demo:

- dashboard-only Git deployment;
- Dockerfile support;
- generated HTTPS domain;
- no credit card required for the Free Plan;
- services sleep when idle and have no SLA.

Use **Render Free Web Service** as the fallback:

- dashboard Git deployment and Docker support;
- generated `onrender.com` HTTPS domain;
- 750 free instance hours per month;
- sleeps after 15 minutes without inbound traffic.

Cloud Run is technically stronger but requires a Google Cloud billing account
and can charge beyond the free allowance. Koyeb's free instance is smaller and
less suitable for FFmpeg and Node model-proxy work. Hugging Face Docker Spaces
is not currently available to ordinary free accounts.

## Prerequisite

GitHub repository: https://github.com/Chengyuann/voice-rights-vault

Do not commit `.secrets/`.

Required application variables:

```text
BAILIAN_API_KEY
BAILIAN_WORKSPACE_ID
COSYVOICE_VOICE_ID
COSYVOICE_TARGET_MODEL=cosyvoice-v3.5-flash
RATE_LIMIT_SALT
METRICS_TOKEN
TRUST_PROXY=1
PREVIEW_SAMPLE_REQUIRED=0
```

The public deployment intentionally has no preset enrollment audio. Users must
record or upload their own sample.

## Zeabur Dashboard

1. Open the Zeabur dashboard and sign in.
2. Create a project on the Free Plan.
3. Create a service from the GitHub repository.
4. Select Dockerfile deployment.
5. If the repository is a monorepo, select `apps/web` as the service root.
6. Set the service port to `4174`.
7. Add every required variable above as a secret/environment variable.
8. Deploy and wait for `/readyz` to return HTTP 200.
9. Enable Public Networking and use the generated HTTPS domain.
10. Test `/healthz`, the Creator flow, Policy rejection, CosyVoice generation,
    and Verifier upload.

Free-plan cold starts are expected after inactivity.

## Render Dashboard

The repository includes `render.yaml`.

1. Open Render and create a Blueprint from the Git repository.
2. Confirm the `voice-rights-vault` free Web Service.
3. Enter the four secret values marked `sync: false`.
4. Deploy.
5. Verify `/readyz`.
6. Use the generated HTTPS `onrender.com` address.

Render sets `PORT=10000` in the supplied Blueprint.

## Verification

```bash
curl https://YOUR-DOMAIN/healthz
curl https://YOUR-DOMAIN/readyz
```

Expected readiness:

```json
{
  "ready": true,
  "checks": {
    "credentials": true,
    "voiceProfile": true,
    "previewSample": true,
    "ffmpeg": true,
    "ffprobe": true
  }
}
```

The `previewSample` check is true when the optional preview is disabled.

## Free-Tier Caveats

- cold start latency;
- no SLA;
- model API quotas are separate from hosting quotas;
- in-memory rate limits reset on restart;
- browser IndexedDB audit history is tied to the user's device;
- generated free domains can be replaced by a custom domain later.

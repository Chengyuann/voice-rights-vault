# Voice Rights Vault Completion Plan

## Project Context

Repository: https://github.com/Chengyuann/voice-rights-vault

Local directory:

```text
/Users/bytedance/Documents/Aleo/apps/web
```

Goal: complete public deployment, production verification, submission docs, and the correct Voice Rights Aleo demo video.

---

## 1. Verify Current State

- Pull and inspect the latest GitHub commits.
- Check whether the local working tree has uncommitted changes.
- Confirm the remote repository includes:
  - Environment-variable based config
  - No required `.secrets` upload
  - Fixed `package-lock.json` using npm official registry
  - `render.yaml`
  - `docs/FREE_HOSTING.md`
  - Docker deployment support
- Run local verification:
  - `npm ci`
  - Build
  - Lint
  - Tests
- Scan current files and Git history for leaked secrets:
  - Bailian API key
  - Bailian workspace ID
  - CosyVoice voice ID
  - Aleo private key
  - `.secrets` files

---

## 2. Verify Production Configuration

Confirm the app supports these environment variables:

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

Check:

- Missing required variables produce clear errors.
- The server listens on `0.0.0.0`.
- The app supports platform-provided `PORT`, or falls back to `4174`.
- Public frontend API calls do not point to `localhost`.
- Docker build and startup commands are correct.

---

## 3. Deploy To Zeabur

User must complete GitHub authorization in the browser.

Steps:

- Open Zeabur.
- Log in with GitHub.
- Authorize repository:

```text
Chengyuann/voice-rights-vault
```

- Create a new project.
- Select Dockerfile deployment.
- Set root directory:

```text
apps/web
```

- Set port:

```text
4174
```

- Add environment variables:

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

- Wait for build and health check to pass.
- Create or copy the public HTTPS URL.
- If Zeabur fails, deploy to Render using `render.yaml`.

---

## 4. Public Deployment Smoke Test

Using the final HTTPS URL, verify:

- Homepage loads correctly.
- Static assets have no 404s.
- Browser console has no critical errors.
- `/readyz` returns success.
- HTTPS works.
- API routes work from the public frontend.
- CORS, proxy, and client IP behavior is correct.
- Desktop layout is usable.
- Mobile layout has no overflow or overlapping text.
- Refreshing routes does not break the app.

---

## 5. Full Feature Verification

Test the real user flow:

- Voice Rights project identity is visible and correct.
- Policy creation works.
- Policy read and status display works.
- Audio upload or sample selection works.
- Bailian API request works.
- CosyVoice request works.
- `cosyvoice-v3.5-flash` model is used.
- `COSYVOICE_VOICE_ID` is applied.
- `BAILIAN_WORKSPACE_ID` is applied.
- Verifier flow works.
- Aleo-related privacy, proof, or on-chain flow works.
- Final result page displays correctly.
- Error states work:
  - Missing input
  - API failure
  - Timeout
  - Rate limit
  - Unauthorized metrics access
- No API keys, private keys, workspace IDs, or voice IDs leak in frontend responses or logs.

---

## 6. Production Security Check

Verify:

- `RATE_LIMIT_SALT` is active.
- Metrics endpoint is protected by `METRICS_TOKEN`.
- `TRUST_PROXY=1` handles client IPs correctly.
- Logs do not expose:
  - API keys
  - Aleo private keys
  - Full sensitive audio metadata
  - Secret environment variable values
- Upload size validation works.
- File type validation works.
- User input validation works.
- Security headers are reasonable.
- Dependency vulnerability check is acceptable.
- `.env`, `.secrets`, generated audio, and temp files are not committed.

---

## 7. Fix, Commit, And Redeploy

If any issue is found:

- Fix the issue locally.
- Add or update focused tests if needed.
- Re-run:
  - Build
  - Lint
  - Tests
- Commit the fix.
- Push to GitHub.
- Wait for Zeabur or Render to redeploy.
- Repeat the public smoke test and full feature verification.

---

## 8. Submission Documentation

Update final docs with:

- Project name and description.
- Voice Rights use case.
- Aleo privacy and proof value proposition.
- Architecture overview.
- Tech stack.
- Local setup instructions.
- Production deployment instructions.
- Environment variable list without real values.
- Public demo URL.
- `/readyz` verification result.
- Policy verification result.
- CosyVoice verification result.
- Verifier verification result.
- Aleo flow verification result.
- Security notes.
- Known limitations.
- Screenshots.
- Final demo video path or URL.

---

## 9. Correct Demo Video

Record only the Voice Rights Vault project.

Do not use:

- ZeroClaw footage
- Old temporary MP4s
- Unrelated Aleo projects

Demo flow should show:

- Voice Rights Vault identity
- Policy flow
- Voice or CosyVoice flow
- Verifier flow
- Aleo privacy, proof, or on-chain flow
- Final result

Video requirements:

- 45-90 seconds
- 1080p
- MP4
- H.264 video
- AAC audio
- No black frames
- No corrupted frames
- No unrelated project screens
- No leaked secrets
- Clean pacing
- Audio and video sync checked

Final output path:

```text
output/Voice-Rights-Aleo-refined.mp4
```

---

## 10. Final Acceptance Checklist

Final delivery must include:

- Latest GitHub commit pushed.
- Public Zeabur or Render HTTPS URL.
- `/readyz` verification result.
- Policy verification result.
- CosyVoice verification result.
- Verifier verification result.
- Aleo flow verification result.
- Security scan result.
- Updated submission docs.
- Correct Voice Rights demo video.

---

## Current Unfinished Items

Completed on 2026-08-03:

- GitHub repository and latest remote state verification.
- Local build, lint, Leo tests, Web tests, policy/privacy evaluation.
- Production HTTP and security smoke verification.
- Docker build and container verification on the Render port.
- Real Bailian ASR, Qwen policy, CosyVoice, provenance, and Aleo lookup checks.
- Secret scan across tracked files and Git history.
- Final submission documentation.
- Correct Voice Rights demo video:

```text
output/Voice-Rights-Aleo-refined.mp4
```

The following still require the confirmed public deployment:

- Public Zeabur deployment.
- Public HTTPS URL verification.
- Public `/readyz` check.
- Public Policy flow verification.
- Public CosyVoice flow verification.
- Public Verifier flow verification.
- Public Aleo flow verification.
- Recorded Shield Wallet compatibility run.

# Security notes

## Secrets

- `GROQ_API_KEY` is server-only. It is read in `src/lib/ai/groq.ts`, which imports `server-only`.
- `RSVP_SIGNING_SECRET` is server-only. It signs guest links and host keys in `src/lib/rsvp/token.ts`. Rotating it invalidates every existing RSVP link.
- Firestore access uses Application Default Credentials on Cloud Run. Do not commit a service-account JSON key; grant the runtime service account `roles/datastore.user` instead.
- Real keys belong in `.env.local`, Secret Manager, or a host's encrypted environment. `.env*` is ignored except `.env.example`.
- If a key is exposed, revoke it in the provider console and issue a new one. The repository intentionally contains no key.

## Input handling

- Every API body is capped at 250 KB and validated with Zod; unknown keys are rejected. RSVP payloads are capped at 500 KB, 12 functions, 2,000 guests, and 500-character notes.
- Assistant history is capped at 20 messages and 2,000 characters per message.
- Guest names, phone numbers, emails, travel, and notes never enter AI prompts. Only aggregate guest counts and dietary counts are sent.
- RSVP links are HMAC-signed, expiring per-guest tokens. Public replies are checked against that guest's invitations and written with the Admin SDK only; `firestore.rules` denies all direct client access.
- Plan data and budget goals are delimited as untrusted content in prompts.
- Model output is validated against a schema before it reaches the UI.
- User-supplied Markdown is rendered as React text, never as raw HTML.

## Abuse controls

- 12 AI requests per minute per IP and 300 per day per server instance.
- 40 RSVP requests per minute per IP and 1,000 per day per instance, including publish, reply, link, and revoke calls.
- Provider calls have 45–60 second timeouts and are aborted when the client disconnects.
- AI responses are cached by input hash to reduce duplicate spend.
- There is no host account. Anyone who obtains a host key can manage that published plan; treat the key and guest links as secrets.

The in-memory limiter is appropriate for a single instance. A multi-instance deployment should replace it with a shared store such as Redis and enforce the limit at the edge as well. Backups contain guest PII and should be stored privately.

## Reporting

This is a competition project, not a production service. If you find a vulnerability, open a private security advisory or contact the repository owner rather than filing a public issue with exploit details.

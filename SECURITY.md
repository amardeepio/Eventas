# Security notes

## Secrets

- `GROQ_API_KEY` is server-only. It is read in `src/lib/ai/groq.ts`, which imports `server-only`.
- Real keys belong in `.env.local` or a host's encrypted environment. `.env*` is ignored except `.env.example`.
- If a key is exposed, revoke it in the Groq console and issue a new one. The repository intentionally contains no key.

## Input handling

- Every API body is capped at 250 KB and validated with Zod; unknown keys are rejected.
- Assistant history is capped at 20 messages and 2,000 characters per message.
- Plan data and budget goals are delimited as untrusted content in prompts.
- Model output is validated against a schema before it reaches the UI.
- User-supplied Markdown is rendered as React text, never as raw HTML.

## Abuse controls

- 12 AI requests per minute per IP and 300 per day per server instance.
- Provider calls have 45–60 second timeouts and are aborted when the client disconnects.
- AI responses are cached by input hash to reduce duplicate spend.

The in-memory limiter is appropriate for a single instance. A multi-instance deployment should replace it with a shared store such as Redis and enforce the limit at the edge as well.

## Reporting

This is a competition project, not a production service. If you find a vulnerability, open a private security advisory or contact the repository owner rather than filing a public issue with exploit details.

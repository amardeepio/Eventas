export function GET() {
  return Response.json({ ok: true, aiConfigured: Boolean(process.env.GROQ_API_KEY) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

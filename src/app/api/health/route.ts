import { connection } from "next/server";

export async function GET() {
  // Read the key per request instead of freezing the answer at build time.
  await connection();
  return Response.json({ ok: true, aiConfigured: Boolean(process.env.GROQ_API_KEY) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

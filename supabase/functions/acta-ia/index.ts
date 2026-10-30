// Edge Function de Supabase: rep el prompt de l'acta i el passa a Gemini (pla gratuït de Google).
// La clau de Gemini és un secret de Supabase (GEMINI_API_KEY) i només la poden fer servir els admins.
// Es pot enganxar tal qual a Supabase → Edge Functions → Deploy a new function → Via Editor.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // Només admins: ho pregunta a la BD amb la sessió de qui fa la crida
    const auth = req.headers.get('Authorization') ?? ''
    const admin = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json())
    if (admin !== true) return json({ error: 'Només admins' }, 403)

    const { prompt } = await req.json()
    if (typeof prompt !== 'string' || prompt.length > 20000) return json({ error: 'Prompt no vàlid' }, 400)

    const key = Deno.env.get('GEMINI_API_KEY')
    if (!key) return json({ error: 'Falta el secret GEMINI_API_KEY' }, 500)
    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest'
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1 } }),
    })
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim()
    if (!res.ok || !text) return json({ error: data?.error?.message ?? 'Gemini no ha retornat cap text' }, 502)
    return json({ text })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

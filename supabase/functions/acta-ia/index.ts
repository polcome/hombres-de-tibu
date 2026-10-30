// Edge Function de Supabase: rep el prompt de l'acta i el passa a Gemini (pla gratuït de Google).
// La clau de Gemini és un secret de Supabase (GEMINI_API_KEY) i només la poden fer servir els admins.
// Es pot enganxar tal qual a Supabase → Edge Functions → Deploy a new function → Via Editor.

// No cal "Verify JWT": la funció ja comprova ella mateixa que qui crida és admin.

const HEADERS = 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage'

Deno.serve(async (req) => {
  // CORS: accepta les capçaleres que demani el navegador (el SDK de Supabase n'hi va afegint de noves)
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') ?? HEADERS,
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // Només admins: ho pregunta a la BD amb la sessió de qui fa la crida
    const auth = req.headers.get('Authorization') ?? ''
    const admin = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '', Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json())
    if (admin !== true) return json({ error: 'Només admins' }, 403)

    const { prompt } = await req.json()
    if (typeof prompt !== 'string' || prompt.length > 20000) return json({ error: 'Prompt no vàlid' }, 400)

    const key = Deno.env.get('GEMINI_API_KEY')
    if (!key) return json({ error: 'Falta el secret GEMINI_API_KEY' }, 500)
    // Si un model està saturat (503) o sense quota (429), es prova amb el següent i, al final, es torna a provar
    const models = [Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest']
    let text = ''
    let lastError = 'Gemini no ha retornat cap text'
    for (const model of [...models, ...models]) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 1.1 } }),
      })
      const data = await res.json().catch(() => null)
      text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? ''
      if (res.ok && text) break
      lastError = data?.error?.message ?? lastError
      // Errors que no s'arreglen canviant de model (clau dolenta, prompt bloquejat…): no cal insistir
      if (![404, 429, 500, 503].includes(res.status)) break
      await new Promise((r) => setTimeout(r, 1500))
    }
    if (!text) return json({ error: lastError }, 502)
    return json({ text })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

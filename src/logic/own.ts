// Expedients i comentaris propis: en publicar, el mòbil guarda un codi secret i a la BD només en va el hash.
// Així es poden esborrar des d'aquest mòbil sense que la BD sàpiga qui els ha escrit.
const KEY = 'tibu-own-posts'

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** Codi secret d'un expedient o comentari publicat des d'aquest mòbil (si n'hi ha) */
export const ownToken = (id: string): string | undefined => load()[id]

export function forgetOwn(id: string) {
  const all = load()
  delete all[id]
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // sense localStorage no es podrà esborrar després, però es publica igual
  }
}

/** Crea id + codi per a una publicació nova i el recorda en aquest mòbil */
export async function newOwn() {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), [id]: token }))
  } catch {
    // ídem
  }
  return { id, hash }
}

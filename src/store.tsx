import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { DB, Member } from './types'

interface Store {
  db: DB
  me: Member | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const EMPTY: DB = { members: [], months: [], trainings: [], awards: [], expedients: [], comments: [], ballots: [], voters: [], cardPhotos: [], trainingVotes: [], achievements: [] }
const Ctx = createContext<Store>({ db: EMPTY, me: null, loading: true, error: null, reload: async () => {} })

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(EMPTY)
  const [meId, setMeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const [data, id] = await Promise.all([api.loadAll(), api.me()])
      setDb(data)
      setMeId(id)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const me = db.members.find((m) => m.id === meId) ?? null
  return <Ctx.Provider value={{ db, me, loading, error, reload }}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

/** Executa una acció de l'API, recarrega i retorna l'error si n'hi ha */
export function useAction() {
  const { reload } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true)
      setErr(null)
      try {
        await fn()
        await reload()
        return true
      } catch (e) {
        setErr((e as Error).message)
        return false
      } finally {
        setBusy(false)
      }
    },
    [reload],
  )
  return { run, busy, err, setErr }
}

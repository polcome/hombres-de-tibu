import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import { ErrorMsg, Section } from '../components/ui'

export default function Login() {
  const { db } = useStore()
  const { run, busy, err, setErr } = useAction()
  const nav = useNavigate()
  const [mode, setMode] = useState<'login' | 'activate'>('login')
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'activate' && pw !== pw2) return setErr('Les contrasenyes no coincideixen')
    if (mode === 'activate' && pw.length < 6) return setErr('La contrasenya ha de tenir mínim 6 caràcters')
    const ok = await run(() => (mode === 'login' ? api.login(slug, pw) : api.activate(slug, code, pw)))
    if (ok) nav('/')
  }

  return (
    <Section title={mode === 'login' ? '🔑 Entrar' : '✨ Activar compte'}>
      <div className="tabs">
        <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
          Entrar
        </button>
        <button className={mode === 'activate' ? 'on' : ''} onClick={() => setMode('activate')}>
          Primer cop
        </button>
      </div>
      <form className="form" onSubmit={submit}>
        <select value={slug} onChange={(e) => setSlug(e.target.value)} required>
          <option value="">Qui ets?</option>
          {db.members
            .filter((m) => m.active)
            .map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
        </select>
        {mode === 'activate' && (
          <input placeholder="Codi d'activació (te'l dona l'admin)" value={code} onChange={(e) => setCode(e.target.value)} required />
        )}
        <input type="password" placeholder="Contrasenya" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {mode === 'activate' && <input type="password" placeholder="Repeteix la contrasenya" value={pw2} onChange={(e) => setPw2(e.target.value)} required />}
        <ErrorMsg err={err} />
        <button className="btn btn-primary btn-big" disabled={busy}>
          {mode === 'login' ? 'Entrar' : 'Activar i entrar'}
        </button>
      </form>
      <p className="muted small">
        {api.mode === 'demo'
          ? 'Mode demo: tria qualsevol usuari, contrasenya "tibu". Come és l\'admin.'
          : 'El primer cop, l\'admin et passa un codi per activar el compte i triar la teva contrasenya. Per escriure expedients no cal entrar.'}
      </p>
    </Section>
  )
}

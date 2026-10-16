import { HashRouter, NavLink, Route, Routes, Link } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { api } from './api'
import { resetDemo } from './api/demo'
import { Avatar } from './components/Avatar'
import Home from './pages/Home'
import Dossier from './pages/Dossier'
import Vote from './pages/Vote'
import Trainings from './pages/Trainings'
import Cards from './pages/Cards'
import Palmares from './pages/Palmares'
import MonthPage from './pages/MonthPage'
import Player from './pages/Player'
import Admin from './pages/Admin'
import Login from './pages/Login'

function Shell() {
  const { me, loading, error } = useStore()
  return (
    <>
      {api.mode === 'demo' && (
        <div className="demo-banner">
          🧪 Mode demo: les dades són d'exemple i només es guarden al teu navegador.{' '}
          <button
            className="link"
            onClick={() => {
              resetDemo()
              location.reload()
            }}
          >
            Reiniciar
          </button>
        </div>
      )}
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-logo">🦈</span>
          <span>
            <b>Hombres de Tibu</b>
            <small>MVP · ANTI · ENTRENOS</small>
          </span>
        </Link>
        <div className="topbar-right">
          {me?.is_admin && (
            <NavLink to="/admin" className="chip">
              ⚙️ Admin
            </NavLink>
          )}
          {me ? (
            <Link to={`/jugador/${me.slug}`}>
              <Avatar member={me} size={34} />
            </Link>
          ) : (
            <NavLink to="/login" className="chip">
              Entrar
            </NavLink>
          )}
        </div>
      </header>

      <main className="container">
        {loading ? (
          <div className="loading">Carregant… 🏋️</div>
        ) : error ? (
          <div className="error">No s'han pogut carregar les dades: {error}</div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dossier" element={<Dossier />} />
            <Route path="/votar" element={<Vote />} />
            <Route path="/entrenos" element={<Trainings />} />
            <Route path="/cartes" element={<Cards />} />
            <Route path="/palmares" element={<Palmares />} />
            <Route path="/mes/:id" element={<MonthPage />} />
            <Route path="/jugador/:slug" element={<Player />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Home />} />
          </Routes>
        )}
      </main>

      <nav className="bottomnav">
        <NavLink to="/" end>
          <span>🏠</span>Inici
        </NavLink>
        <NavLink to="/dossier">
          <span>📁</span>Dossier
        </NavLink>
        <NavLink to="/votar" className="nav-vote">
          <span>🗳️</span>Votar
        </NavLink>
        <NavLink to="/entrenos">
          <span>🏋️</span>Entrenos
        </NavLink>
        <NavLink to="/cartes">
          <span>🃏</span>Cartes
        </NavLink>
      </nav>
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  )
}

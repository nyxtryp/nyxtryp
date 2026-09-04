import Scene from './scene/Scene.jsx'
import AdminPanel from './components/AdminPanel.jsx'

export default function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPanel />
  }

  return (
    <main className="nyxtryp">
      <Scene />
    </main>
  )
}

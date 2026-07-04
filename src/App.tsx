import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import NavBar from './components/NavBar'

// Import all your real pages
import Dashboard from './pages/Dashboard'
import CheckIn from './pages/CheckIn'
import Sell from './pages/Sell'
import Clients from './pages/Clients'
import More from './pages/More'
import ClientProfile from './pages/ClientProfile'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Завантаження...</div>
  }

  // If no user is logged in, show ONLY the login screen
  if (!session) {
    return <Login />
  }

  // If logged in, show the full app
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-16 font-sans text-gray-900 text-base">
        <main className="max-w-3xl mx-auto h-full bg-white shadow-sm min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/check-in" element={<CheckIn />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/more" element={<More />} />
            <Route path="/client/:id" element={<ClientProfile />} />
          </Routes>
        </main>
        
        <NavBar />
      </div>
    </BrowserRouter>
  )
}

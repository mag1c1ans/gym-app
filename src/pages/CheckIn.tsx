import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, CheckCircle2, Clock } from 'lucide-react'

interface Client {
  id: string
  full_name: string
  phone: string
  active: boolean
}

interface CheckInRecord {
  id: string
  checked_in_at: string
  clients: {
    full_name: string
  }
}

export default function CheckIn() {
  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Load today's check-ins when the page opens
  useEffect(() => {
    fetchRecentCheckIns()
  }, [])

  // Auto-search when typing
  useEffect(() => {
    if (searchTerm.length > 1) {
      searchClients()
    } else {
      setClients([])
    }
  }, [searchTerm])

  async function fetchRecentCheckIns() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('check_ins')
      .select('id, checked_in_at, clients(full_name)')
      .gte('checked_in_at', today.toISOString())
      .order('checked_in_at', { ascending: false })
      .limit(15)

    if (!error && data) {
      // Supabase nested joins need a slight type cast
      setRecentCheckIns(data as unknown as CheckInRecord[])
    }
  }

  async function searchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, phone, active')
      .eq('active', true) // Only allow active clients to check in
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(5)

    if (!error && data) {
      setClients(data)
    }
    setLoading(false)
  }

  async function handleCheckIn(clientId: string) {
    const { error } = await supabase
      .from('check_ins')
      .insert([{ client_id: clientId }])

    if (!error) {
      setSearchTerm('') // Clear search
      setClients([]) // Hide search results
      fetchRecentCheckIns() // Refresh the recent list
    } else {
      alert('Помилка реєстрації візиту.')
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Реєстрація візиту</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Пошук клієнта (ім'я або телефон)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-4 bg-white border border-gray-200 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg"
        />
      </div>

      {/* Search Results Dropdown */}
      {searchTerm.length > 1 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Результати пошуку</h2>
          {loading ? (
            <p className="text-gray-500 pl-2">Шукаємо...</p>
          ) : clients.length === 0 ? (
            <p className="text-gray-500 pl-2">Клієнтів не знайдено.</p>
          ) : (
            <div className="space-y-2">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleCheckIn(client.id)}
                  className="w-full text-left bg-white border border-blue-100 shadow-sm p-4 rounded-xl hover:bg-blue-50 transition-colors flex justify-between items-center group"
                >
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{client.full_name}</div>
                    <div className="text-sm text-gray-500">{client.phone || 'Немає телефону'}</div>
                  </div>
                  <div className="bg-blue-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Today's Recent Check-ins */}
      <div className="flex-1">
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" /> Останні візити сьогодні
        </h2>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          {recentCheckIns.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Сьогодні ще немає візитів.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentCheckIns.map(record => (
                <div key={record.id} className="p-4 flex justify-between items-center">
                  <span className="font-medium text-gray-900">{record.clients.full_name}</span>
                  <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    {formatTime(record.checked_in_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

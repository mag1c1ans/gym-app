import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Activity, Banknote, AlertCircle, Clock } from 'lucide-react'

interface ExpiringMembership {
  id: string
  end_date: string
  clients: {
    full_name: string
    phone: string
  }
}

export default function Dashboard() {
  const [todayCheckIns, setTodayCheckIns] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [expiringMemberships, setExpiringMemberships] = useState<ExpiringMembership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    setLoading(true)
    
    // Get start of today in ISO format
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get date 7 days from now
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    const nextWeekISO = nextWeek.toISOString().split('T')[0] // Just the YYYY-MM-DD
    const todayDateOnly = today.toISOString().split('T')[0]

    try {
      // 1. Fetch Today's Check-ins
      const { count: checkInCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', todayISO)

      if (checkInCount !== null) setTodayCheckIns(checkInCount)

      // 2. Fetch Today's Revenue from Purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('total_price')
        .gte('purchased_at', todayISO)

      if (purchases) {
        const revenue = purchases.reduce((sum, record) => sum + Number(record.total_price), 0)
        setTodayRevenue(revenue)
      }

      // 3. Fetch Expiring Memberships
      const { data: expiring } = await supabase
        .from('client_memberships')
        .select('id, end_date, clients(full_name, phone)')
        .gte('end_date', todayDateOnly)
        .lte('end_date', nextWeekISO)
        .order('end_date', { ascending: true })

      if (expiring) {
        setExpiringMemberships(expiring as unknown as ExpiringMembership[])
      }

    } catch (error) {
      console.error('Помилка завантаження статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to format dates nicely
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Головна</h1>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">Візити</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '-' : todayCheckIns}
          </div>
          <div className="text-xs text-gray-400 mt-1">Сьогодні</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Banknote className="w-5 h-5 text-green-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">Виторг</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? '-' : `${todayRevenue.toFixed(2)} ₴`}
          </div>
          <div className="text-xs text-gray-400 mt-1">Сьогодні</div>
        </div>
      </div>

      {/* Expiring Memberships Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2 text-gray-800">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Закінчуються абонементи
          </h2>
          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            Наступні 7 днів
          </span>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          {loading ? (
            <p className="text-gray-500 text-center py-6 animate-pulse">Завантаження...</p>
          ) : expiringMemberships.length === 0 ? (
            <div className="p-6 text-center text-gray-500 flex flex-col items-center">
              <Clock className="w-8 h-8 text-gray-300 mb-2" />
              <p>Немає абонементів, що закінчуються найближчим часом.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {expiringMemberships.map(record => (
                <div key={record.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="font-semibold text-gray-900">{record.clients?.full_name}</div>
                    <div className="text-xs text-gray-500">{record.clients?.phone || 'Немає телефону'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-orange-600">
                      до {formatDate(record.end_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

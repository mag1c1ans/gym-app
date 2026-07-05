import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Activity, Banknote, AlertCircle, Clock, PackageMinus, CreditCard } from 'lucide-react'

interface ExpiringMembership {
  id: string
  end_date: string
  clients: { full_name: string; phone: string }
}

interface Debtor {
  id: string
  amount_due: number
  clients: { full_name: string; phone: string }
}

interface LowStockProduct {
  id: string
  name: string
  stock_quantity: number
}

export default function Dashboard() {
  const [todayCheckIns, setTodayCheckIns] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [expiringMemberships, setExpiringMemberships] = useState<ExpiringMembership[]>([])
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  async function fetchDashboardStats() {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    const nextWeekISO = nextWeek.toISOString().split('T')[0]
    const todayDateOnly = today.toISOString().split('T')[0]

    try {
      // 1. Check-ins & Revenue (Unchanged)
      const { count: checkInCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', todayISO)

      if (checkInCount !== null) setTodayCheckIns(checkInCount)

      let combinedRevenue = 0
      const { data: purchases } = await supabase.from('purchases').select('total_price').gte('purchased_at', todayISO)
      if (purchases) combinedRevenue += purchases.reduce((sum, r) => sum + Number(r.total_price || 0), 0)

      const { data: memberships } = await supabase.from('client_memberships').select('amount_paid').gte('created_at', todayISO)
      if (memberships) combinedRevenue += memberships.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0)

      setTodayRevenue(combinedRevenue)

      // 2. Fetch Expiring Memberships
      const { data: expiring } = await supabase
        .from('client_memberships')
        .select('id, end_date, clients(full_name, phone)')
        .gte('end_date', todayDateOnly)
        .lte('end_date', nextWeekISO)
        .order('end_date', { ascending: true })
      if (expiring) setExpiringMemberships(expiring as any)

      // 3. NEW: Fetch Debts (amount_due > 0)
      const { data: debtsData } = await supabase
        .from('client_memberships')
        .select('id, amount_due, clients(full_name, phone)')
        .gt('amount_due', 0)
        .order('amount_due', { ascending: false })
      if (debtsData) setDebtors(debtsData as any)

      // 4. NEW: Fetch Low Stock (quantity <= 5)
      const { data: stockData } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .lte('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
      if (stockData) setLowStockItems(stockData as any)

    } catch (error) {
      console.error('Помилка завантаження статистики:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Головна</h1>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">Візити</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{loading ? '-' : todayCheckIns}</div>
          <div className="text-xs text-gray-400 mt-1">Сьогодні</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Banknote className="w-5 h-5 text-green-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">Виторг</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{loading ? '-' : `${todayRevenue.toLocaleString('uk-UA')} ₴`}</div>
          <div className="text-xs text-gray-400 mt-1">Сьогодні</div>
        </div>
      </div>

      {/* Action Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        {/* Debts Section */}
        <div className="bg-white border border-red-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Боржники
            </h2>
            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">{debtors.length}</span>
          </div>
          <div className="flex-1 p-0 divide-y divide-gray-50">
            {debtors.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Усі борги сплачено.</p>
            ) : (
              debtors.map(debt => (
                <div key={debt.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <div className="font-semibold text-gray-900">{debt.clients?.full_name}</div>
                    <div className="text-xs text-gray-500">{debt.clients?.phone}</div>
                  </div>
                  <div className="text-right font-bold text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-lg">
                    -{debt.amount_due} ₴
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Section */}
        <div className="bg-white border border-orange-100 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 bg-orange-50/50 border-b border-orange-100 flex items-center justify-between">
            <h2 className="font-bold text-orange-800 flex items-center gap-2">
              <PackageMinus className="w-5 h-5" /> Низький залишок
            </h2>
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{lowStockItems.length}</span>
          </div>
          <div className="flex-1 p-0 divide-y divide-gray-50">
            {lowStockItems.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">Всі товари в наявності.</p>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-lg border ${item.stock_quantity === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    Залишок: {item.stock_quantity}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Expiring Memberships Section */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" /> Закінчуються абонементи
          </h2>
          <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Наступні 7 днів</span>
        </div>
        <div className="divide-y divide-gray-50">
          {expiringMemberships.length === 0 ? (
            <div className="p-6 text-center text-gray-500 flex flex-col items-center">
              <Clock className="w-8 h-8 text-gray-300 mb-2" />
              <p>Немає абонементів, що закінчуються найближчим часом.</p>
            </div>
          ) : (
            expiringMemberships.map(record => (
              <div key={record.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <div className="font-semibold text-gray-900">{record.clients?.full_name}</div>
                  <div className="text-xs text-gray-500">{record.clients?.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-600">до {formatDate(record.end_date)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
    </div>
  )
}

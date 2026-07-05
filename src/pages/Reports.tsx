import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Download, TrendingUp, ListOrdered, Calendar } from 'lucide-react'

interface GroupedTransaction {
  dateKey: string // YYYY-MM-DD
  clientName: string
  items: {
    itemName: string
    type: 'membership' | 'product'
    quantity: number
    amount: number
  }[]
  totalAmount: number
}

export default function Reports() {
  const [transactions, setTransactions] = useState<GroupedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    fetchFinancials()
  }, [])

  async function fetchFinancials() {
    try {
      // 1. Fetch Memberships
      const { data: memberships, error: memError } = await supabase
        .from('client_memberships')
        .select(`
          id,
          created_at,
          amount_paid,
          clients ( full_name ),
          membership_types ( name )
        `)
        
      if (memError) throw memError

      // 2. Fetch Product Purchases
      const { data: productSales, error: foodError } = await supabase
        .from('purchases')
        .select(`
          id,
          purchased_at,
          quantity,
          total_price,
          clients ( full_name ),
          products ( name )
        `)
        
      if (foodError) throw foodError

      let total = 0
      const dailyClientGroups: Record<string, GroupedTransaction> = {}

      const addToDailyGroup = (dateString: string, clientName: string, itemName: string, type: 'membership' | 'product', quantity: number, amount: number) => {
        if (!amount) return
        
        total += amount

        const dateObj = new Date(dateString)
        const dateKey = dateObj.toISOString().split('T')[0]
        const groupKey = `${dateKey}_${clientName}`

        if (!dailyClientGroups[groupKey]) {
          dailyClientGroups[groupKey] = {
            dateKey,
            clientName,
            items: [],
            totalAmount: 0
          }
        }

        const group = dailyClientGroups[groupKey]
        const existingItem = group.items.find(i => i.itemName === itemName && i.type === type)
        
        if (existingItem) {
          existingItem.quantity += quantity
          existingItem.amount += amount
        } else {
          group.items.push({ itemName, type, quantity, amount })
        }
        
        group.totalAmount += amount
      }

      memberships?.forEach((m: any) => {
        const amount = Number(m.amount_paid || 0)
        addToDailyGroup(
          m.created_at,
          m.clients?.full_name || 'Невідомий клієнт',
          m.membership_types?.name || 'Абонемент',
          'membership',
          1,
          amount
        )
      })

      productSales?.forEach((p: any) => {
        const amount = Number(p.total_price || 0)
        addToDailyGroup(
          p.purchased_at,
          p.clients?.full_name || 'Гість',
          p.products?.name || 'Товар',
          'product',
          p.quantity || 1,
          amount
        )
      })

      const sortedDailyGroups = Object.values(dailyClientGroups).sort((a, b) => {
        return new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
      })

      setTransactions(sortedDailyGroups)
      setTotalRevenue(total)
      setDbError(null)
    } catch (error: any) {
      setDbError(error.message || 'Невідома помилка')
    } finally {
      setLoading(false)
    }
  }

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // --- UPDATED EXPORT: Daily Summary (Itemized, No Names) ---
  function exportDailySummaryCSV() {
    // Structure: Date -> Item Name -> Aggregated Data
    const dailyAggregates: Record<string, Record<string, { type: string, quantity: number, amount: number }>> = {}
    let grandTotal = 0

    transactions.forEach(group => {
      const dateStr = formatDateString(group.dateKey)
      if (!dailyAggregates[dateStr]) {
        dailyAggregates[dateStr] = {}
      }

      group.items.forEach(item => {
        if (!dailyAggregates[dateStr][item.itemName]) {
          dailyAggregates[dateStr][item.itemName] = {
            type: item.type === 'membership' ? 'Абонемент' : 'Бар/Магазин',
            quantity: 0,
            amount: 0
          }
        }
        // Combine identical items for the whole day
        dailyAggregates[dateStr][item.itemName].quantity += item.quantity
        dailyAggregates[dateStr][item.itemName].amount += item.amount
        grandTotal += item.amount
      })
    })

    const headers = ['Дата', 'Тип', 'Позиція', 'Продано (К-ть)', 'Дохід (UAH)']
    const csvRows: string[] = []

    Object.entries(dailyAggregates).forEach(([date, items]) => {
      let dailyTotalQuantity = 0
      let dailyTotalRevenue = 0

      // List every item bought on this date
      Object.entries(items).forEach(([itemName, data]) => {
        csvRows.push(`"${date}","${data.type}","${itemName}","${data.quantity}","${data.amount}"`)
        dailyTotalQuantity += data.quantity
        dailyTotalRevenue += data.amount
      })

      // Add a clean subtotal row for the day
      csvRows.push(`"Підсумок за ${date}","","Всього:","${dailyTotalQuantity}","${dailyTotalRevenue}"`)
      csvRows.push(`"","","","",""`) // Empty line for readability in Excel
    })

    csvRows.push(`"ВСЬОГО ЗА ПЕРІОД","","","-","${grandTotal}"`)

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `daily_itemized_summary_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- ORIGINAL EXPORT: Detailed ---
  function exportDetailedCSV() {
    const headers = ['Дата', 'Клієнт', 'Тип', 'Позиція', 'К-ть', 'Сума (UAH)']
    
    const csvRows = transactions.flatMap(group => {
      const dt = formatDateString(group.dateKey)
      return group.items.map(item => {
        const typeLabel = item.type === 'membership' ? 'Абонемент' : 'Бар/Магазин'
        return `"${dt}","${group.clientName}","${typeLabel}","${item.itemName}","${item.quantity}","${item.amount}"`
      })
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `detailed_sales_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Завантаження фінансів...</div>

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Фінансові звіти</h1>
        <div className="flex flex-wrap gap-2">
          {/* New Itemized Summary Button */}
          <button 
            onClick={exportDailySummaryCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4" /> Щоденний звіт (Без імен)
          </button>
          {/* Original Detailed Button */}
          <button 
            onClick={exportDetailedCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Детальний CSV
          </button>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm">
          <strong>Помилка бази даних:</strong> {dbError}
        </div>
      )}

      {/* Total Revenue Widget */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg mb-8">
        <div className="flex items-center gap-3 mb-2 opacity-80">
          <TrendingUp className="w-5 h-5" />
          <h2 className="text-sm font-medium uppercase tracking-wider">Загальний дохід (Всі часи)</h2>
        </div>
        <div className="text-4xl font-bold">{totalRevenue.toLocaleString('uk-UA')} ₴</div>
      </div>

      {/* Grouped Transactions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold text-gray-800">Детальна історія продажів</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                <th className="p-4 font-semibold whitespace-nowrap">Дата</th>
                <th className="p-4 font-semibold">Клієнт</th>
                <th className="p-4 font-semibold">Позиція</th>
                <th className="p-4 font-semibold text-center">К-ть</th>
                <th className="p-4 font-semibold text-right">Сума</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                  <tr className="bg-gray-50/60 border-t border-gray-100">
                    <td className="p-3 pl-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatDateString(group.dateKey)}
                    </td>
                    <td className="p-3 text-sm font-bold text-gray-900">
                      {group.clientName}
                    </td>
                    <td className="p-3 text-xs text-gray-400">
                      Позицій за день: {group.items.length}
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3 pr-4 text-right font-bold text-gray-900">
                      {group.totalAmount.toLocaleString('uk-UA')} ₴
                    </td>
                  </tr>
                  
                  {group.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 border-l-2 border-transparent"></td>
                      <td className="p-3"></td>
                      <td className="p-3 py-2 text-sm">
                        <span className="font-medium text-gray-800">{item.itemName}</span>
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.type === 'membership' ? 'Абонемент' : 'Товар'}
                        </span>
                      </td>
                      <td className="p-3 py-2 text-center">
                        <span className="text-gray-700 font-semibold text-sm">
                          x{item.quantity}
                        </span>
                      </td>
                      <td className="p-3 py-2 pr-4 text-right text-gray-800 font-medium">
                        {item.amount.toLocaleString('uk-UA')} ₴
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              
              {transactions.length === 0 && !dbError && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Транзакцій поки немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

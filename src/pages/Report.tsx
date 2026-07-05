import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Download, TrendingUp, Calendar, FileSpreadsheet } from 'lucide-react'

interface MonthlyReport {
  monthId: string
  label: string
  revenue: number
  salesCount: number
}

export default function Reports() {
  const [reportData, setReportData] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    fetchFinancials()
  }, [])

  async function fetchFinancials() {
    try {
      // Fetch all paid memberships
      const { data, error } = await supabase
        .from('client_memberships')
        .select('start_date, amount_paid')
        .order('start_date', { ascending: false })

      if (error) throw error

      let total = 0
      const monthlyGroups: Record<string, MonthlyReport> = {}

      // Group the data by Year-Month
      data?.forEach(sale => {
        if (!sale.amount_paid) return
        
        const date = new Date(sale.start_date)
        const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // e.g., "2026-08"
        const label = date.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
        
        if (!monthlyGroups[monthId]) {
          monthlyGroups[monthId] = { monthId, label, revenue: 0, salesCount: 0 }
        }
        
        monthlyGroups[monthId].revenue += sale.amount_paid
        monthlyGroups[monthId].salesCount += 1
        total += sale.amount_paid
      })

      // Convert object to array and sort by newest month first
      const sortedReports = Object.values(monthlyGroups).sort((a, b) => b.monthId.localeCompare(a.monthId))
      
      setReportData(sortedReports)
      setTotalRevenue(total)
    } catch (error) {
      console.error('Помилка завантаження фінансів:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate and download the CSV file
  function exportToCSV() {
    const headers = ['Місяць', 'Рік', 'Кількість продажів', 'Дохід (UAH)']
    
    const csvRows = reportData.map(row => {
      const [year, month] = row.monthId.split('-')
      return `"${row.label}","${year}","${row.salesCount}","${row.revenue}"`
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    
    // Add BOM (\uFEFF) to ensure Excel reads Ukrainian Cyrillic characters correctly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Завантаження фінансів...</div>

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Фінансові звіти</h1>
        <button 
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
        >
          <FileSpreadsheet className="w-5 h-5" /> Експорт CSV
        </button>
      </div>

      {/* Lifetime Overview Card */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg mb-8">
        <div className="flex items-center gap-3 mb-2 opacity-80">
          <TrendingUp className="w-5 h-5" />
          <h2 className="text-sm font-medium uppercase tracking-wider">Загальний дохід (Всі часи)</h2>
        </div>
        <div className="text-4xl font-bold">{totalRevenue.toLocaleString('uk-UA')} ₴</div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="font-bold text-gray-800">Щомісячна статистика</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-semibold">Період</th>
                <th className="p-4 font-semibold text-center">Продажі</th>
                <th className="p-4 font-semibold text-right">Дохід</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reportData.map((row) => (
                <tr key={row.monthId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 capitalize">{row.label}</td>
                  <td className="p-4 text-center text-gray-600">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-sm font-medium">
                      {row.salesCount}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-gray-900">
                    {row.revenue.toLocaleString('uk-UA')} ₴
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    Ще немає даних про продажі.
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

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, User, Calendar, Plus, Clock, CreditCard, X } from 'lucide-react'

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [client, setClient] = useState<any>(null)
  const [activeMembership, setActiveMembership] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (id) {
      fetchClientData()
      fetchPlans()
    }
  }, [id])

  async function fetchClientData() {
    // Fetch basic info
    const { data: clientData } = await supabase.from('clients').select('*').eq('id', id).single()
    if (clientData) setClient(clientData)

    // Fetch active membership (end_date >= today)
    const today = new Date().toISOString().split('T')[0]
    const { data: membershipData } = await supabase
      .from('client_memberships')
      .select('*, membership_types(name)')
      .eq('client_id', id)
      .gte('end_date', today)
      .order('end_date', { ascending: false })
      .limit(1)
      .single()
      
    setActiveMembership(membershipData || null)
    setLoading(false)
  }

  async function fetchPlans() {
    const { data } = await supabase.from('membership_types').select('*').eq('active', true).order('price')
    if (data) setPlans(data)
  }

  async function handleAssignMembership(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPlanId) return
    setIsSubmitting(true)

    const plan = plans.find(p => p.id === selectedPlanId)
    if (!plan) return

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(startDate.getDate() + plan.duration_days)

    try {
      const { error } = await supabase.from('client_memberships').insert([{
        client_id: id,
        membership_type_id: plan.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        amount_paid: plan.price
      }])

      if (error) throw error
      
      setIsModalOpen(false)
      fetchClientData() // Refresh profile
    } catch (error) {
      console.error(error)
      alert('Помилка призначення абонемента.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Завантаження...</div>
  if (!client) return <div className="p-6 text-red-500">Клієнта не знайдено</div>

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-20">
      <div className="bg-white px-6 py-4 border-b border-gray-200 sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Профіль</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Client Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.full_name}</h2>
            <p className="text-gray-500">{client.phone || client.email || 'Немає контактних даних'}</p>
          </div>
        </div>

        {/* Membership Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Абонемент
            </h3>
            {activeMembership ? (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Активний
              </span>
            ) : (
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Немає абонемента
              </span>
            )}
          </div>

          {activeMembership ? (
            <div className="space-y-1">
              <div className="font-bold text-xl text-gray-900">{activeMembership.membership_types.name}</div>
              <div className="text-gray-500 text-sm">Дійсний до: <span className="font-semibold text-gray-900">{formatDate(activeMembership.end_date)}</span></div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">У цього клієнта зараз немає активного абонемента.</p>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-4 w-full bg-blue-50 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-100 transition-colors flex justify-center items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Призначити абонемент
          </button>
        </div>
      </div>

      {/* Assign Membership Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Новий абонемент</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAssignMembership} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Оберіть план</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${selectedPlanId === plan.id ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                    >
                      <div className="font-bold text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">{plan.duration_days} днів • {plan.price} ₴</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={!selectedPlanId || isSubmitting}
                className="w-full bg-blue-600 text-white font-bold p-3 rounded-xl hover:bg-blue-700 transition-colors mt-4 disabled:opacity-50"
              >
                {isSubmitting ? 'Обробка...' : 'Призначити'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

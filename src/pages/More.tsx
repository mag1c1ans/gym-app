import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Settings, CreditCard, Edit2, X } from 'lucide-react'

interface MembershipType {
  id: string
  name: string
  price: number
  duration_days: number
  description: string
  active: boolean
}

export default function More() {
  const [plans, setPlans] = useState<MembershipType[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState('')
  const [newPlan, setNewPlan] = useState({ name: '', price: '', duration_days: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .order('price')
      
      if (error) throw error
      if (data) setPlans(data)
    } catch (error) {
      console.error('Помилка завантаження планів:', error)
    } finally {
      setLoading(false)
    }
  }

  function openNewPlan() {
    setNewPlan({ name: '', price: '', duration_days: '', description: '' })
    setEditMode(false)
    setIsModalOpen(true)
  }

  function openEditPlan(plan: MembershipType) {
    setNewPlan({ 
      name: plan.name, 
      price: plan.price.toString(), 
      duration_days: plan.duration_days.toString(), 
      description: plan.description || '' 
    })
    setCurrentPlanId(plan.id)
    setEditMode(true)
    setIsModalOpen(true)
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (editMode) {
        // Update existing plan
        const { error } = await supabase
          .from('membership_types')
          .update({ 
            name: newPlan.name, 
            price: parseFloat(newPlan.price), 
            duration_days: parseInt(newPlan.duration_days),
            description: newPlan.description
          })
          .eq('id', currentPlanId)
        if (error) throw error
      } else {
        // Insert new plan
        const { error } = await supabase
          .from('membership_types')
          .insert([{ 
            name: newPlan.name, 
            price: parseFloat(newPlan.price), 
            duration_days: parseInt(newPlan.duration_days),
            description: newPlan.description
          }])
        if (error) throw error
      }
      
      setIsModalOpen(false)
      fetchPlans()
    } catch (error) {
      console.error('Помилка збереження плану:', error)
      alert('Не вдалося зберегти абонемент.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleActiveStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('membership_types')
        .update({ active: !currentStatus })
        .eq('id', id)
        
      if (error) throw error
      fetchPlans()
    } catch (error) {
      console.error('Помилка оновлення статусу:', error)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold">Налаштування</h1>
      </div>

      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-500" />
          Абонементи
        </h2>
        <button 
          onClick={openNewPlan}
          className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Додати
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-3">
        {loading ? (
          <p className="text-gray-500 text-center mt-10 animate-pulse">Завантаження планів...</p>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className={`bg-white border shadow-sm p-4 rounded-xl transition-opacity ${!plan.active && 'opacity-60'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">{plan.price.toFixed(2)} ₴</div>
                  <div className="text-xs text-gray-500">{plan.duration_days} днів</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button 
                  onClick={() => openEditPlan(plan)}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Редагувати
                </button>
                <button 
                  onClick={() => toggleActiveStatus(plan.id, plan.active)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${plan.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {plan.active ? 'Деактивувати' : 'Активувати'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editMode ? 'Редагувати абонемент' : 'Новий абонемент'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва плану *</label>
                <input required type="text" value={newPlan.name} onChange={(e) => setNewPlan({...newPlan, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="напр. Місячний абонемент" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ціна (₴) *</label>
                  <input required type="number" step="0.01" value={newPlan.price} onChange={(e) => setNewPlan({...newPlan, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тривалість (Днів) *</label>
                  <input required type="number" value={newPlan.duration_days} onChange={(e) => setNewPlan({...newPlan, duration_days: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Опис</label>
                <input type="text" value={newPlan.description} onChange={(e) => setNewPlan({...newPlan, description: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 text-white font-medium p-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 mt-4">
                {isSubmitting ? 'Збереження...' : 'Зберегти план'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

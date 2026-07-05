import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Plus, Settings, CreditCard, Edit2, X, Package, Save } from 'lucide-react'

interface MembershipType {
  id: string
  name: string
  price: number
  duration_days: number
  description: string
  active: boolean
}

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  active: boolean
}

export default function More() {
  const [plans, setPlans] = useState<MembershipType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Membership Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState('')
  const [newPlan, setNewPlan] = useState({ name: '', price: '', duration_days: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inventory State
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [plansRes, productsRes] = await Promise.all([
        supabase.from('membership_types').select('*').order('price'),
        supabase.from('products').select('*').order('name')
      ])
      
      if (plansRes.error) throw plansRes.error
      if (productsRes.error) throw productsRes.error

      if (plansRes.data) setPlans(plansRes.data)
      if (productsRes.data) setProducts(productsRes.data)
    } catch (error) {
      console.error('Помилка завантаження даних:', error)
    } finally {
      setLoading(false)
    }
  }

  // --- MEMBERSHIP LOGIC ---
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
      fetchData()
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
      fetchData()
    } catch (error) {
      console.error('Помилка оновлення статусу:', error)
    }
  }

  // --- INVENTORY LOGIC ---
  const handleStockChange = (id: string, newStock: number) => {
    setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: newStock } : p))
  }

  async function saveStock(product: Product) {
    setSavingId(product.id)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity })
        .eq('id', product.id)
        
      if (error) throw error
    } catch (error) {
      alert('Помилка оновлення складу')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Завантаження налаштувань...</div>

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold">Налаштування</h1>
      </div>

      {/* SECTION 1: MEMBERSHIPS */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
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

        <div className="space-y-3">
          {plans.map(plan => (
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
          ))}
        </div>
      </div>

      {/* SECTION 2: INVENTORY MANAGEMENT */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-gray-500" />
          Управління складом (Бар)
        </h2>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {products.map(product => (
            <div key={product.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-semibold text-gray-900">{product.name}</div>
                <div className="text-xs text-gray-500">{product.price.toFixed(2)} ₴</div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">Залишок</label>
                  <input 
                    type="number"
                    value={product.stock_quantity}
                    onChange={(e) => handleStockChange(product.id, Number(e.target.value))}
                    className="w-20 p-2 text-center bg-gray-100 border border-gray-200 rounded-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button 
                  onClick={() => saveStock(product)}
                  disabled={savingId === product.id}
                  className="mt-4 p-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  title="Зберегти залишок"
                >
                  <Save className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="p-6 text-center text-gray-500">Товари ще не додані до бази даних.</p>
          )}
        </div>
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

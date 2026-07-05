import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Search, Plus, User, X } from 'lucide-react'

// 1. Updated Interface to include memberships
interface Client {
  id: string
  full_name: string
  email: string
  phone: string
  active: boolean
  client_memberships?: { end_date: string }[] 
}

// 2. Added Helper Function to check dates
function isActive(client: Client) {
  const today = new Date().toISOString().split('T')[0]
  if (!client.client_memberships) return false
  return client.client_memberships.some(m => m.end_date >= today)
}

export default function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  // 3. Updated fetch query to pull the membership end_date
  async function fetchClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          client_memberships (
            end_date
          )
        `)
        .order('full_name')
      
      if (error) throw error
      if (data) setClients(data)
    } catch (error) {
      console.error('Помилка завантаження клієнтів:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const { error } = await supabase
        .from('clients')
        .insert([{ 
          full_name: newClient.full_name, 
          email: newClient.email, 
          phone: newClient.phone 
        }])
        
      if (error) throw error
      
      setNewClient({ full_name: '', email: '', phone: '' })
      setIsModalOpen(false)
      fetchClients()
    } catch (error) {
      console.error('Помилка додавання клієнта:', error)
      alert('Не вдалося додати клієнта.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Клієнти</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Додати
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Пошук клієнтів..." 
          className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <p className="text-gray-500 text-center mt-10 animate-pulse">Завантаження клієнтів...</p>
        ) : clients.length === 0 ? (
          <div className="text-center mt-16">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Ще немає клієнтів</h3>
            <p className="text-gray-500 text-sm">Натисніть «Додати», щоб створити першого клієнта.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map(client => (
              <div 
                key={client.id} 
                onClick={() => navigate(`/client/${client.id}`)}
                className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{client.full_name}</h3>
                  <p className="text-sm text-gray-500">{client.email || client.phone || 'Немає контактних даних'}</p>
                </div>
                {/* 4. Updated the status span to use the isActive function */}
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${isActive(client) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isActive(client) ? 'Активний' : 'Неактивний'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Додати нового клієнта</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Повне ім'я *</label>
                <input 
                  required
                  type="text" 
                  value={newClient.full_name}
                  onChange={(e) => setNewClient({...newClient, full_name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Електронна пошта</label>
                <input 
                  type="email" 
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Номер телефону</label>
                <input 
                  type="tel" 
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-medium p-3 rounded-xl hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Збереження...' : 'Зберегти клієнта'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

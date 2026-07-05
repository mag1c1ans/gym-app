import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, User, Edit, Trash2, X, Phone, Mail, Activity, Calendar } from 'lucide-react'

interface Client {
  id: string
  full_name: string
  email: string
  phone: string
}

interface CheckIn {
  checked_in_at: string
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', phone: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (id) fetchClientData()
  }, [id])

  async function fetchClientData() {
    try {
      // 1. Fetch Client Details
      const { data: clientData, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (clientErr) throw clientErr
      if (clientData) {
        setClient(clientData)
        setEditForm({ full_name: clientData.full_name || '', email: clientData.email || '', phone: clientData.phone || '' })
      }

      // 2. Fetch Visit History
      const { data: visitsData, error: visitsErr } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('client_id', id)
        .order('checked_in_at', { ascending: false })

      if (!visitsErr && visitsData) {
        setCheckIns(visitsData)
      }
    } catch (error) {
      console.error('Помилка завантаження даних:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateClient(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone
        })
        .eq('id', id)
      if (error) throw error
      setClient({ ...client, ...editForm } as Client)
      setIsEditModalOpen(false)
    } catch (error) {
      alert('Не вдалося оновити дані клієнта.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteClient() {
    const isConfirmed = window.confirm('Ви впевнені, що хочете видалити цього клієнта?')
    if (!isConfirmed) return
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
      navigate('/clients')
    } catch (error) {
      alert('Не вдалося видалити клієнта.')
    }
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return {
      date: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    }
  }

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Завантаження профілю...</div>
  if (!client) return <div className="p-6 text-red-500">Клієнта не знайдено</div>

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-y-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Назад
        </button>
        <div className="flex gap-2">
          <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"><Edit className="w-5 h-5" /></button>
          <button onClick={handleDeleteClient} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
            <p className="text-gray-500 text-sm">Всього візитів: {checkIns.length}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-gray-700"><Phone className="w-5 h-5 text-gray-400" /><span className="font-medium">{client.phone || 'Не вказано'}</span></div>
          <div className="flex items-center gap-3 text-gray-700"><Mail className="w-5 h-5 text-gray-400" /><span className="font-medium">{client.email || 'Не вказано'}</span></div>
        </div>
      </div>

      {/* Visit History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-800">Історія відвідувань</h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {checkIns.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">Цей клієнт ще не відвідував зал.</p>
          ) : (
            checkIns.map((visit, index) => {
              const { date, time } = formatDateTime(visit.checked_in_at)
              return (
                <div key={index} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg"><Calendar className="w-4 h-4 text-blue-600" /></div>
                    <span className="font-medium text-gray-900">{date}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">{time}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Edit Modal (unchanged) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Редагувати клієнта</h2>
              <button onClick={() => setIsEditModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <input required type="text" value={editForm.full_name} onChange={(e) => setEditForm({...editForm, full_name: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" />
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" />
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl" />
              <button 
               type="submit" 
               disabled={isSubmitting}
               className="w-full bg-blue-600 text-white font-medium p-3 rounded-xl hover:bg-blue-700 transition-colors mt-2 disabled:opacity-50"
               >
                {isSubmitting ? 'Збереження...' : 'Зберегти зміни'} 
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

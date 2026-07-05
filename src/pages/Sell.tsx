import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ShoppingCart, Plus, Minus, Trash2, Search, X, User, Package, CreditCard } from 'lucide-react'

interface CatalogItem {
  id: string
  name: string
  price: number
  category: 'product' | 'membership'
  stock_quantity?: number
  duration_days?: number
}

interface CartItem extends CatalogItem {
  quantity: number
}

interface Client {
  id: string
  full_name: string
  phone: string
}

export default function Sell() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Client Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Payment State
  const [amountPaid, setAmountPaid] = useState<number | ''>('')

  useEffect(() => {
    fetchCatalog()
  }, [])

  useEffect(() => {
    if (searchTerm.length > 1) {
      searchClients()
    } else {
      setClientResults([])
    }
  }, [searchTerm])

  async function fetchCatalog() {
    try {
      const [productsRes, membershipsRes] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('name'),
        supabase.from('membership_types').select('*').eq('active', true).order('name')
      ])

      const combined: CatalogItem[] = []
      
      if (productsRes.data) {
        combined.push(...productsRes.data.map(p => ({ ...p, category: 'product' as const })))
      }
      if (membershipsRes.data) {
        combined.push(...membershipsRes.data.map(m => ({ ...m, category: 'membership' as const })))
      }

      setCatalog(combined)
    } catch (error) {
      console.error('Помилка завантаження каталогу:', error)
    } finally {
      setLoading(false)
    }
  }

  async function searchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, phone')
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(5)

    if (!error && data) setClientResults(data)
  }

  const addToCart = (item: CatalogItem) => {
    if (item.category === 'product' && item.stock_quantity !== undefined && item.stock_quantity <= 0) {
      return alert('Цього товару немає в наявності!')
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id)
      
      if (existingItem) {
        if (item.category === 'product' && existingItem.quantity >= (item.stock_quantity || 0)) {
          alert('Досягнуто ліміту залишку на складі!')
          return prevCart
        }
        return prevCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prevCart, { ...item, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta
          if (item.category === 'product' && delta > 0 && newQuantity > (item.stock_quantity || 0)) {
            alert('Недостатньо на складі!')
            return item
          }
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  const removeFromCart = (id: string) => setCart(prevCart => prevCart.filter(item => item.id !== id))

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  const currentDebt = cartTotal - (amountPaid === '' ? cartTotal : Number(amountPaid))

  async function handleSaveRecord() {
    if (cart.length === 0) return
    // MANDATORY CLIENT CHECK: Block the sale completely if no client is selected
    if (!selectedClient) {
      return alert('Будь ласка, оберіть клієнта для оформлення продажу!')
    }

    setIsSaving(true)
    
    let remainingDebtToDistribute = currentDebt > 0 ? currentDebt : 0

    try {
      for (const item of cart) {
        const itemLineTotal = item.price * item.quantity
        const assignedDebt = Math.min(remainingDebtToDistribute, itemLineTotal)
        remainingDebtToDistribute -= assignedDebt

        if (item.category === 'membership') {
          for (let i = 0; i < item.quantity; i++) {
            const startDate = new Date()
            const endDate = new Date()
            endDate.setDate(startDate.getDate() + (item.duration_days || 30))

            const { error: memErr } = await supabase.from('client_memberships').insert({
              client_id: selectedClient.id,
              membership_type_id: item.id,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
              amount_paid: itemLineTotal - assignedDebt,
              amount_due: assignedDebt
            })
            if (memErr) throw memErr
          }
        } else {
          const { error: prodErr } = await supabase.from('purchases').insert({
            client_id: selectedClient.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: itemLineTotal,
            amount_due: assignedDebt
          })
          if (prodErr) throw prodErr

          const newStock = (item.stock_quantity || 0) - item.quantity
          const { error: stockErr } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.id)
          if (stockErr) throw stockErr
        }
      }

      alert('Продаж успішно завершено!')
      setCart([]) 
      setSelectedClient(null)
      setAmountPaid('')
      fetchCatalog() 
    } catch (error) {
      console.error('Помилка при збереженні:', error)
      alert('Помилка при збереженні запису. Перевірте зʼєднання.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      {/* Top Grid Area */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Каса</h1>
        </div>
        
        {loading ? (
          <p className="text-gray-500 animate-pulse">Завантаження позицій...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {catalog.map(item => {
              const isOutOfStock = item.category === 'product' && item.stock_quantity !== undefined && item.stock_quantity <= 0
              
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={isOutOfStock}
                  className={`bg-white p-4 rounded-2xl border ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-red-100' : 'border-gray-100 shadow-sm active:scale-95'} text-left transition-transform flex flex-col justify-between min-h-[100px] relative`}
                >
                  <div className="flex items-start justify-between w-full mb-2">
                    <span className="font-semibold text-gray-800 leading-tight pr-2">{item.name}</span>
                    <span className="bg-gray-100 text-gray-500 p-1 rounded-md">
                      {item.category === 'membership' ? <User className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-blue-600 font-bold text-lg">{item.price.toFixed(2)} ₴</span>
                    {item.category === 'product' && (
                      <div className={`text-[10px] uppercase font-bold mt-1 ${isOutOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                        Залишок: {item.stock_quantity}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Bottom Drawer */}
      <div className="bg-white border-t border-gray-200 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl pb-20">
        
        {/* Client Search */}
        <div className="mb-4">
          <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Клієнт *</h2>
          {!selectedClient ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Пошук клієнта (обов'язково)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {clientResults.length > 0 && (
                <div className="absolute bottom-full mb-1 w-full bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50">
                  {clientResults.map(client => (
                    <button
                      key={client.id}
                      onClick={() => { setSelectedClient(client); setSearchTerm(''); setClientResults([]); }}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <div className="font-semibold text-gray-900">{client.full_name}</div>
                      <div className="text-xs text-gray-500">{client.phone || 'Немає телефону'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">{selectedClient.full_name}</span>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-blue-400 hover:text-blue-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" /> Запис
          </h2>
        </div>

        {cart.length === 0 ? (
          <p className="text-gray-400 text-center py-2 mb-4">Нічого не додано</p>
        ) : (
          <div className="max-h-32 overflow-y-auto mb-4 pr-2 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.price.toFixed(2)} ₴</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-600 hover:text-gray-900"><Minus className="w-4 h-4" /></button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-600 hover:text-gray-900"><Plus className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Math Section */}
        <div className="border-t border-gray-100 pt-4 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-medium">До сплати:</span>
            <span className="text-2xl font-bold text-gray-900">{cartTotal.toFixed(2)} ₴</span>
          </div>

          <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Оплачено готівкою:
            </span>
            <input 
              type="number"
              placeholder={cartTotal.toString()}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : '')}
              className="w-24 p-1.5 bg-white border border-gray-200 rounded-lg text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {currentDebt > 0 && (
            <div className="flex items-center justify-between text-red-600 font-bold px-1">
              <span>Записуємо борг:</span>
              <span>{currentDebt.toFixed(2)} ₴</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveRecord}
          // BUTTON REMAINS DISABLED IF NO CLIENT IS SELECTED
          disabled={cart.length === 0 || isSaving || !selectedClient}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Збереження...' : 'Підтвердити продаж'}
        </button>
      </div>
    </div>
  )
}

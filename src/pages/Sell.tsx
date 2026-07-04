import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ShoppingCart, Plus, Minus, Trash2, Search, Settings, X, User, Edit2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  category: string
}

interface CartItem extends Product {
  quantity: number
}

interface Client {
  id: string
  full_name: string
  phone: string
}

export default function Sell() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Client Search State
  const [searchTerm, setSearchTerm] = useState('')
  const [clientResults, setClientResults] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [_isSearchingClient, setIsSearchingClient] = useState(false)


  // Manage Products State
  const [isManageMode, setIsManageMode] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentProductId, setCurrentProductId] = useState('')
  const [productForm, setProductForm] = useState({ name: '', price: '' })

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchTerm.length > 1) {
      searchClients()
    } else {
      setClientResults([])
    }
  }, [searchTerm])

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name')
    
    if (!error && data) setProducts(data)
    setLoading(false)
  }

  async function searchClients() {
    setIsSearchingClient(true)
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, phone')
      .eq('active', true)
      .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .limit(5)

    if (!error && data) setClientResults(data)
    setIsSearchingClient(false)
  }

  const addToCart = (product: Product) => {
    if (isManageMode) return 
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id)
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)

  async function handleSaveRecord() {
    if (cart.length === 0 || !selectedClient) return
    setIsSaving(true)

    try {
      const purchases = cart.map(item => ({
        client_id: selectedClient.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }))

      const { error } = await supabase.from('purchases').insert(purchases)
      if (error) throw error

      setCart([]) 
      setSelectedClient(null)
      alert('Запис успішно збережено!')
    } catch (error) {
      console.error('Record error:', error)
      alert('Помилка при збереженні запису.')
    } finally {
      setIsSaving(false)
    }
  }

  function openNewProduct() {
    setProductForm({ name: '', price: '' })
    setEditMode(false)
    setIsModalOpen(true)
  }

  function openEditProduct(p: Product) {
    setProductForm({ name: p.name, price: p.price.toString() })
    setCurrentProductId(p.id)
    setEditMode(true)
    setIsModalOpen(true)
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editMode) {
        const { error } = await supabase
          .from('products')
          .update({ name: productForm.name, price: parseFloat(productForm.price) })
          .eq('id', currentProductId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ name: productForm.name, price: parseFloat(productForm.price), category: 'general' }])
        if (error) throw error
      }
      setIsModalOpen(false)
      fetchProducts()
    } catch (error) {
      console.error(error)
      alert('Помилка збереження товару.')
    }
  }

  async function handleDeleteProduct() {
    if (!confirm('Видалити цей товар?')) return
    try {
      const { error } = await supabase
        .from('products')
        .update({ active: false }) 
        .eq('id', currentProductId)
      if (error) throw error
      setIsModalOpen(false)
      fetchProducts()
    } catch (error) {
      console.error(error)
      alert('Помилка видалення.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Товари</h1>
          <button 
            onClick={() => setIsManageMode(!isManageMode)}
            className={`p-2 rounded-lg transition-colors ${isManageMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        {loading ? (
          <p className="text-gray-500 animate-pulse">Завантаження товарів...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {isManageMode && (
              <button
                onClick={openNewProduct}
                className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center min-h-[100px] text-blue-600 hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-6 h-6 mb-1" />
                <span className="font-semibold text-sm">Додати</span>
              </button>
            )}
            
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => isManageMode ? openEditProduct(product) : addToCart(product)}
                className={`bg-white p-4 rounded-2xl border ${isManageMode ? 'border-blue-200 shadow-md' : 'border-gray-100 shadow-sm active:scale-95'} text-left transition-transform flex flex-col justify-between min-h-[100px] relative`}
              >
                <span className="font-semibold text-gray-800 leading-tight mb-2 pr-4">{product.name}</span>
                <span className="text-blue-600 font-bold text-lg">{product.price.toFixed(2)} ₴</span>
                
                {isManageMode && (
                  <div className="absolute top-3 right-3 text-blue-400">
                    <Edit2 className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl pb-20">
        
        <div className="mb-6">
          <h2 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">Клієнт</h2>
          {!selectedClient ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Пошук клієнта..."
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

        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            Запис
          </h2>
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} шт.
          </span>
        </div>

        {cart.length === 0 ? (
          <p className="text-gray-400 text-center py-2 mb-4">Нічого не додано</p>
        ) : (
          <div className="max-h-32 overflow-y-auto mb-4 pr-2 space-y-3">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.price.toFixed(2)} ₴</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-lg">
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

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between mb-4">
          <span className="text-gray-500 font-medium">Всього:</span>
          <span className="text-2xl font-bold text-gray-900">{cartTotal.toFixed(2)} ₴</span>
        </div>

        <button
          onClick={handleSaveRecord}
          disabled={cart.length === 0 || !selectedClient || isSaving}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Збереження...' : 'Зберегти запис'}
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6">{editMode ? 'Редагувати товар' : 'Новий товар'}</h2>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Назва</label>
                <input required type="text" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ціна (₴)</label>
                <input required type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 font-medium p-3 rounded-xl">Скасувати</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-medium p-3 rounded-xl">Зберегти</button>
              </div>
              {editMode && (
                <button type="button" onClick={handleDeleteProduct} className="w-full mt-2 text-red-500 font-medium p-2 rounded-xl border border-red-100 hover:bg-red-50 transition-colors">
                  Видалити товар
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

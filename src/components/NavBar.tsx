import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, ShoppingCart, Users, TrendingUp } from 'lucide-react'

export default function NavBar() {
  // We swapped the 'Menu' icon out for the 'TrendingUp' icon to point to your new Reports page
  const navItems = [
    { name: 'Головна', path: '/', icon: LayoutDashboard },
    { name: 'Візити', path: '/check-in', icon: CheckSquare },
    { name: 'Продаж', path: '/sell', icon: ShoppingCart },
    { name: 'Клієнти', path: '/clients', icon: Users },
    { name: 'Звіти', path: '/reports', icon: TrendingUp }, 
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-6 h-6 mb-1" />
            {item.name}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

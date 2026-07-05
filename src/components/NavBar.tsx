import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CheckSquare, ShoppingCart, Users, TrendingUp, Menu } from 'lucide-react'

export default function NavBar() {
  const navItems = [
    { name: 'Головна', path: '/', icon: LayoutDashboard },
    { name: 'Візити', path: '/check-in', icon: CheckSquare },
    { name: 'Продаж', path: '/sell', icon: ShoppingCart },
    { name: 'Клієнти', path: '/clients', icon: Users },
    { name: 'Звіти', path: '/reports', icon: TrendingUp },
    { name: 'Більше', path: '/more', icon: Menu },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-40">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full text-[10px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="truncate w-full text-center">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'About', to: '/about' },
  { label: 'Messages', to: '/messages' },
  { label: 'FAQ', to: '/faq' },
]

export default function Nav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { totalItems } = useCart()

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <header className="fixed top-0 w-full z-50 bg-[#fdf8f6]/80 dark:bg-[#343230]/80 backdrop-blur-xl shadow-[0_32px_64px_rgba(52,50,48,0.06)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
        <Link
          to="/"
          className="text-2xl font-black text-[#D9A694] tracking-tighter font-['Plus_Jakarta_Sans']"
        >
          Joydotz
        </Link>

        <nav className="hidden md:flex gap-8 items-center font-['Plus_Jakarta_Sans'] font-bold tracking-tight">
          {navLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className={
                isActive(to)
                  ? 'text-[#D9A694] border-b-2 border-[#D9A694] pb-1 hover:opacity-100 hover:scale-105 transition-all'
                  : 'text-[#343230] dark:text-[#fdf8f6] opacity-70 hover:opacity-100 hover:scale-105 transition-all'
              }
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 text-[#D9A694]">
          <Link
            to="/cart"
            className="relative hover:opacity-100 hover:scale-105 transition-all active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center leading-none border-2 border-background">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>
          <Link
            to={user ? '/account' : '/login'}
            className="relative hover:opacity-100 hover:scale-105 transition-all active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined">account_circle</span>
            {user && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background" />
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

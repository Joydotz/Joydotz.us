import { useState, useEffect } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-brand-cream/90 backdrop-blur-md shadow-[0_1px_20px_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="font-display font-extrabold text-xl italic tracking-tight text-brand-dark select-none">
          joydotz
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {['Shop', 'About', 'Messages', 'FAQ'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="font-body text-sm font-medium text-brand-muted hover:text-brand-dark transition-colors duration-200"
            >
              {link}
            </a>
          ))}
          <a
            href="#shop"
            className="font-body text-sm font-medium bg-brand-blush text-brand-dark px-5 py-2 rounded-full hover:bg-[#e0b0a0] transition-colors duration-200"
          >
            shop now
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-[5px] p-2"
          aria-label="Menu"
        >
          <span
            className={`block w-5 h-[1.5px] bg-brand-dark transition-all duration-300 ${
              menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-brand-dark transition-all duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block w-5 h-[1.5px] bg-brand-dark transition-all duration-300 ${
              menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-400 ${
          menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        } bg-brand-cream/95 backdrop-blur-md border-t border-brand-blush/30`}
      >
        <div className="flex flex-col px-6 py-6 gap-5">
          {['Shop', 'About', 'Messages', 'FAQ'].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
              className="font-body text-base font-medium text-brand-muted hover:text-brand-dark transition-colors"
            >
              {link}
            </a>
          ))}
          <a
            href="#shop"
            onClick={() => setMenuOpen(false)}
            className="font-body text-sm font-medium bg-brand-blush text-brand-dark px-5 py-2.5 rounded-full text-center hover:bg-[#e0b0a0] transition-colors"
          >
            shop now
          </a>
        </div>
      </div>
    </nav>
  )
}

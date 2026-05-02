const items = [
  { icon: 'home', label: 'Home', active: true },
  { icon: 'storefront', label: 'Shop', active: false },
  { icon: 'chat_bubble', label: 'Messages', active: false },
  { icon: 'person', label: 'Profile', active: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 md:hidden bg-[#ffffff]/90 dark:bg-[#343230]/90 backdrop-blur-lg rounded-t-[3rem] z-50 shadow-[0_-10px_40px_rgba(52,50,48,0.04)] font-['Manrope'] text-[10px] font-semibold uppercase tracking-widest">
      {items.map(({ icon, label, active }) => (
        <a
          key={label}
          href="#"
          className={
            active
              ? 'flex flex-col items-center justify-center bg-[#D9A694]/10 text-[#D9A694] rounded-full px-5 py-2 hover:bg-[#D9A694]/5 active:scale-90 duration-300 ease-out'
              : 'flex flex-col items-center justify-center text-[#343230]/60 dark:text-[#fdf8f6]/60 hover:bg-[#D9A694]/5 active:scale-90 duration-300 ease-out'
          }
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="mt-1">{label}</span>
        </a>
      ))}
    </nav>
  )
}

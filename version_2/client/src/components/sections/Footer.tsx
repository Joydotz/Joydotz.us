const links = ['Instagram', 'TikTok', 'Privacy Policy', 'Terms of Service', 'Newsletter']

export default function Footer() {
  return (
    <footer className="w-full mt-20 bg-[#f8f2f0] dark:bg-[#2a2826] py-16 px-8 flex flex-col items-center text-center gap-8 font-['Manrope'] text-sm text-[#343230] dark:text-[#fdf8f6]">
      <div className="text-xl font-bold text-[#D9A694] mb-4">Joydotz</div>
      <div className="flex flex-wrap justify-center gap-8">
        {links.map((link) => (
          <a
            key={link}
            href="#"
            className="opacity-80 hover:opacity-100 hover:text-[#D9A694] transition-colors"
          >
            {link}
          </a>
        ))}
      </div>
      <p className="opacity-60">© 2024 Joydotz. The skin has phases, but joy remains.</p>
    </footer>
  )
}

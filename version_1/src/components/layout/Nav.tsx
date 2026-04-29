import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/messages", label: "Messages" },
  { to: "/faq", label: "FAQ" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      {/* Nav sits on the canvas — uses slightly deeper Pantone so it reads */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-joy-text/10"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="font-display text-2xl font-semibold text-joy-text hover:text-joy-text/70 transition-colors"
          >
            joydotz
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {links.slice(1).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-body text-sm transition-colors ${
                  pathname === link.to
                    ? "text-joy-text font-medium"
                    : "text-joy-text/65 hover:text-joy-text"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link
            to="/shop"
            className="hidden md:inline-flex btn-surface text-sm px-5 py-2.5 shadow-card"
          >
            shop now
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            aria-label="toggle menu"
            className="md:hidden flex flex-col items-center justify-center gap-[5px] w-10 h-10"
          >
            <span
              className={`block w-6 h-[1.5px] bg-joy-text origin-center transition-all duration-300 ${open ? "rotate-45 translate-y-[6.5px]" : ""}`}
            />
            <span
              className={`block w-6 h-[1.5px] bg-joy-text transition-all duration-300 ${open ? "opacity-0 scale-x-0" : ""}`}
            />
            <span
              className={`block w-6 h-[1.5px] bg-joy-text origin-center transition-all duration-300 ${open ? "-rotate-45 -translate-y-[6.5px]" : ""}`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col pt-24 px-8 pb-12"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <nav className="flex flex-col gap-6 flex-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`font-display text-3xl transition-colors ${
                    pathname === link.to ? "text-joy-text" : "text-joy-text/60"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link
              to="/shop"
              onClick={() => setOpen(false)}
              className="btn-surface text-center text-base py-4 shadow-card"
            >
              shop now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

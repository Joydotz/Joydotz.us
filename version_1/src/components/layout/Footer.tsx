import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t border-joy-text/10"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="flex flex-col gap-2">
          <span className="font-display text-xl font-semibold text-joy-text">
            joydotz
          </span>
          <p className="font-body text-sm text-joy-text/60 max-w-xs leading-relaxed">
            hydrocolloid spot patches.
            <br />a soft little layer of comfort and joy.
          </p>
        </div>

        <nav className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          {[
            ["/shop", "Shop"],
            ["/about", "About"],
            ["/messages", "Messages"],
            ["/faq", "FAQ"],
          ].map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className="font-body text-sm text-joy-text/60 hover:text-joy-text transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2 md:text-right">
          <div className="flex gap-4 md:justify-end">
            <a
              href="#"
              className="font-body text-sm text-joy-text/60 hover:text-joy-text transition-colors"
            >
              Instagram
            </a>
            <a
              href="#"
              className="font-body text-sm text-joy-text/60 hover:text-joy-text transition-colors"
            >
              TikTok
            </a>
          </div>
          <span className="font-body text-sm text-joy-text/60">joydotz.us</span>
        </div>
      </div>

      <div className="border-t border-joy-text/10 py-4 text-center">
        <span className="font-body text-xs text-joy-text/40">
          © 2025 joydotz. joy stays.
        </span>
      </div>
    </footer>
  );
}

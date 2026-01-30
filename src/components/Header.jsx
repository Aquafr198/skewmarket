import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 relative">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="32" height="32" rx="6" fill="#14151A"/>
        <path d="M10 12L22 12L20 16L8 16Z" fill="white"/>
        <path d="M12 18L24 18L22 22L10 22Z" fill="white" opacity="0.6"/>
      </svg>
    </div>
    <span className="text-base font-semibold text-skew-text-primary tracking-tight">SkewMarket</span>
  </div>
);

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: 'Features', href: '/#features', anchor: 'features' },
    { name: 'How it Works', href: '/#features', anchor: 'features' },
    { name: 'FAQ', href: '/#faq', anchor: 'faq' },
  ];

  const handleNavClick = (e, link) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/' + '#' + link.anchor);
      setTimeout(() => {
        document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-skew-border">
      <nav className="max-w-[1200px] mx-auto flex items-center justify-between h-14 px-4 lg:px-6">
        <Link to="/" className="z-50">
          <Logo />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="px-3 py-1.5 text-sm text-skew-text-secondary hover:text-skew-text-primary rounded-lg hover:bg-skew-bg-secondary transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        <Link
          to="/deals"
          onClick={() => window.scrollTo(0, 0)}
          className="hidden lg:flex btn-primary"
        >
          View Markets
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden z-50 flex flex-col gap-1.5 p-2"
        >
          <span className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? 'bg-skew-text-primary rotate-45 translate-y-2' : 'bg-skew-text-primary'}`} />
          <span className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? 'bg-skew-text-primary opacity-0' : 'bg-skew-text-primary'}`} />
          <span className={`w-5 h-0.5 transition-all duration-300 ${mobileMenuOpen ? 'bg-skew-text-primary -rotate-45 -translate-y-2' : 'bg-skew-text-primary'}`} />
        </button>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden fixed inset-0 top-14 bg-white z-40 px-6 py-8"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => { setMobileMenuOpen(false); handleNavClick(e, link); }}
                  className="text-lg font-medium text-skew-text-primary py-3 border-b border-skew-border"
                >
                  {link.name}
                </a>
              ))}
              <Link
                to="/deals"
                className="btn-primary mt-6 w-fit"
                onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
              >
                View Markets
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

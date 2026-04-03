import { useState, useEffect } from 'react';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import logo from '@/assets/logo/logo.png';
import logoWhite from '@/assets/logo/logo-white.png';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Events & Conferences', href: '/#conference' },
  { label: 'Jesse Falodun', href: '/about-jesse' },
  { label: 'Downloads', href: '/downloads' },
  { label: 'Connect', href: '/connect' },
];

export default function Navbar() {
  const { isDark, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href.startsWith('/#')) return location.pathname === '/';
    return location.pathname === href;
  };

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('/#') && location.pathname === '/') {
      const id = href.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderLink = (link: typeof navLinks[0], className: string) => {
    if (link.href.startsWith('/#')) {
      if (location.pathname === '/') {
        return (
          <a href={link.href.slice(1)} className={className} onClick={() => handleNavClick(link.href)}>
            {link.label}
          </a>
        );
      }
      return <Link to="/" className={className}>{link.label}</Link>;
    }
    return <Link to={link.href} className={className}>{link.label}</Link>;
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-[999] backdrop-blur-[20px] border-b transition-all duration-300 ${
          scrolled ? 'border-border shadow-[var(--shadow-base)]' : 'border-transparent'
        }`}
        style={{ background: `hsl(var(--nav-bg))` }}
      >
        <div className="flex items-center justify-between h-[70px] max-w-[1160px] mx-auto px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={isDark ? logoWhite : logo} alt="Cherubs Cove Ministry Logo" className="h-10 w-10 rounded-full object-contain" />
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold tracking-[1.5px] uppercase text-foreground">Cherubs Cove</div>
              <div className="text-[9.5px] font-normal tracking-[3.5px] uppercase text-gold">The Making Place</div>
            </div>
          </Link>

          <ul className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <li key={link.href}>
                {renderLink(
                  link,
                  `nav-link-underline px-3 py-2 rounded-md text-[11px] font-bold tracking-[1.2px] uppercase transition-all duration-250 ${
                    isActive(link.href)
                      ? 'text-primary bg-orange-soft'
                      : 'text-muted-foreground hover:text-primary hover:bg-orange-soft'
                  }`
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <button onClick={toggle} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground transition-all duration-250 hover:border-primary hover:text-primary hover:bg-orange-soft" aria-label="Toggle dark mode">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link to="/register" className="hidden lg:inline-block btn-solid-custom text-[10.5px] tracking-[2px]">
              Register
            </Link>
            <button className="lg:hidden w-9 h-9 rounded-md border border-border flex items-center justify-center text-foreground transition-colors hover:border-primary hover:text-primary" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-[998] bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile menu */}
      <div className={`fixed top-[70px] left-0 right-0 z-[998] border-b border-border bg-card transition-all duration-300 lg:hidden ${mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'}`}>
        <div className="flex flex-col p-6 max-h-[calc(100vh-70px)] overflow-y-auto">
          {navLinks.map((link, i) => (
            <div key={link.href} className={`py-4 ${i < navLinks.length - 1 ? 'border-b border-border' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
              {renderLink(
                link,
                `text-[12px] font-bold tracking-[2px] uppercase transition-colors duration-200 ${
                  isActive(link.href) ? 'text-primary' : 'text-foreground hover:text-primary'
                }`
              )}
            </div>
          ))}
          <Link to="/register" className="mt-4 btn-solid-custom text-center" onClick={() => setMobileOpen(false)}>
            Register Now →
          </Link>
        </div>
      </div>
    </>
  );
}

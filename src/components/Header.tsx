import { useState } from 'react';
import {
  Bell,
  Bot,
  Globe,
  Menu,
  Moon,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import { PWAInstallButton } from './PWAInstallPrompt.tsx';

export function Header() {
  const {
    lang,
    toggleLang,
    theme,
    toggleTheme,
    route,
    navigate,
    storeSettings,
    firebaseUser,
    isAdminOrStaff,
    isTrainerOrStaff,
    signInWithGoogle,
    authLoading,
    cartCount,
    setCartOpen,
    unreadNotificationsCount,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pathname = route.split('?')[0] || '/';

  const navItems = [
    { path: '/', label: t(lang, 'الرئيسية', 'Home') },
    { path: '/catalog', label: t(lang, 'المتجر', 'Store') },
    { path: '/planner', label: t(lang, 'مخطط الشبكات', 'Planner') },
    { path: '/academy', label: t(lang, 'الأكاديمية', 'Academy') },
    { path: '/community', label: t(lang, 'المجتمع والمختبر', 'Community & Lab') },
    { path: '/market', label: t(lang, 'مؤشر السوق', 'Market') },
    { path: '/offers', label: t(lang, 'العروض', 'Offers') },
  ];

  const mobileAllItems = [
    ...navItems,
    { path: '/assistant', label: t(lang, 'المساعد الذكي والبحث بالكاميرا', 'AI Assistant & Camera') },
    { path: '/track', label: t(lang, 'تتبع الحجز', 'Track Reservation') },
    { path: '/account', label: t(lang, 'حسابي وهويتي المهنية', 'Account & Engineer ID') },
  ];

  const handlePrimaryAction = async () => {
    if (isTrainerOrStaff) {
      navigate('/admin');
      return;
    }
    if (firebaseUser) {
      navigate('/account');
      return;
    }
    await signInWithGoogle();
  };

  return (
    <div className="sticky top-0 z-40">
      {/* Slim announcement + language/phone bar */}
      {storeSettings.showAnnouncement !== false && (
        <div className="bg-[#0E0E10] text-neutral-200 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between gap-4 text-xs">
            <p className="truncate text-neutral-300">
              {lang === 'ar'
                ? storeSettings.announcementAr
                : storeSettings.announcementEn}
            </p>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/track')}
                className="hidden sm:inline-flex text-neutral-300 hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
              >
                {t(lang, 'تتبع الطلب', 'Track Order')}
              </button>
              <a
                href={`tel:${storeSettings.phones?.[0] || '770581056'}`}
                className="hidden md:inline-flex items-center gap-1.5 text-[#D4AF37] hover:text-white transition-colors whitespace-nowrap font-mono-num"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{storeSettings.phones?.[0] || '770581056'}</span>
              </a>
              <PWAInstallButton variant="header" />
              <button
                type="button"
                onClick={toggleLang}
                className="inline-flex items-center gap-1.5 text-white hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer font-medium"
                aria-label="Switch language"
              >
                <Globe className="w-3.5 h-3.5 text-[#C89D3C]" />
                <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict 3-zone Top Bar */}
      <header className="bg-white/95 dark:bg-[#141418]/95 backdrop-blur-md border-b border-[#E5E5E0] dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-[#0E0E10] dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rotate-45 bg-[#C89D3C] inline-block shrink-0" aria-hidden="true" />
            <span className="font-display">
              {lang === 'ar' ? storeSettings.storeNameAr : storeSettings.storeNameEn}
            </span>
          </a>

          {/* Zone 2: Concise single-line desktop nav links */}
          <nav className="hidden lg:flex items-center gap-5 text-[13px] font-medium text-neutral-600 dark:text-neutral-300">
            {navItems.map((item) => {
              const active = pathname === item.path;
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-[#0E0E10] dark:text-[#D4AF37] border-[#C89D3C] font-semibold'
                      : 'border-transparent hover:text-[#0E0E10] dark:hover:text-white hover:border-neutral-300 dark:hover:border-white/25'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Compact utility tools + Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/assistant')}
              title={t(lang, 'المساعد الذكي والبحث بالكاميرا', 'AI Assistant & Camera Search')}
              aria-label={t(lang, 'المساعد الذكي والبحث بالكاميرا', 'AI Assistant & Camera Search')}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                pathname === '/assistant'
                  ? 'border-[#C89D3C] bg-[#FAF5E8] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37]'
                  : 'border-[#E5E5E0] dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C]'
              }`}
            >
              <Bot className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/account')}
              title={t(lang, 'التنبيهات والإشعارات', 'Alerts & Notifications')}
              aria-label={t(lang, 'التنبيهات والإشعارات', 'Alerts & Notifications')}
              className="relative p-2 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C] transition-colors cursor-pointer hidden sm:inline-flex"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono-num flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              title={t(lang, 'سلة المشتريات والمشاريع', 'Project Cart')}
              aria-label={t(lang, 'سلة المشتريات والمشاريع', 'Project Cart')}
              className="relative p-2 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 px-1 min-w-[18px] h-[18px] rounded-full bg-[#C89D3C] text-[#0E0E10] text-[10px] font-bold font-mono-num flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? t(lang, 'الوضع النهاري', 'Light Mode') : t(lang, 'الوضع الليلي', 'Dark Mode')}
              aria-label={t(lang, 'تبديل المظهر', 'Toggle Theme')}
              className="p-2 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-neutral-700 dark:text-[#D4AF37] hover:border-[#C89D3C] transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={authLoading && !firebaseUser}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#1E1E24] dark:hover:bg-[#D4AF37] border border-[#C89D3C]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
            >
              {isTrainerOrStaff && <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] dark:text-[#0E0E10]" />}
              <span>
                {isAdminOrStaff
                  ? t(lang, 'الإدارة', 'Admin')
                  : isTrainerOrStaff
                  ? t(lang, 'المدرب', 'Trainer')
                  : firebaseUser
                  ? t(lang, 'حسابي', 'Account')
                  : authLoading
                  ? t(lang, 'دخول...', 'Signing in...')
                  : t(lang, 'دخول', 'Sign In')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-[#0E0E10] dark:text-white hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#141418] border-t border-[#E5E5E0] dark:border-white/10 px-4 py-3 space-y-1">
            {mobileAllItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  pathname === item.path
                    ? 'bg-[#FAF5E8] dark:bg-[#C89D3C]/20 text-[#0E0E10] dark:text-[#D4AF37] font-semibold'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            {storeSettings.showAnnouncement === false && (
              <button
                type="button"
                onClick={() => {
                  toggleLang();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-start px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer"
              >
                {lang === 'ar' ? 'English' : 'العربية'}
              </button>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

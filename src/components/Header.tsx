import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bot,
  ChevronDown,
  Globe,
  GraduationCap,
  Home,
  Layers,
  Menu,
  Moon,
  Network,
  PackageSearch,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Store,
  Sun,
  Tag,
  TrendingUp,
  User,
  Users,
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
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesMenuRef = useRef<HTMLDivElement | null>(null);

  const pathname = route.split('?')[0] || '/';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setServicesOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const primaryLinks = [
    { path: '/', label: t(lang, 'الرئيسية', 'Home'), icon: Home },
    { path: '/catalog', label: t(lang, 'المتجر', 'Store'), icon: Store },
    { path: '/offers', label: t(lang, 'العروض', 'Offers'), icon: Tag },
    { path: '/track', label: t(lang, 'الطلبات', 'Orders'), icon: PackageSearch },
  ];

  const serviceLinks = [
    {
      path: '/planner',
      icon: Network,
      ar: 'مخطط الشبكات الذكي',
      en: 'Smart Network Planner',
      descAr: 'تصميم مشروعك وحساب الكميات للسلة',
      descEn: 'Design BOM & add bundle to cart',
    },
    {
      path: '/planner?tab=packages',
      icon: Layers,
      ar: 'باقات المشاريع الجاهزة',
      en: 'Ready Project Packages',
      descAr: 'باقات ISP، كاميرات، فنادق وسيرفرات',
      descEn: 'Turnkey ISP, CCTV & Server kits',
    },
    {
      path: '/assistant',
      icon: Bot,
      ar: 'المساعد الذكي والكاميرا',
      en: 'AI Engineer & Camera Search',
      descAr: 'تعرف على الأجهزة بالصورة وتشخيص الأعطال',
      descEn: 'Device photo scan & troubleshooting',
    },
    {
      path: '/community',
      icon: Users,
      ar: 'مجتمع المهندسين والمختبر',
      en: 'Community & Tech Lab',
      descAr: 'دليل المهندسين وسكربتات RouterOS',
      descEn: 'Engineers directory & RouterOS scripts',
    },
    {
      path: '/market',
      icon: TrendingUp,
      ar: 'مؤشر السوق والحاسبات',
      en: 'Market Index & Subnet Calcs',
      descAr: 'حركة الأسعار وحاسبات PoE وSubnet',
      descEn: 'Price tracker & PoE / IP calculators',
    },
  ];

  const isServiceActive =
    pathname.startsWith('/planner') ||
    pathname.startsWith('/assistant') ||
    pathname.startsWith('/community') ||
    pathname.startsWith('/market');

  const isAcademyActive = pathname.startsWith('/academy');

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
        <div className="bg-[#0E0E10] text-neutral-200 border-b border-[#C89D3C]/20">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-8 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
            <p className="truncate text-neutral-300">
              {lang === 'ar'
                ? storeSettings.announcementAr
                : storeSettings.announcementEn}
            </p>
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
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
                className="inline-flex items-center gap-1.5 text-white hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer font-semibold py-1"
                aria-label="Switch language"
              >
                <Globe className="w-3.5 h-3.5 text-[#C89D3C]" />
                <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Navigation Bar */}
      <header className="bg-white/95 dark:bg-[#141418]/95 backdrop-blur-md border-b border-[#E5E3DA] dark:border-white/10 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[68px] flex items-center justify-between gap-3 lg:gap-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="text-base sm:text-lg font-extrabold tracking-tight text-[#0E0E10] dark:text-white whitespace-nowrap shrink-0 flex items-center gap-2.5 py-1"
          >
            <span
              className="w-3 h-3 rotate-45 bg-gradient-to-br from-[#E2BF59] to-[#9E7822] inline-block shrink-0 shadow-xs"
              aria-hidden="true"
            />
            <span className="font-display">
              {lang === 'ar' ? storeSettings.storeNameAr : storeSettings.storeNameEn}
            </span>
          </a>

          {/* Zone 2: Reordered Priority Navigation + Ultra-Prominent Royal Academy Spotlight */}
          <nav
            aria-label={t(lang, 'القائمة الرئيسية', 'Main navigation')}
            className="hidden lg:flex items-center gap-1.5 xl:gap-2"
          >
            {/* 1. Home & 2. Store */}
            {primaryLinks.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const active =
                item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                    active
                      ? 'bg-[#0E0E10] dark:bg-[#C89D3C]/20 text-white dark:text-[#D4AF37] border border-[#0E0E10] dark:border-[#C89D3C]/50 shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-[#F3F1EA] dark:hover:bg-white/5 hover:text-[#0E0E10] dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </a>
              );
            })}

            {/* 3. ULTRA-PROMINENT ASEMA ACADEMY SPOTLIGHT WITH ROYAL GOLD HALO + NEW BADGE */}
            <a
              href="/academy"
              onClick={(e) => {
                e.preventDefault();
                navigate('/academy');
              }}
              className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-extrabold whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
                isAcademyActive
                  ? 'bg-gradient-to-l from-[#D4AF37] via-[#C89D3C] to-[#B68B29] text-[#0E0E10] border-[#D4AF37] shadow-md shadow-[#C89D3C]/30'
                  : 'bg-[#FAF4E1] dark:bg-[#C89D3C]/15 text-[#0E0E10] dark:text-[#F0CF6E] border-[#C89D3C]/75 hover:border-[#C89D3C] hover:bg-[#F4E7C1] dark:hover:bg-[#C89D3C]/25 shadow-sm shadow-[#C89D3C]/15'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  isAcademyActive
                    ? 'bg-[#0E0E10] text-[#D4AF37]'
                    : 'academy-royal-ring'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
              </span>
              <span>{t(lang, 'الأكاديمية', 'Academy')}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold leading-none tracking-tight ${
                  isAcademyActive
                    ? 'bg-[#0E0E10] text-[#D4AF37]'
                    : 'bg-[#C89D3C] text-[#0E0E10]'
                }`}
              >
                {lang === 'ar' ? 'جديد' : 'NEW'}
              </span>
            </a>

            {/* 4. Offers & 5. Orders Tracking */}
            {primaryLinks.slice(2).map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                    active
                      ? 'bg-[#0E0E10] dark:bg-[#C89D3C]/20 text-white dark:text-[#D4AF37] border border-[#0E0E10] dark:border-[#C89D3C]/50 shadow-xs'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-[#F3F1EA] dark:hover:bg-white/5 hover:text-[#0E0E10] dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </a>
              );
            })}

            {/* 6. Services Hub Quick Menu */}
            <div ref={servicesMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setServicesOpen((v) => !v)}
                aria-expanded={servicesOpen}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer border ${
                  isServiceActive || servicesOpen
                    ? 'bg-[#FAF4E1] dark:bg-[#C89D3C]/15 text-[#8A6414] dark:text-[#D4AF37] border-[#C89D3C]/55'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-[#F3F1EA] dark:hover:bg-white/5 border-transparent'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>{t(lang, 'الخدمات', 'Services')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    servicesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {servicesOpen && (
                <div className="absolute top-full mt-2 end-0 w-80 bg-white dark:bg-[#17171B] border border-[#E5E3DA] dark:border-white/15 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  {serviceLinks.map((srv) => {
                    const Icon = srv.icon;
                    const srvActive =
                      srv.path.includes('?tab=packages')
                        ? route === '/planner?tab=packages'
                        : pathname.startsWith(srv.path);
                    return (
                      <button
                        key={srv.path}
                        type="button"
                        onClick={() => {
                          navigate(srv.path);
                          setServicesOpen(false);
                        }}
                        className={`w-full text-start p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                          srvActive
                            ? 'bg-[#FAF4E1] dark:bg-[#C89D3C]/15 border border-[#C89D3C]/45'
                            : 'hover:bg-[#F8F8F7] dark:hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className="icon-box-royal !w-9 !h-9 !rounded-lg">
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0E0E10] dark:text-white">
                            {lang === 'ar' ? srv.ar : srv.en}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {lang === 'ar' ? srv.descAr : srv.descEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Touch-Friendly Utility Controls + Primary Account/Sign In CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/assistant')}
              title={t(lang, 'المساعد الذكي والبحث بالكاميرا', 'AI Assistant & Camera Search')}
              aria-label={t(lang, 'المساعد الذكي والبحث بالكاميرا', 'AI Assistant & Camera Search')}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                pathname === '/assistant'
                  ? 'border-[#C89D3C] bg-[#FAF4E1] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37]'
                  : 'border-[#E5E3DA] dark:border-white/10 bg-[#F8F8F7] dark:bg-white/5 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C]'
              }`}
            >
              <Bot className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/account')}
              title={t(lang, 'التنبيهات والإشعارات', 'Alerts & Notifications')}
              aria-label={t(lang, 'التنبيهات والإشعارات', 'Alerts & Notifications')}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#E5E3DA] dark:border-white/10 bg-[#F8F8F7] dark:bg-white/5 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C] transition-all active:scale-95 cursor-pointer hidden sm:inline-flex items-center justify-center"
            >
              <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono-num flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              title={t(lang, 'سلة المشتريات والمشاريع', 'Project Cart')}
              aria-label={t(lang, 'سلة المشتريات والمشاريع', 'Project Cart')}
              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#E5E3DA] dark:border-white/10 bg-[#F8F8F7] dark:bg-white/5 text-neutral-700 dark:text-neutral-200 hover:border-[#C89D3C] transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center"
            >
              <ShoppingCart className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1 min-w-[18px] h-[18px] rounded-full bg-[#C89D3C] text-[#0E0E10] text-[10px] font-extrabold font-mono-num flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              title={
                theme === 'dark'
                  ? t(lang, 'الوضع النهاري', 'Light Mode')
                  : t(lang, 'الوضع الليلي', 'Dark Mode')
              }
              aria-label={t(lang, 'تبديل المظهر', 'Toggle Theme')}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#E5E3DA] dark:border-white/10 bg-[#F8F8F7] dark:bg-white/5 text-neutral-700 dark:text-[#D4AF37] hover:border-[#C89D3C] transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              ) : (
                <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              )}
            </button>

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={authLoading && !firebaseUser}
              className="min-h-[42px] sm:min-h-[44px] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] dark:hover:bg-[#D4AF37] border border-[#C89D3C]/45 shadow-sm transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
            >
              {isTrainerOrStaff ? (
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] dark:text-[#0E0E10]" />
              ) : (
                <User className="w-4 h-4 text-[#D4AF37] dark:text-[#0E0E10]" />
              )}
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
              className="lg:hidden w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#E5E3DA] dark:border-white/10 bg-[#F8F8F7] dark:bg-white/5 text-[#0E0E10] dark:text-white hover:border-[#C89D3C] flex items-center justify-center active:scale-95 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Full Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-[#141418] border-t border-[#E5E3DA] dark:border-white/10 px-4 py-4 space-y-3 max-h-[75vh] overflow-y-auto">
            {/* Highlighted Academy Spotlight Card in Mobile Drawer */}
            <button
              type="button"
              onClick={() => {
                navigate('/academy');
                setMobileMenuOpen(false);
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-l from-[#0E0E10] to-[#1A1812] text-white border border-[#C89D3C]/70 flex items-center justify-between gap-3 shadow-md cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 text-start">
                <span className="w-11 h-11 rounded-xl bg-[#C89D3C] text-[#0E0E10] flex items-center justify-center shrink-0 shadow-md shadow-[#C89D3C]/30">
                  <GraduationCap className="w-6 h-6" />
                </span>
                <div>
                  <div className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{t(lang, 'أكاديمية عاصمة الشبكات', 'ASEMA Academy')}</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#D4AF37] text-[#0E0E10] text-[10px] font-extrabold">
                      {lang === 'ar' ? 'جديد' : 'NEW'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#E8C975] mt-0.5">
                    {t(
                      lang,
                      'دورات، اختبارات، جوائز وشهادات معتمدة',
                      'Courses, quizzes, prizes & certificates'
                    )}
                  </p>
                </div>
              </div>
            </button>

            {/* Primary Sections Grid */}
            <div className="grid grid-cols-2 gap-2">
              {primaryLinks.map((item) => {
                const Icon = item.icon;
                const active =
                  item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-colors ${
                      active
                        ? 'bg-[#FAF4E1] dark:bg-[#C89D3C]/20 border-[#C89D3C] text-[#0E0E10] dark:text-[#D4AF37]'
                        : 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E3DA] dark:border-white/10 text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#C89D3C] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Services Quick Access */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 px-1">
                {t(lang, 'الخدمات والأدوات الهندسية', 'Smart Services & Tools')}
              </div>
              <div className="space-y-1.5">
                {serviceLinks.map((srv) => {
                  const Icon = srv.icon;
                  return (
                    <button
                      key={srv.path}
                      type="button"
                      onClick={() => {
                        navigate(srv.path);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full min-h-[46px] text-start px-3 py-2 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E3DA] dark:border-white/10 hover:border-[#C89D3C] flex items-center gap-3 cursor-pointer active:scale-[0.99]"
                    >
                      <Icon className="w-4 h-4 text-[#C89D3C] shrink-0" />
                      <span className="text-xs font-semibold text-[#0E0E10] dark:text-white">
                        {lang === 'ar' ? srv.ar : srv.en}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    navigate('/account');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[46px] text-start px-3 py-2 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E3DA] dark:border-white/10 hover:border-[#C89D3C] flex items-center gap-3 cursor-pointer active:scale-[0.99]"
                >
                  <User className="w-4 h-4 text-[#C89D3C] shrink-0" />
                  <span className="text-xs font-semibold text-[#0E0E10] dark:text-white">
                    {t(lang, 'حسابي وهويتي المهنية والمفضلة', 'My Account, Engineer ID & Wishlist')}
                  </span>
                </button>
              </div>
            </div>

            {storeSettings.showAnnouncement === false && (
              <button
                type="button"
                onClick={() => {
                  toggleLang();
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-start px-3 py-2.5 rounded-xl border border-[#E5E3DA] dark:border-white/10 text-sm font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer"
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

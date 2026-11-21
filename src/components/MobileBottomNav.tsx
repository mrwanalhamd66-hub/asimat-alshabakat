import { GraduationCap, Home, PackageSearch, Store, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';

export function MobileBottomNav() {
  const { lang, route, navigate } = useApp();
  const pathname = route.split('?')[0] || '/';

  const items = [
    {
      path: '/',
      icon: Home,
      ar: 'الرئيسية',
      en: 'Home',
      isAcademy: false,
    },
    {
      path: '/catalog',
      icon: Store,
      ar: 'المتجر',
      en: 'Store',
      isAcademy: false,
    },
    {
      path: '/academy',
      icon: GraduationCap,
      ar: 'الأكاديمية',
      en: 'Academy',
      isAcademy: true,
    },
    {
      path: '/offers',
      icon: Tag,
      ar: 'العروض',
      en: 'Offers',
      isAcademy: false,
    },
    {
      path: '/track',
      icon: PackageSearch,
      ar: 'الطلبات',
      en: 'Orders',
      isAcademy: false,
    },
  ];

  return (
    <nav
      aria-label={t(lang, 'التنقل السريع للهاتف', 'Mobile quick navigation')}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#141418]/95 backdrop-blur-md border-t border-[#E5E3DA] dark:border-white/10 shadow-[0_-4px_20px_rgba(14,14,16,0.06)]"
    >
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);

          if (item.isAcademy) {
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center min-h-[52px] px-1 cursor-pointer active:scale-95 transition-transform"
              >
                <span
                  className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    active
                      ? 'bg-[#C89D3C] text-[#0E0E10] shadow-md shadow-[#C89D3C]/35 ring-2 ring-[#D4AF37]'
                      : 'academy-royal-ring'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="absolute -top-1.5 -end-2 px-1 py-[1px] rounded bg-[#0E0E10] dark:bg-[#D4AF37] text-[#D4AF37] dark:text-[#0E0E10] text-[8px] font-extrabold leading-none border border-[#C89D3C]/60">
                    {lang === 'ar' ? 'جديد' : 'NEW'}
                  </span>
                </span>
                <span
                  className={`text-[10px] mt-0.5 font-extrabold whitespace-nowrap ${
                    active
                      ? 'text-[#9E7822] dark:text-[#D4AF37]'
                      : 'text-[#8E691B] dark:text-[#E2BF59]'
                  }`}
                >
                  {lang === 'ar' ? item.ar : item.en}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center min-h-[50px] px-1 rounded-xl cursor-pointer active:scale-95 transition-colors ${
                active
                  ? 'text-[#0E0E10] dark:text-[#D4AF37] font-bold'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-[#0E0E10] dark:hover:text-white'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  active ? 'bg-[#FAF3DD] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37]' : ''
                }`}
              >
                <Icon className="w-[19px] h-[19px]" />
              </span>
              <span className="text-[10px] mt-0.5 whitespace-nowrap">
                {lang === 'ar' ? item.ar : item.en}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

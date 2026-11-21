import { MapPin, MessageCircle, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import { PWAInstallButton } from './PWAInstallPrompt.tsx';

export function Footer() {
  const { lang, navigate, storeSettings } = useApp();

  return (
    <footer className="bg-[#0E0E10] text-neutral-300 border-t border-[#C89D3C]/25 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-[#C89D3C] inline-block" aria-hidden="true" />
            <span className="text-xl font-bold text-white font-display">
              {lang === 'ar'
                ? `${storeSettings.storeNameAr} | ${storeSettings.storeNameEn}`
                : `${storeSettings.storeNameEn} | ${storeSettings.storeNameAr}`}
            </span>
          </div>
          <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
            {lang === 'ar' ? storeSettings.sloganAr : storeSettings.sloganEn}
          </p>
          <div className="flex items-start gap-2 text-sm text-neutral-300 pt-2">
            <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>{lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            {t(lang, 'منصة عاصمة الشبكات', 'Platform Modules')}
          </h3>
          <ul className="grid grid-cols-2 md:grid-cols-1 gap-2 text-xs sm:text-sm text-neutral-400">
            {[
              { path: '/catalog', ar: 'كتالوج المنتجات', en: 'Hardware Catalog' },
              { path: '/planner', ar: 'مخطط الشبكات والباقات', en: 'Network Planner & Packages' },
              { path: '/assistant', ar: 'المساعد الذكي والكاميرا', en: 'AI Assistant & Camera' },
              { path: '/academy', ar: 'أكاديمية عاصمة الشبكات', en: 'ASEMA Academy' },
              { path: '/community', ar: 'مجتمع المهندسين والمختبر', en: 'Community & Lab' },
              { path: '/market', ar: 'مؤشر السوق الذكي', en: 'Market Index' },
              { path: '/offers', ar: 'مركز العروض', en: 'Offers Center' },
              { path: '/track', ar: 'تتبع الحجز', en: 'Track Reservation' },
              { path: '/admin', ar: 'مركز الإدارة الخاص', en: 'Admin Control Center' },
            ].map((link) => (
              <li key={link.path}>
                <button
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="hover:text-[#D4AF37] transition-colors cursor-pointer text-start"
                >
                  {lang === 'ar' ? link.ar : link.en}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            {t(lang, 'التواصل المباشر', 'Direct Contact')}
          </h3>
          <div className="space-y-2 text-sm">
            {(storeSettings.phones || ['770581056', '774828709', '778060590']).map((phone) => (
              <a
                key={phone}
                href={`tel:${phone}`}
                className="flex items-center gap-2 text-neutral-300 hover:text-[#D4AF37] transition-colors font-mono-num"
              >
                <Phone className="w-3.5 h-3.5 text-[#C89D3C]" />
                <span>{phone}</span>
              </a>
            ))}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href={`https://wa.me/${storeSettings.whatsappNumber || '967770581056'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C89D3C]/15 border border-[#C89D3C]/40 text-[#D4AF37] hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors text-xs font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t(lang, 'تواصل عبر واتساب', 'WhatsApp Support')}</span>
              </a>
              <PWAInstallButton variant="footer" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
          <span>
            © {new Date().getFullYear()} {storeSettings.storeNameEn} — {storeSettings.storeNameAr}
          </span>
          <span>
            {t(lang, 'صنعاء، الجمهورية اليمنية · شارع صقر', "Sana'a, Republic of Yemen · Saqr Street")}
          </span>
        </div>
      </div>
    </footer>
  );
}

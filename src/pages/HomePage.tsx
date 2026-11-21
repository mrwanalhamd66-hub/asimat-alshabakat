import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Cable,
  Camera,
  CheckCircle2,
  Cpu,
  GraduationCap,
  Layers,
  MapPin,
  MessageCircle,
  Network,
  Phone,
  Radio,
  Search,
  Server,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { OFFER_SECTION_LABELS, formatCurrency, t } from '../i18n/translations.ts';
import {
  isAdCurrentlyActive,
  isOfferCurrentlyActive,
} from '../services/firestoreService.ts';
import type { HomepageSection } from '../types/index.ts';
import { CountdownTimer } from '../components/CountdownTimer.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { PaymentMethodsCard } from '../components/PaymentMethodsCard.tsx';
import { PWAInstallButton } from '../components/PWAInstallPrompt.tsx';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Server,
  Wifi,
  Cpu,
  Radio,
  Network,
  Cable,
};

export function HomePage() {
  const {
    lang,
    navigate,
    products,
    categories,
    brands,
    offers,
    ads,
    homepageSections,
    storeSettings,
    setSelectedProduct,
    setSearchQuery,
    setSelectedCategoryFilter,
    setSelectedBrandFilter,
  } = useApp();

  const [heroSearch, setHeroSearch] = useState('');
  const [heroTilt, setHeroTilt] = useState({ rx: 0, ry: 0 });
  const [popupAdDismissed, setPopupAdDismissed] = useState(false);
  const [dwellReached, setDwellReached] = useState(false);

  // Compliance: Never show promotional popup on immediate arrival; require >= 10s dwell
  useEffect(() => {
    const timer = window.setTimeout(() => setDwellReached(true), 11000);
    return () => window.clearTimeout(timer);
  }, []);

  const activeOffers = offers.filter(isOfferCurrentlyActive);
  const activeAds = ads.filter(isAdCurrentlyActive);
  const popupAd = activeAds.find((a) => a.adType === 'popup_ad');

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(heroSearch);
    navigate('/catalog');
  };

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const renderSection = (sec: HomepageSection) => {
    if (!sec.isEnabled) return null;

    switch (sec.sectionType) {
      case 'hero': {
        return (
          <React.Fragment key={sec.id}>
            <section className="bg-[#0E0E10] text-white border-b border-[#C89D3C]/25">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                  <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#D4AF37]">
                    <span className="w-2 h-2 rotate-45 bg-[#D4AF37] inline-block" aria-hidden="true" />
                    <span>
                      {lang === 'ar'
                        ? 'عاصمة الشبكات · صنعاء، اليمن'
                        : "ASEMA NETWORKS · SANA'A, YEMEN"}
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-balance font-display">
                    {lang === 'ar' ? sec.titleAr : sec.titleEn}
                  </h1>

                  <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-xl">
                    {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                  </p>

                  {/* Functional Search Bar */}
                  <form
                    onSubmit={handleHeroSearchSubmit}
                    className="flex items-center bg-[#17171B] border border-white/15 focus-within:border-[#C89D3C] rounded-xl p-1.5 max-w-xl"
                  >
                    <Search className="w-4 h-4 text-neutral-400 mx-3 shrink-0" />
                    <input
                      type="text"
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                      placeholder={t(
                        lang,
                        'ابحث عن مايكروتك، راوتر Wi-Fi 6، سويتش PoE، رقم الموديل...',
                        'Search MikroTik, Wi-Fi 6 router, PoE switch, model number...'
                      )}
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none py-2.5"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] px-5 py-2 rounded-lg bg-gradient-to-l from-[#D4AF37] to-[#C89D3C] text-[#0E0E10] text-xs sm:text-sm font-bold hover:brightness-105 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t(lang, 'بحث', 'Search')}
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/planner')}
                      className="btn-royal"
                    >
                      <Network className="w-4 h-4" />
                      <span>{t(lang, 'خطط مشروع شبكتك', 'Plan Your Network Project')}</span>
                      <ArrowIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(sec.ctaLink || '/catalog')}
                      className="min-h-[46px] px-5 py-3 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-[#C89D3C] font-bold text-sm active:scale-[0.98] transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        {lang === 'ar'
                          ? sec.ctaTextAr || 'تصفح المعدات'
                          : sec.ctaTextEn || 'Browse Catalog'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/assistant?tab=camera')}
                      className="min-h-[46px] px-4 py-3 rounded-xl border border-white/20 text-white hover:border-[#C89D3C] hover:text-[#D4AF37] text-sm font-semibold active:scale-[0.98] transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-[#D4AF37]" />
                      <span>{t(lang, 'البحث بالكاميرا', 'Camera Search')}</span>
                    </button>
                    <PWAInstallButton variant="hero" />
                  </div>
                </div>

                {/* 3D Interactive Hardware Stage */}
                <div
                  className="lg:col-span-6 product-3d-stage flex items-center"
                  onPointerMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    setHeroTilt({ rx: -y * 8, ry: x * 10 });
                  }}
                  onPointerLeave={() => setHeroTilt({ rx: 0, ry: 0 })}
                >
                  <div
                    className="product-3d-card w-full h-full min-h-[260px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-[#C89D3C]/35 bg-[#17171B] relative shadow-2xl"
                    style={{
                      transform: `rotateX(${heroTilt.rx}deg) rotateY(${heroTilt.ry}deg)`,
                    }}
                  >
                    <ResilientImage
                      src={sec.imageUrl}
                      alt={lang === 'ar' ? sec.titleAr : sec.titleEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-5 inset-x-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#D4AF37] font-semibold">
                          {t(lang, 'حجز مباشر · تسليم فوري في صنعاء', 'Direct Booking · Ready in Sanaa')}
                        </p>
                        <p className="text-sm font-semibold text-white mt-0.5">
                          {t(lang, 'MikroTik · Ubiquiti · OpenWrt · Wi-Fi 6', 'MikroTik · Ubiquiti · OpenWrt · Wi-Fi 6')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CAPITAL NETWORKS SMART TECH PLATFORM 6-Module Strip */}
              <div className="border-t border-white/10 bg-[#141418]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      path: '/planner',
                      icon: Network,
                      ar: 'مخطط الشبكات الذكي',
                      en: 'Smart Planner',
                      subAr: 'قائمة أجهزة وسلة بضغطة',
                      subEn: 'Live BOM & 1-click cart',
                      isAcademy: false,
                    },
                    {
                      path: '/planner?tab=packages',
                      icon: Layers,
                      ar: 'باقات المشاريع الجاهزة',
                      en: 'Project Packages',
                      subAr: 'ISP · CCTV · فنادق',
                      subEn: 'ISP · CCTV · SMB Bundles',
                      isAcademy: false,
                    },
                    {
                      path: '/assistant',
                      icon: Bot,
                      ar: 'المساعد والكاميرا الذكية',
                      en: 'AI Engineer & Cam',
                      subAr: 'تشخيص وتعرف بالصور',
                      subEn: 'Catalog-grounded AI',
                      isAcademy: false,
                    },
                    {
                      path: '/academy',
                      icon: GraduationCap,
                      ar: 'أكاديمية عاصمة الشبكات',
                      en: 'ASEMA Academy',
                      subAr: 'دورات، مسابقات وشهادات',
                      subEn: 'Courses, Prizes & Certs',
                      isAcademy: true,
                    },
                    {
                      path: '/community',
                      icon: Users,
                      ar: 'المجتمع والمختبر',
                      en: 'Community & Lab',
                      subAr: 'سكربتات ودليل مهندسين',
                      subEn: 'Scripts & Engineers',
                      isAcademy: false,
                    },
                    {
                      path: '/market',
                      icon: TrendingUp,
                      ar: 'مؤشر السوق والحاسبات',
                      en: 'Market & Calcs',
                      subAr: 'الأسعار والطلب الفعلي',
                      subEn: 'Demand & Subnet tools',
                      isAcademy: false,
                    },
                  ].map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <button
                        key={mod.path}
                        type="button"
                        onClick={() => navigate(mod.path)}
                        className={`text-start p-3.5 rounded-xl border transition-all active:scale-[0.98] cursor-pointer group ${
                          mod.isAcademy
                            ? 'bg-gradient-to-br from-[#231D10] to-[#17171B] border-[#C89D3C]/70 hover:border-[#D4AF37] shadow-md shadow-[#C89D3C]/10'
                            : 'bg-[#1B1B20] hover:bg-[#222229] border-white/10 hover:border-[#C89D3C]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold min-w-0">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{lang === 'ar' ? mod.ar : mod.en}</span>
                          </div>
                          {mod.isAcademy && (
                            <span className="px-1.5 py-0.5 rounded bg-[#C89D3C] text-[#0E0E10] text-[9px] font-extrabold shrink-0 leading-none">
                              {lang === 'ar' ? 'جديد' : 'NEW'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-1.5 truncate">
                          {lang === 'ar' ? mod.subAr : mod.subEn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* DEDICATED ROYAL ACADEMY PROMOTIONAL SHOWCASE CARD */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-4">
              <div className="relative rounded-3xl bg-gradient-to-br from-[#0E0E10] via-[#151519] to-[#1C170C] text-white border border-[#C89D3C]/55 shadow-xl overflow-hidden">
                <div className="h-[2px] w-full gold-shimmer-line" />
                <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-6 space-y-5">
                    <div className="flex items-center gap-3.5">
                      <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#9E7822] text-[#0E0E10] flex items-center justify-center shrink-0 shadow-lg shadow-[#C89D3C]/30 ring-2 ring-[#F0CF6E]/40">
                        <GraduationCap className="w-8 h-8" />
                      </span>
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#C89D3C] text-[#0E0E10] text-[11px] font-extrabold">
                            {lang === 'ar' ? 'جديد' : 'NEW'}
                          </span>
                          <span className="text-xs font-bold text-[#D4AF37]">
                            {t(lang, 'أكاديمية عاصمة الشبكات', 'ASEMA NETWORKS ACADEMY')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          {t(lang, 'التدريب، الاختبارات، المسابقات والجوائز', 'Training, Quizzes, Contests & Prizes')}
                        </p>
                      </div>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug text-balance font-display">
                      {t(
                        lang,
                        'تعلّم هندسة الشبكات، اجتز الاختبارات، ونافس على الجوائز والشهادات المعتمدة',
                        'Master Network Engineering, Pass Quizzes & Compete for Prizes and Verified Certificates'
                      )}
                    </h2>

                    <p className="text-sm text-neutral-300 leading-relaxed">
                      {t(
                        lang,
                        'مسارات عملية متكاملة في MikroTik وUbiquiti والألياف الضوئية مع اختبارات تقييم تفاعلية، مسابقات وسحوبات دورية على جوائز قيّمة، وشهادات PDF موثقة برمز QR.',
                        'Hands-on tracks in MikroTik, Ubiquiti, and Fiber Optics featuring interactive quizzes, seasonal contests & prize draws, and QR-verified PDF certificates.'
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => navigate('/academy')}
                        className="btn-royal text-sm sm:text-base"
                      >
                        <GraduationCap className="w-5 h-5" />
                        <span>{t(lang, 'ادخل إلى الأكاديمية', 'Enter the Academy')}</span>
                        <ArrowIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/academy?tab=verify')}
                        className="min-h-[46px] px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:border-[#C89D3C] hover:text-[#D4AF37] text-sm font-semibold active:scale-[0.98] transition-all inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-[#D4AF37]" />
                        <span>{t(lang, 'التحقق من شهادة', 'Verify Certificate')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        icon: BookOpen,
                        ar: 'دورات هندسية تطبيقية',
                        en: 'Applied Courses',
                        descAr: '8 مسارات احترافية ودروس فيديو عالية الجودة',
                        descEn: '8 engineering tracks & HD video lessons',
                      },
                      {
                        icon: CheckCircle2,
                        ar: 'اختبارات وتقييم تفاعلي',
                        en: 'Interactive Quizzes',
                        descAr: 'امتحانات عملية تقيس مستواك وتمنحك نقاط تميز',
                        descEn: 'Instant grading & skill score tracking',
                      },
                      {
                        icon: Trophy,
                        ar: 'مسابقات وسحوبات وجوائز',
                        en: 'Contests & Prize Draws',
                        descAr: 'تحديات للمتفوقين وسحوبات على أجهزة ومعدات',
                        descEn: 'Periodic draws & hardware rewards for top learners',
                      },
                      {
                        icon: Award,
                        ar: 'شهادات إتمام موثقة',
                        en: 'Verified Certificates',
                        descAr: 'إصدار فوري لشهادات PDF مع رقم تحقق وQR',
                        descEn: 'Instant PDF certificates with QR validation',
                      },
                    ].map((feat) => {
                      const FeatIcon = feat.icon;
                      return (
                        <button
                          key={feat.ar}
                          type="button"
                          onClick={() => navigate('/academy')}
                          className="text-start p-4 rounded-2xl bg-[#1A1A20]/90 hover:bg-[#222019] border border-[#C89D3C]/25 hover:border-[#C89D3C]/70 transition-all active:scale-[0.98] cursor-pointer space-y-2"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#C89D3C]/20 border border-[#C89D3C]/45 text-[#E2BF59] flex items-center justify-center">
                            <FeatIcon className="w-5 h-5" />
                          </span>
                          <div className="text-sm font-bold text-white">
                            {lang === 'ar' ? feat.ar : feat.en}
                          </div>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {lang === 'ar' ? feat.descAr : feat.descEn}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </React.Fragment>
        );
      }

      case 'categories': {
        return (
          <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </h2>
                {sec.subtitleAr && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('all');
                  navigate('/catalog');
                }}
                className="btn-secondary-royal text-xs sm:text-sm self-start sm:self-auto"
              >
                <span>{t(lang, 'جميع التصنيفات', 'All Categories')}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const IconComp = CATEGORY_ICONS[cat.icon || 'Network'] || Network;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.id);
                      navigate('/catalog');
                    }}
                    className="royal-card text-start p-5 flex items-start gap-4 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer group"
                  >
                    <div className="icon-box-royal !w-12 !h-12 group-hover:scale-105">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#0E0E10] dark:text-white group-hover:text-[#9E7822] dark:group-hover:text-[#D4AF37] transition-colors">
                        {lang === 'ar' ? cat.nameAr : cat.nameEn}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {lang === 'ar' ? cat.descriptionAr : cat.descriptionEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      }

      case 'featured_products':
      case 'exclusive_products':
      case 'new_arrivals':
      case 'best_sellers': {
        let list = products;
        if (sec.selectedProductIds && sec.selectedProductIds.length > 0) {
          const picked = products.filter((p) => sec.selectedProductIds?.includes(p.id));
          if (picked.length > 0) list = picked;
        } else if (sec.sectionType === 'featured_products') {
          list = products.filter((p) => p.isFeatured);
        } else if (sec.sectionType === 'exclusive_products') {
          list = products.filter((p) => p.isExclusive);
        } else if (sec.sectionType === 'new_arrivals') {
          list = products.filter((p) => p.isNewArrival);
        } else if (sec.sectionType === 'best_sellers') {
          list = products.filter((p) => p.isBestSeller);
        }
        const displayed = list.slice(0, 6);
        if (displayed.length === 0) return null;

        return (
          <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </h2>
                {sec.subtitleAr && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/catalog')}
                className="btn-secondary-royal text-xs sm:text-sm self-start sm:self-auto"
              >
                <span>{t(lang, 'عرض الكتالوج الكامل', 'Explore Full Catalog')}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      }

      case 'latest_offers': {
        let list = activeOffers;
        if (sec.selectedOfferIds && sec.selectedOfferIds.length > 0) {
          const picked = activeOffers.filter((o) => sec.selectedOfferIds?.includes(o.id));
          if (picked.length > 0) list = picked;
        }
        if (list.length === 0) return null;

        return (
          <section
            key={sec.id}
            className="bg-[#121215] text-white py-14 border-y border-[#C89D3C]/20"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    {lang === 'ar' ? sec.titleAr : sec.titleEn}
                  </h2>
                  {sec.subtitleAr && (
                    <p className="text-sm text-neutral-400 mt-1">
                      {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/offers')}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#C89D3C]/50 bg-[#1B1B20] text-xs sm:text-sm font-bold text-[#D4AF37] hover:bg-[#C89D3C] hover:text-[#0E0E10] active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <span>{t(lang, 'مركز العروض الكامل', 'Open Offers Center')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {list.slice(0, 3).map((offer) => {
                  const linkedProduct = products.find((p) => p.id === offer.productId);
                  const sectionLabel = OFFER_SECTION_LABELS[offer.sectionType];
                  return (
                    <div
                      key={offer.id}
                      className="bg-[#1B1B20] border border-white/10 hover:border-[#C89D3C]/65 rounded-2xl overflow-hidden flex flex-col transition-all"
                    >
                      <div className="aspect-[4/3] bg-[#0E0E10] overflow-hidden">
                        <ResilientImage
                          src={offer.imageUrl || linkedProduct?.images?.[0]}
                          alt={lang === 'ar' ? offer.titleAr : offer.titleEn}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#D4AF37] font-semibold">
                              {lang === 'ar' ? sectionLabel.ar : sectionLabel.en}
                            </span>
                            <CountdownTimer endDate={offer.endDate} />
                          </div>
                          <h3 className="text-base font-bold text-white">
                            {lang === 'ar' ? offer.titleAr : offer.titleEn}
                          </h3>
                          <p className="text-xs text-neutral-400 line-clamp-2">
                            {lang === 'ar' ? offer.descriptionAr : offer.descriptionEn}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-[#D4AF37] font-mono-num">
                              {formatCurrency(offer.discountedPrice)}
                            </span>
                            <span className="text-xs text-neutral-500 line-through font-mono-num">
                              {formatCurrency(offer.originalPrice)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (linkedProduct) {
                                setSelectedProduct(linkedProduct);
                              } else {
                                navigate('/offers');
                              }
                            }}
                            className="btn-royal !min-h-[44px] !px-4 !py-2 !text-xs"
                          >
                            {t(lang, 'احجز العرض', 'Claim Offer')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      }

      case 'advertisements':
      case 'custom_banner': {
        const bannerAd = activeAds.find((a) => a.adType !== 'popup_ad');
        const img = sec.imageUrl || bannerAd?.imageUrl;
        const title = bannerAd
          ? lang === 'ar'
            ? bannerAd.titleAr
            : bannerAd.titleEn
          : lang === 'ar'
          ? sec.titleAr
          : sec.titleEn;
        const body = bannerAd
          ? lang === 'ar'
            ? bannerAd.textAr
            : bannerAd.textEn
          : lang === 'ar'
          ? sec.subtitleAr
          : sec.subtitleEn;

        return (
          <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="bg-[#0E0E10] text-white rounded-2xl overflow-hidden border border-[#C89D3C]/30 grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center space-y-4">
                <span className="text-xs font-semibold text-[#D4AF37]">
                  {t(lang, 'إعلان مميز · عاصمة الشبكات', 'Featured Campaign · ASEMA NETWORKS')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-balance">{title}</h2>
                <p className="text-sm text-neutral-300 leading-relaxed">{body}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(bannerAd?.destinationUrl || sec.ctaLink || '/catalog')
                    }
                    className="btn-royal"
                  >
                    <span>
                      {lang === 'ar'
                        ? sec.ctaTextAr || 'استكشف الآن'
                        : sec.ctaTextEn || 'Explore Campaign'}
                    </span>
                    <ArrowIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="lg:col-span-6 min-h-[240px]">
                <ResilientImage src={img} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        );
      }

      case 'announcements': {
        return (
          <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="bg-[#FAF5E8] dark:bg-[#C89D3C]/10 border border-[#C89D3C]/40 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </h3>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                  {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/track')}
                className="btn-obsidian !text-xs"
              >
                {t(lang, 'تتبع حجزك', 'Track Order')}
              </button>
            </div>
          </section>
        );
      }

      case 'brands': {
        return (
          <section key={sec.id} className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#0E0E10] dark:text-white">
                {lang === 'ar' ? sec.titleAr : sec.titleEn}
              </h2>
              {sec.subtitleAr && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    setSelectedBrandFilter(brand.id);
                    navigate('/catalog');
                  }}
                  className="royal-card p-5 text-center hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
                >
                  <div className="text-base font-bold text-[#0E0E10] dark:text-white font-display">
                    {brand.logoText || brand.nameEn}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {lang === 'ar' ? brand.nameAr : brand.country || brand.nameEn}
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      }

      case 'contact_support': {
        return (
          <section key={sec.id} id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-xs font-semibold text-[#9E7822] dark:text-[#D4AF37]">
                  {t(lang, 'المعرض الرئيسي ومركز الصيانة', 'Main Showroom & Support Desk')}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                </p>

                <div className="space-y-2 pt-2 text-sm text-neutral-800 dark:text-neutral-200">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-[#C89D3C] shrink-0 mt-0.5" />
                    <span className="font-medium">
                      {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#C89D3C] shrink-0" />
                    <span>
                      {t(
                        lang,
                        'ضمان حقيقي واستشارة هندسية مجانية قبل وبعد البيع',
                        'Genuine hardware warranty & pre/post-sales engineering support'
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  {(storeSettings.phones || ['770581056', '774828709', '778060590']).map((ph) => (
                    <a
                      key={ph}
                      href={`tel:${ph}`}
                      className="btn-secondary-royal font-mono-num"
                    >
                      <Phone className="w-4 h-4 text-[#C89D3C]" />
                      <span>{ph}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#0E0E10] text-white rounded-2xl p-6 space-y-4 border border-[#C89D3C]/35">
                <h3 className="text-lg font-bold">
                  {t(lang, 'تواصل أو زر موقعنا في صنعاء', 'Visit or Message Us Directly')}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {t(
                    lang,
                    'صنعاء – شارع صقر – مول نور اليمن – الدور الثاني. استلام فوري للطلبات المحجوزة.',
                    "Sana'a – Saqr Street – Noor Al Yemen Mall – 2nd Floor. Fast pickup for reserved hardware."
                  )}
                </p>
                <div className="space-y-3 pt-1">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Sanaa+Yemen+Saqr+Street+Noor+Al+Yemen+Mall"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-royal w-full"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{t(lang, 'فتح الموقع في خرائط جوجل', 'Open Location in Google Maps')}</span>
                  </a>
                  <a
                    href={`https://wa.me/${storeSettings.whatsappNumber || '967770581056'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[46px] w-full py-2.5 px-4 rounded-xl border border-white/20 text-white hover:border-[#C89D3C] hover:text-[#D4AF37] active:scale-[0.98] text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t(lang, 'محادثة عبر واتساب المتجر', 'Chat on Store WhatsApp')}</span>
                  </a>
                </div>
              </div>
            </div>

            <PaymentMethodsCard />
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div>
      {homepageSections.map((sec) => renderSection(sec))}
      {!homepageSections.some((sec) => sec.sectionType === 'contact_support' && sec.isEnabled) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <PaymentMethodsCard />
        </section>
      )}

      {/* Scheduled Popup Advertisement (only after >= 10s dwell) */}
      {dwellReached && popupAd && !popupAdDismissed && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/45 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPopupAdDismissed(true)}
              className="absolute top-3 end-3 z-10 w-10 h-10 rounded-full bg-[#0E0E10] text-white border border-white/15 flex items-center justify-center active:scale-95 cursor-pointer"
              aria-label="Dismiss advertisement"
            >
              <X className="w-4 h-4" />
            </button>
            {popupAd.imageUrl && (
              <div className="aspect-[16/9] bg-[#0E0E10]">
                <ResilientImage
                  src={popupAd.imageUrl}
                  alt={lang === 'ar' ? popupAd.titleAr : popupAd.titleEn}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 space-y-3">
              <h3 className="text-lg font-bold text-[#0E0E10] dark:text-white">
                {lang === 'ar' ? popupAd.titleAr : popupAd.titleEn}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {lang === 'ar' ? popupAd.textAr : popupAd.textEn}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPopupAdDismissed(true);
                  navigate(popupAd.destinationUrl || '/offers');
                }}
                className="btn-obsidian w-full"
              >
                {t(lang, 'عرض التفاصيل', 'View Details')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

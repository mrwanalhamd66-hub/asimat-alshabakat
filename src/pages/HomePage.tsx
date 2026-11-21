import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Calculator,
  Camera,
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
  Users,
  Wifi,
  Cable,
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
          <section key={sec.id} className="bg-[#0E0E10] text-white border-b border-[#C89D3C]/25">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
                <div className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                  {lang === 'ar'
                    ? 'عاصمة الشبكات · صنعاء، اليمن'
                    : "ASEMA NETWORKS · SANA'A, YEMEN"}
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance font-display">
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
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none py-2"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t(lang, 'بحث', 'Search')}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate('/planner')}
                    className="px-6 py-3 rounded-lg bg-[#C89D3C] text-[#0E0E10] font-bold text-sm hover:bg-[#D4AF37] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C89D3C]/20"
                  >
                    <Network className="w-4 h-4" />
                    <span>{t(lang, 'خطط مشروع شبكتك', 'Plan Your Network Project')}</span>
                    <ArrowIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(sec.ctaLink || '/catalog')}
                    className="px-5 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 font-semibold text-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
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
                    className="px-4 py-3 rounded-lg border border-white/20 text-white hover:border-[#C89D3C] hover:text-[#D4AF37] text-sm font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                  className="product-3d-card w-full h-full min-h-[280px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-[#C89D3C]/30 bg-[#17171B] relative shadow-2xl"
                  style={{
                    transform: `rotateX(${heroTilt.rx}deg) rotateY(${heroTilt.ry}deg)`,
                  }}
                >
                  <ResilientImage
                    src={sec.imageUrl}
                    alt={lang === 'ar' ? sec.titleAr : sec.titleEn}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
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
                  },
                  {
                    path: '/planner?tab=packages',
                    icon: Layers,
                    ar: 'باقات المشاريع الجاهزة',
                    en: 'Project Packages',
                    subAr: 'ISP · CCTV · فنادق',
                    subEn: 'ISP · CCTV · SMB Bundles',
                  },
                  {
                    path: '/assistant',
                    icon: Bot,
                    ar: 'المساعد والكاميرا الذكية',
                    en: 'AI Engineer & Cam',
                    subAr: 'تشخيص وتعرف بالصور',
                    subEn: 'Catalog-grounded AI',
                  },
                  {
                    path: '/academy',
                    icon: GraduationCap,
                    ar: 'أكاديمية عاصمة الشبكات',
                    en: 'ASEMA Academy',
                    subAr: 'دورات وشهادات معتمدة',
                    subEn: 'Tracks & QR Certificates',
                  },
                  {
                    path: '/community',
                    icon: Users,
                    ar: 'المجتمع والمختبر',
                    en: 'Community & Lab',
                    subAr: 'سكربتات ودليل مهندسين',
                    subEn: 'Scripts & Engineers',
                  },
                  {
                    path: '/market',
                    icon: TrendingUp,
                    ar: 'مؤشر السوق والحاسبات',
                    en: 'Market & Calcs',
                    subAr: 'الأسعار والطلب الفعلي',
                    subEn: 'Demand & Subnet tools',
                  },
                ].map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.path}
                      type="button"
                      onClick={() => navigate(mod.path)}
                      className="text-start p-3 rounded-xl bg-[#1B1B20] hover:bg-[#222229] border border-white/10 hover:border-[#C89D3C]/60 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-bold">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{lang === 'ar' ? mod.ar : mod.en}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 truncate">
                        {lang === 'ar' ? mod.subAr : mod.subEn}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
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
                className="text-sm font-semibold text-[#9E7822] dark:text-[#D4AF37] hover:text-[#0E0E10] dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                    className="text-start bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-5 flex items-start gap-4 transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-[#0E0E10] dark:text-white">
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
                className="text-sm font-semibold text-[#9E7822] dark:text-[#D4AF37] hover:text-[#0E0E10] dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                  className="text-sm font-semibold text-[#D4AF37] hover:text-white inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
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
                      className="bg-[#1B1B20] border border-white/10 hover:border-[#C89D3C]/60 rounded-xl overflow-hidden flex flex-col transition-colors"
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

                        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
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
                            className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] transition-colors cursor-pointer"
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
                    className="px-5 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-sm font-bold hover:bg-[#D4AF37] transition-colors inline-flex items-center gap-2 cursor-pointer"
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
            <div className="bg-[#FAF5E8] dark:bg-[#C89D3C]/10 border border-[#C89D3C]/35 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0E0E10] dark:text-white">
                  {lang === 'ar' ? sec.titleAr : sec.titleEn}
                </h3>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5">
                  {lang === 'ar' ? sec.subtitleAr : sec.subtitleEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/track')}
                className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-semibold hover:bg-[#222] whitespace-nowrap cursor-pointer"
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
                  className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-5 text-center transition-colors cursor-pointer"
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
                      className="px-4 py-2.5 rounded-lg bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] text-sm font-semibold font-mono-num text-[#0E0E10] dark:text-white inline-flex items-center gap-2 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-[#C89D3C]" />
                      <span>{ph}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#0E0E10] text-white rounded-xl p-6 space-y-4 border border-[#C89D3C]/30">
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
                <div className="space-y-2.5 pt-1">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Sanaa+Yemen+Saqr+Street+Noor+Al+Yemen+Mall"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-sm font-bold hover:bg-[#D4AF37] transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{t(lang, 'فتح الموقع في خرائط جوجل', 'Open Location in Google Maps')}</span>
                  </a>
                  <a
                    href={`https://wa.me/${storeSettings.whatsappNumber || '967770581056'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg border border-white/20 text-white hover:border-[#C89D3C] hover:text-[#D4AF37] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
          <div className="bg-white border border-[#C89D3C]/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPopupAdDismissed(true)}
              className="absolute top-3 end-3 z-10 w-8 h-8 rounded-full bg-[#0E0E10] text-white flex items-center justify-center cursor-pointer"
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
              <h3 className="text-lg font-bold text-[#0E0E10]">
                {lang === 'ar' ? popupAd.titleAr : popupAd.titleEn}
              </h3>
              <p className="text-sm text-neutral-600">
                {lang === 'ar' ? popupAd.textAr : popupAd.textEn}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPopupAdDismissed(true);
                  navigate(popupAd.destinationUrl || '/offers');
                }}
                className="w-full py-2.5 rounded-lg bg-[#0E0E10] text-white text-sm font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
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

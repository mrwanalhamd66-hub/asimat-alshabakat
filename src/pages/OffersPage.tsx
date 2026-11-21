import { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { OFFER_SECTION_LABELS, formatCurrency, t } from '../i18n/translations.ts';
import { isOfferCurrentlyActive } from '../services/firestoreService.ts';
import type { OfferSectionType } from '../types/index.ts';
import { CountdownTimer } from '../components/CountdownTimer.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';

export function OffersPage() {
  const { lang, offers, products, setSelectedProduct } = useApp();
  const [selectedSection, setSelectedSection] = useState<'all' | OfferSectionType>('all');

  const activeOffers = offers.filter(isOfferCurrentlyActive);
  const displayed =
    selectedSection === 'all'
      ? activeOffers
      : activeOffers.filter((o) => o.sectionType === selectedSection);

  const sectionKeys = Object.keys(OFFER_SECTION_LABELS) as OfferSectionType[];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="bg-[#0E0E10] text-white rounded-2xl p-7 sm:p-10 border border-[#C89D3C]/30">
        <span className="text-xs font-semibold text-[#D4AF37]">
          {t(lang, 'مركز العروض الديناميكي', 'Dynamic Offers Center')}
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold mt-2">
          {t(lang, 'أقوى عروض معدات الشبكات في اليمن', 'Exclusive Networking Hardware Deals')}
        </h1>
        <p className="text-sm text-neutral-300 mt-2 max-w-2xl">
          {t(
            lang,
            'عروض يومية وأسبوعية وحصرية مفعّلة ومجدولة زمنياً من إدارة عاصمة الشبكات. احجز العرض قبل انتهاء العداد أو نفاد الكمية.',
            'Scheduled daily, weekly, wholesale, and limited-time offers published directly by ASEMA NETWORKS.'
          )}
        </p>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedSection('all')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            selectedSection === 'all'
              ? 'bg-white text-[#0E0E10] shadow-sm'
              : 'text-neutral-600 hover:text-[#0E0E10]'
          }`}
        >
          {t(lang, 'كل العروض النشطة', 'All Active Offers')}
        </button>
        {sectionKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedSection(key)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              selectedSection === key
                ? 'bg-white text-[#0E0E10] shadow-sm'
                : 'text-neutral-600 hover:text-[#0E0E10]'
            }`}
          >
            {lang === 'ar' ? OFFER_SECTION_LABELS[key].ar : OFFER_SECTION_LABELS[key].en}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-12 text-center space-y-2">
          <p className="text-base font-semibold text-[#0E0E10]">
            {t(lang, 'لا توجد عروض نشطة في هذا القسم حالياً', 'No active offers in this section right now')}
          </p>
          <p className="text-xs text-neutral-500">
            {t(lang, 'جرب اختيار قسم آخر أو تصفح الكتالوج الكامل.', 'Select another section or browse the full catalog.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((offer) => {
            const linked = products.find((p) => p.id === offer.productId);
            const discountPct =
              offer.originalPrice > 0
                ? Math.round(
                    ((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100
                  )
                : 0;
            return (
              <article
                key={offer.id}
                className="bg-white border border-[#E5E5E0] rounded-xl overflow-hidden flex flex-col hover:border-[#C89D3C]/60 transition-colors"
              >
                <div className="aspect-[4/3] bg-[#F3F3F1] overflow-hidden">
                  <ResilientImage
                    src={offer.imageUrl || linked?.images?.[0]}
                    alt={lang === 'ar' ? offer.titleAr : offer.titleEn}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#9E7822]">
                        {lang === 'ar'
                          ? OFFER_SECTION_LABELS[offer.sectionType].ar
                          : OFFER_SECTION_LABELS[offer.sectionType].en}
                        {discountPct > 0 ? ` · -${discountPct}%` : ''}
                      </span>
                      <CountdownTimer endDate={offer.endDate} />
                    </div>
                    <h2 className="text-base font-bold text-[#0E0E10]">
                      {lang === 'ar' ? offer.titleAr : offer.titleEn}
                    </h2>
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {lang === 'ar' ? offer.descriptionAr : offer.descriptionEn}
                    </p>
                    {offer.availableQuantity !== undefined && (
                      <div className="text-xs text-neutral-500 font-mono-num">
                        {t(lang, 'الكمية المتاحة بالعرض:', 'Offer stock:')}{' '}
                        {offer.availableQuantity}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F0F0EC] flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-[#0E0E10] font-mono-num">
                        {formatCurrency(offer.discountedPrice)}
                      </span>
                      <span className="text-xs text-neutral-400 line-through font-mono-num">
                        {formatCurrency(offer.originalPrice)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (linked) {
                          setSelectedProduct(linked);
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
                    >
                      {t(lang, 'احجز بسعر العرض', 'Reserve Offer')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { t } from '../i18n/translations.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function CatalogPage() {
  const {
    lang,
    products,
    categories,
    brands,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    selectedBrandFilter,
    setSelectedBrandFilter,
    firebaseUser,
    favoriteIds,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCategoryFilter !== 'all' && p.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (selectedBrandFilter !== 'all' && p.brandId !== selectedBrandFilter) {
        return false;
      }
      if (statusFilter === 'favorites') {
        if (!favoriteIds.has(p.id)) return false;
      } else if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        p.nameAr,
        p.nameEn,
        p.modelNumber,
        p.brandName,
        p.descriptionAr,
        p.descriptionEn,
        ...(p.tags || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.retailPrice - a.retailPrice);
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.reservationCount || 0) - (a.reservationCount || 0));
    } else {
      sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return sorted;
  }, [
    products,
    searchQuery,
    selectedCategoryFilter,
    selectedBrandFilter,
    statusFilter,
    sortBy,
    favoriteIds,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E0E10] dark:text-white font-display">
          {t(lang, 'كتالوج معدات الشبكات', 'Networking Equipment Catalog')}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {t(
            lang,
            'تصفح جميع أجهزة مايكروتك، راوترات Wi-Fi 6، OpenWrt، السويتشات والملحقات المتوفرة للحجز.',
            'Browse MikroTik routers, Wi-Fi 6 access points, OpenWrt appliances, PoE switches, and cabling.'
          )}
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="royal-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 flex items-center bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E3DA] dark:border-white/15 focus-within:border-[#C89D3C] rounded-xl px-3 min-h-[44px]">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'بحث بالاسم أو الموديل...', 'Search by name or model...')}
            className="w-full bg-transparent px-2.5 py-2 text-sm text-[#0E0E10] dark:text-white placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="min-h-[44px] bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border border-[#E5E3DA] dark:border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C89D3C]"
        >
          <option value="all">{t(lang, 'كل التصنيفات', 'All Categories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {lang === 'ar' ? c.nameAr : c.nameEn}
            </option>
          ))}
        </select>

        <select
          value={selectedBrandFilter}
          onChange={(e) => setSelectedBrandFilter(e.target.value)}
          className="min-h-[44px] bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border border-[#E5E3DA] dark:border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C89D3C]"
        >
          <option value="all">{t(lang, 'كل العلامات', 'All Brands')}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {lang === 'ar' ? b.nameAr : b.nameEn}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#C89D3C] shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full min-h-[44px] bg-[#F8F8F7] dark:bg-[#0E0E10] text-[#0E0E10] dark:text-white border border-[#E5E3DA] dark:border-white/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C89D3C]"
          >
            <option value="newest">{t(lang, 'الأحدث', 'Newest')}</option>
            <option value="popular">{t(lang, 'الأكثر حجزاً', 'Most Reserved')}</option>
            <option value="price_asc">{t(lang, 'السعر: الأقل أولاً', 'Price: Low to High')}</option>
            <option value="price_desc">{t(lang, 'السعر: الأعلى أولاً', 'Price: High to Low')}</option>
          </select>
        </div>
      </div>

      {/* Availability Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#EAE8E1] dark:bg-[#17171B] border border-[#DFDCD2] dark:border-white/10 rounded-xl overflow-x-auto max-w-full">
          {[
            { id: 'all', ar: 'الكل', en: 'All' },
            { id: 'available', ar: 'متوفر', en: 'Available' },
            { id: 'limited_stock', ar: 'كمية محدودة', en: 'Limited Stock' },
            { id: 'coming_soon', ar: 'قريباً', en: 'Coming Soon' },
            ...(firebaseUser
              ? [
                  {
                    id: 'favorites',
                    ar: `المفضلة (${favoriteIds.size})`,
                    en: `Favorites (${favoriteIds.size})`,
                  },
                ]
              : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] shadow-sm'
                  : 'text-neutral-700 dark:text-neutral-300 hover:text-[#0E0E10] dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? tab.ar : tab.en}
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 font-mono-num">
          {filtered.length} {t(lang, 'منتج', 'products')}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="royal-card p-12 text-center space-y-4">
          <p className="text-base font-bold text-[#0E0E10] dark:text-white">
            {t(lang, 'لم يتم العثور على أجهزة مطابقة لبحثك', 'No matching equipment found')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryFilter('all');
              setSelectedBrandFilter('all');
              setStatusFilter('all');
            }}
            className="btn-obsidian"
          >
            {t(lang, 'إعادة تعيين الفلاتر', 'Reset Filters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

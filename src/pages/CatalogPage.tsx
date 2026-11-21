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
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0E0E10]">
          {t(lang, 'كتالوج معدات الشبكات', 'Networking Equipment Catalog')}
        </h1>
        <p className="text-sm text-neutral-600">
          {t(
            lang,
            'تصفح جميع أجهزة مايكروتك، راوترات Wi-Fi 6، OpenWrt، السويتشات والملحقات المتوفرة للحجز.',
            'Browse MikroTik routers, Wi-Fi 6 access points, OpenWrt appliances, PoE switches, and cabling.'
          )}
        </p>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 flex items-center bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg px-3">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'بحث بالاسم أو الموديل...', 'Search by name or model...')}
            className="w-full bg-transparent px-2.5 py-2 text-sm focus:outline-none"
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg px-3 py-2 text-sm focus:outline-none"
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
          className="bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="all">{t(lang, 'كل العلامات', 'All Brands')}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {lang === 'ar' ? b.nameAr : b.nameEn}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-neutral-500 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg px-3 py-2 text-sm focus:outline-none"
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
        <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg overflow-x-auto">
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-[#0E0E10] shadow-sm'
                  : 'text-neutral-600 hover:text-[#0E0E10]'
              }`}
            >
              {lang === 'ar' ? tab.ar : tab.en}
            </button>
          ))}
        </div>

        <span className="text-xs text-neutral-500 font-mono-num">
          {filtered.length} {t(lang, 'منتج', 'products')}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E5E0] rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-semibold text-[#0E0E10]">
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
            className="px-4 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-semibold cursor-pointer"
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

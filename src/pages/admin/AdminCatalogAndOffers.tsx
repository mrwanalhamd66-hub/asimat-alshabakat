import React, { useState } from 'react';
import { Calendar, Edit3, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { OFFER_SECTION_LABELS, formatCurrency, t } from '../../i18n/translations.ts';
import {
  isAdCurrentlyActive,
  isOfferCurrentlyActive,
  logAdminActivity,
  removeAd,
  removeBrand,
  removeCategory,
  removeOffer,
  saveAd,
  saveBrand,
  saveCategory,
  saveOffer,
} from '../../services/firestoreService.ts';
import type {
  AdType,
  Advertisement,
  Brand,
  Category,
  Offer,
  OfferSectionType,
} from '../../types/index.ts';
import { ImageUploader } from '../../components/ImageUploader.tsx';
import { ResilientImage } from '../../components/ResilientImage.tsx';

export function AdminCategoriesModule() {
  const { lang, categories, userProfile } = useApp();
  const [editing, setEditing] = useState<Category | null>(null);

  const openNew = () => {
    setEditing({
      id: `cat_${Date.now()}`,
      nameAr: '',
      nameEn: '',
      slug: '',
      descriptionAr: '',
      descriptionEn: '',
      icon: 'Network',
      order: categories.length + 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    const finalCat: Category = {
      ...editing,
      slug: editing.slug || editing.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: Number(editing.order || 1),
    };
    await saveCategory(finalCat);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'category_saved',
      entityType: 'category',
      entityId: finalCat.id,
      summaryAr: `حفظ التصنيف: ${finalCat.nameAr}`,
      summaryEn: `Saved category: ${finalCat.nameEn}`,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0E0E10]">
          {t(lang, 'إدارة التصنيفات', 'Categories Management')}
        </h2>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة تصنيف', 'Add Category')}</span>
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-[#C89D3C]/50 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder={t(lang, 'الاسم بالعربية', 'Name (AR)')}
              value={editing.nameAr}
              onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              required
              placeholder={t(lang, 'الاسم بالإنجليزية', 'Name (EN)')}
              value={editing.nameEn}
              onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              type="number"
              placeholder={t(lang, 'الترتيب', 'Order')}
              value={editing.order}
              onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder={t(lang, 'وصف التصنيف (عربي)', 'Description (AR)')}
              value={editing.descriptionAr || ''}
              onChange={(e) => setEditing({ ...editing, descriptionAr: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              placeholder={t(lang, 'وصف التصنيف (إنجليزي)', 'Description (EN)')}
              value={editing.descriptionEn || ''}
              onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              <span>{t(lang, 'مفعّل في المتجر', 'Active')}</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold cursor-pointer"
              >
                {t(lang, 'حفظ', 'Save')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#E5E5E0] rounded-xl divide-y divide-[#F0F0EC]">
        {categories.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#0E0E10]">
                {lang === 'ar' ? c.nameAr : c.nameEn}
              </div>
              <div className="text-xs text-neutral-500">
                #{c.order} · {c.isActive ? t(lang, 'نشط', 'Active') : t(lang, 'مخفي', 'Hidden')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="p-2 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeCategory(c.id)}
                className="p-2 rounded hover:bg-rose-50 text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBrandsModule() {
  const { lang, brands, userProfile } = useApp();
  const [editing, setEditing] = useState<Brand | null>(null);

  const openNew = () => {
    setEditing({
      id: `brand_${Date.now()}`,
      nameAr: '',
      nameEn: '',
      slug: '',
      country: '',
      logoText: '',
      isFeatured: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    const finalBrand: Brand = {
      ...editing,
      slug: editing.slug || editing.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      logoText: editing.logoText || editing.nameEn,
    };
    await saveBrand(finalBrand);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'brand_saved',
      entityType: 'brand',
      entityId: finalBrand.id,
      summaryAr: `حفظ العلامة التجارية: ${finalBrand.nameEn}`,
      summaryEn: `Saved brand: ${finalBrand.nameEn}`,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0E0E10]">
          {t(lang, 'إدارة العلامات التجارية', 'Brands Management')}
        </h2>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة علامة', 'Add Brand')}</span>
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-[#C89D3C]/50 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder={t(lang, 'الاسم بالعربية', 'Name (AR)')}
              value={editing.nameAr}
              onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              required
              placeholder={t(lang, 'الاسم بالإنجليزية', 'Name (EN)')}
              value={editing.nameEn}
              onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              placeholder={t(lang, 'بلد المنشأ', 'Country')}
              value={editing.country || ''}
              onChange={(e) => setEditing({ ...editing, country: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs font-semibold">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isFeatured}
                  onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                />
                <span>{t(lang, 'علامة مميزة', 'Featured')}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span>{t(lang, 'نشط', 'Active')}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold cursor-pointer"
              >
                {t(lang, 'حفظ', 'Save')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div
            key={b.id}
            className="bg-white border border-[#E5E5E0] rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-bold text-[#0E0E10]">{b.nameEn}</div>
              <div className="text-xs text-neutral-500">
                {b.nameAr} · {b.isActive ? t(lang, 'نشط', 'Active') : t(lang, 'معطل', 'Inactive')}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(b)}
                className="p-2 rounded hover:bg-neutral-100 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeBrand(b.id)}
                className="p-2 rounded hover:bg-rose-50 text-rose-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOffersModule() {
  const { lang, offers, products, userProfile } = useApp();
  const [editing, setEditing] = useState<Offer | null>(null);

  const openNew = () => {
    const firstProd = products[0];
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditing({
      id: `offer_${Date.now()}`,
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      sectionType: 'today_deals',
      productId: firstProd?.id || '',
      productNameAr: firstProd?.nameAr || '',
      productNameEn: firstProd?.nameEn || '',
      imageUrl: firstProd?.images?.[0] || '',
      originalPrice: firstProd?.retailPrice || 0,
      discountedPrice: Math.round((firstProd?.retailPrice || 0) * 0.85),
      availableQuantity: 10,
      startDate: now.toISOString().slice(0, 16),
      endDate: in7Days.toISOString().slice(0, 16),
      isFeatured: true,
      isActive: true,
      autoActivate: true,
      autoExpire: true,
      clickCount: 0,
      createdAt: now.toISOString(),
    });
  };

  const handleProductPick = (productId: string) => {
    if (!editing) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setEditing({
      ...editing,
      productId: prod.id,
      productNameAr: prod.nameAr,
      productNameEn: prod.nameEn,
      imageUrl: editing.imageUrl || prod.images?.[0] || '',
      originalPrice: prod.retailPrice,
      discountedPrice: Math.round(prod.retailPrice * 0.85),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    const finalOffer: Offer = {
      ...editing,
      originalPrice: Number(editing.originalPrice),
      discountedPrice: Number(editing.discountedPrice),
      availableQuantity: Number(editing.availableQuantity || 0),
      startDate: new Date(editing.startDate).toISOString(),
      endDate: new Date(editing.endDate).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveOffer(finalOffer);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'offer_published',
      entityType: 'offer',
      entityId: finalOffer.id,
      summaryAr: `نشر العرض: ${finalOffer.titleAr}`,
      summaryEn: `Published offer: ${finalOffer.titleEn}`,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'إدارة العروض الديناميكية', 'Dynamic Offers Center')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'انشر عرضاً جديداً خلال ثوانٍ مع عداد تنازلي وتفعيل وانتهاء تلقائي حسب التاريخ.',
              'Publish new offers in seconds with automatic schedule activation, expiration, and countdowns.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'نشر عرض جديد', 'Publish New Offer')}</span>
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-[#C89D3C]/50 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'اختر المنتج المرتبط', 'Select Product')}
              </label>
              <select
                value={editing.productId}
                onChange={(e) => handleProductPick(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {lang === 'ar' ? p.nameAr : p.nameEn} ({formatCurrency(p.retailPrice)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'قسم العرض', 'Offer Section')}
              </label>
              <select
                value={editing.sectionType}
                onChange={(e) =>
                  setEditing({ ...editing, sectionType: e.target.value as OfferSectionType })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              >
                {(Object.keys(OFFER_SECTION_LABELS) as OfferSectionType[]).map((k) => (
                  <option key={k} value={k}>
                    {lang === 'ar' ? OFFER_SECTION_LABELS[k].ar : OFFER_SECTION_LABELS[k].en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'عنوان العرض (عربي) *', 'Offer Title (Arabic) *')}
              </label>
              <input
                required
                value={editing.titleAr}
                onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'عنوان العرض (إنجليزي) *', 'Offer Title (English) *')}
              </label>
              <input
                required
                value={editing.titleEn}
                onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'السعر الأصلي $', 'Original $')}
              </label>
              <input
                type="number"
                step="0.01"
                value={editing.originalPrice}
                onChange={(e) => setEditing({ ...editing, originalPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9E7822] mb-1">
                {t(lang, 'سعر العرض $', 'Discounted $')}
              </label>
              <input
                type="number"
                step="0.01"
                value={editing.discountedPrice}
                onChange={(e) => setEditing({ ...editing, discountedPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-[#FAF5E8] border border-[#C89D3C]/40 rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الكمية المتاحة', 'Quantity')}
              </label>
              <input
                type="number"
                value={editing.availableQuantity || 0}
                onChange={(e) =>
                  setEditing({ ...editing, availableQuantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'تاريخ البدء', 'Start Date')}
              </label>
              <input
                type="datetime-local"
                value={editing.startDate.slice(0, 16)}
                onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'تاريخ الانتهاء', 'End Date')}
              </label>
              <input
                type="datetime-local"
                value={editing.endDate.slice(0, 16)}
                onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
          </div>

          <ImageUploader
            label={t(lang, 'صورة العرض الترويجية', 'Promotional Image')}
            value={editing.imageUrl || ''}
            onChange={(url) => setEditing({ ...editing, imageUrl: url })}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span>{t(lang, 'مفعّل', 'Active')}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editing.isFeatured)}
                  onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                />
                <span>{t(lang, 'عرض مميز', 'Featured')}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editing.autoActivate)}
                  onChange={(e) => setEditing({ ...editing, autoActivate: e.target.checked })}
                />
                <span>{t(lang, 'تفعيل تلقائي', 'Auto-Activate')}</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editing.autoExpire)}
                  onChange={(e) => setEditing({ ...editing, autoExpire: e.target.checked })}
                />
                <span>{t(lang, 'انتهاء تلقائي', 'Auto-Expire')}</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] cursor-pointer"
              >
                {t(lang, 'نشر العرض فوراً', 'Publish Offer')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((o) => {
          const live = isOfferCurrentlyActive(o);
          return (
            <div
              key={o.id}
              className="bg-white border border-[#E5E5E0] rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                  <ResilientImage src={o.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#0E0E10] truncate">
                    {lang === 'ar' ? o.titleAr : o.titleEn}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono-num mt-0.5">
                    {formatCurrency(o.discountedPrice)} (was {formatCurrency(o.originalPrice)}) ·{' '}
                    <span className={live ? 'text-emerald-700 font-semibold' : 'text-rose-700'}>
                      {live ? t(lang, 'نشط الآن', 'Live') : t(lang, 'منتهي / متوقف', 'Inactive')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditing(o)}
                  className="p-2 rounded hover:bg-neutral-100 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeOffer(o.id)}
                  className="p-2 rounded hover:bg-rose-50 text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminAdsModule() {
  const { lang, ads, userProfile } = useApp();
  const [editing, setEditing] = useState<Advertisement | null>(null);

  const openNew = () => {
    const now = new Date();
    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    setEditing({
      id: `ad_${Date.now()}`,
      titleAr: '',
      titleEn: '',
      textAr: '',
      textEn: '',
      imageUrl: '',
      adType: 'homepage_banner',
      displayLocation: 'homepage_mid',
      targetPage: 'catalog',
      destinationUrl: '/catalog',
      startDate: now.toISOString().slice(0, 16),
      endDate: in14.toISOString().slice(0, 16),
      priority: 1,
      isActive: true,
      impressions: 0,
      clicks: 0,
      createdAt: now.toISOString(),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    const finalAd: Advertisement = {
      ...editing,
      priority: Number(editing.priority || 1),
      startDate: new Date(editing.startDate).toISOString(),
      endDate: new Date(editing.endDate).toISOString(),
    };
    await saveAd(finalAd);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'ad_saved',
      entityType: 'advertisement',
      entityId: finalAd.id,
      summaryAr: `حفظ الإعلان: ${finalAd.titleAr}`,
      summaryEn: `Saved advertisement: ${finalAd.titleEn}`,
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'مركز الإعلانات والجدولة البصرية', 'Advertising & Visual Scheduler')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'أنشئ بنرات رئيسية، ملصقات، وإعلانات منبثقة تظهر وتختفي تلقائياً حسب الجدول الزمني.',
              'Schedule homepage banners, posters, and popups with automatic start and end dates.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إنشاء إعلان جديد', 'Create Advertisement')}</span>
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white border border-[#C89D3C]/50 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder={t(lang, 'عنوان الإعلان (عربي) *', 'Ad Title (AR) *')}
              value={editing.titleAr}
              onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              required
              placeholder={t(lang, 'عنوان الإعلان (إنجليزي) *', 'Ad Title (EN) *')}
              value={editing.titleEn}
              onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <textarea
              rows={2}
              placeholder={t(lang, 'نص الإعلان بالعربية', 'Ad Copy (AR)')}
              value={editing.textAr || ''}
              onChange={(e) => setEditing({ ...editing, textAr: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <textarea
              rows={2}
              placeholder={t(lang, 'نص الإعلان بالإنجليزية', 'Ad Copy (EN)')}
              value={editing.textEn || ''}
              onChange={(e) => setEditing({ ...editing, textEn: e.target.value })}
              className="px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <select
              value={editing.adType}
              onChange={(e) => setEditing({ ...editing, adType: e.target.value as AdType })}
              className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            >
              <option value="homepage_banner">Homepage Banner</option>
              <option value="promotional_poster">Promotional Poster</option>
              <option value="product_ad">Product Ad</option>
              <option value="special_campaign">Special Campaign</option>
              <option value="brand_ad">Brand Ad</option>
              <option value="seasonal_offer">Seasonal Offer</option>
              <option value="announcement_banner">Announcement Banner</option>
              <option value="popup_ad">Popup Ad</option>
            </select>
            <input
              placeholder={t(lang, 'موقع العرض', 'Location')}
              value={editing.displayLocation}
              onChange={(e) => setEditing({ ...editing, displayLocation: e.target.value })}
              className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
            />
            <input
              placeholder={t(lang, 'الرابط المستهدف (/offers)', 'Destination (/offers)')}
              value={editing.destinationUrl || ''}
              onChange={(e) => setEditing({ ...editing, destinationUrl: e.target.value })}
              className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
            <input
              type="datetime-local"
              value={editing.startDate.slice(0, 16)}
              onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
              className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
            <input
              type="datetime-local"
              value={editing.endDate.slice(0, 16)}
              onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
              className="px-3 py-2 text-xs bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
            />
          </div>

          <ImageUploader
            label={t(lang, 'صورة الإعلان', 'Advertisement Image')}
            value={editing.imageUrl || ''}
            onChange={(url) => setEditing({ ...editing, imageUrl: url })}
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span>{t(lang, 'مفعّل', 'Active')}</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <span>{t(lang, 'الأولوية:', 'Priority:')}</span>
                <input
                  type="number"
                  min="1"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                  className="w-16 px-2 py-1 bg-[#F8F8F7] border border-[#E5E5E0] rounded font-mono-num"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
              >
                {t(lang, 'إلغاء', 'Cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold cursor-pointer"
              >
                {t(lang, 'حفظ وجدولة الإعلان', 'Save & Schedule')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Visual Advertisement Scheduler Timeline */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0E0E10]">
          <Calendar className="w-4 h-4 text-[#C89D3C]" />
          <span>{t(lang, 'المجدول الزمني للحملات الإعلانية', 'Visual Advertisement Scheduler')}</span>
        </div>

        <div className="space-y-3">
          {ads.map((ad) => {
            const live = isAdCurrentlyActive(ad);
            const startStr = new Date(ad.startDate).toLocaleDateString();
            const endStr = new Date(ad.endDate).toLocaleDateString();
            return (
              <div
                key={ad.id}
                className="p-4 rounded-xl bg-[#F8F8F7] border border-[#E5E5E0] flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 h-12 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                    <ResilientImage src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0E0E10] truncate">
                      {lang === 'ar' ? ad.titleAr : ad.titleEn}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono-num">
                      {ad.adType} · {startStr} → {endStr} · Priority #{ad.priority}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold ${
                      live ? 'text-emerald-700' : 'text-neutral-500'
                    }`}
                  >
                    {live ? t(lang, 'يعرض الآن', 'Active Schedule') : t(lang, 'متوقف / مجدول', 'Paused / Ended')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(ad)}
                    className="p-2 rounded hover:bg-white cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAd(ad.id)}
                    className="p-2 rounded hover:bg-rose-50 text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

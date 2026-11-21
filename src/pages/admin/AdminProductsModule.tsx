import React, { useState } from 'react';
import { Copy, Edit3, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { PRODUCT_STATUS_LABELS, formatCurrency, t } from '../../i18n/translations.ts';
import {
  deleteProduct,
  logAdminActivity,
  saveProduct,
} from '../../services/firestoreService.ts';
import type { Product, ProductPrivate, ProductStatus } from '../../types/index.ts';
import { ImageUploader } from '../../components/ImageUploader.tsx';
import { ResilientImage } from '../../components/ResilientImage.tsx';

interface AdminProductsModuleProps {
  wholesaleMap: Record<string, ProductPrivate>;
}

export function AdminProductsModule({ wholesaleMap }: AdminProductsModuleProps) {
  const { lang, products, categories, brands, userProfile } = useApp();
  const [editing, setEditing] = useState<Product | null>(null);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [supplierNotes, setSupplierNotes] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    const firstCat = categories[0];
    const firstBrand = brands[0];
    setEditing({
      id: `prod_${Date.now()}`,
      nameAr: '',
      nameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      specsAr: '',
      specsEn: '',
      brandId: firstBrand?.id || 'brand_mikrotik',
      brandName: firstBrand?.nameEn || 'MikroTik',
      modelNumber: '',
      categoryId: firstCat?.id || 'cat_mikrotik',
      categoryNameAr: firstCat?.nameAr || '',
      categoryNameEn: firstCat?.nameEn || '',
      retailPrice: 0,
      previousPrice: 0,
      discountPercentage: 0,
      availableQuantity: 10,
      status: 'available',
      isFeatured: false,
      isNewArrival: true,
      isExclusive: false,
      isBestSeller: false,
      isPublished: true,
      tags: [],
      images: [],
      documentationUrl: '',
      warrantyAr: 'ضمان سنة كاملة',
      warrantyEn: '1-Year Warranty',
      viewCount: 0,
      reservationCount: 0,
      createdAt: new Date().toISOString(),
    });
    setWholesalePrice(0);
    setSupplierNotes('');
    setImageUrlInput('');
    setTagsInput('');
  };

  const openEdit = (p: Product) => {
    setEditing({ ...p });
    setWholesalePrice(wholesaleMap[p.id]?.wholesalePrice || 0);
    setSupplierNotes(wholesaleMap[p.id]?.supplierNotes || '');
    setImageUrlInput('');
    setTagsInput((p.tags || []).join(', '));
  };

  const handleDuplicate = async (p: Product) => {
    if (!userProfile) return;
    const copy: Product = {
      ...p,
      id: `prod_${Date.now()}`,
      nameAr: `${p.nameAr} (نسخة)`,
      nameEn: `${p.nameEn} (Copy)`,
      isPublished: false,
      viewCount: 0,
      reservationCount: 0,
      createdAt: new Date().toISOString(),
    };
    await saveProduct(copy, wholesaleMap[p.id]?.wholesalePrice || 0, undefined, userProfile.uid);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'product_duplicated',
      entityType: 'product',
      entityId: copy.id,
      summaryAr: `تم نسخ المنتج: ${p.nameAr}`,
      summaryEn: `Duplicated product: ${p.nameEn}`,
    });
  };

  const handleTogglePublish = async (p: Product) => {
    if (!userProfile) return;
    const updated = { ...p, isPublished: !p.isPublished };
    await saveProduct(updated, wholesaleMap[p.id]?.wholesalePrice || 0, undefined, userProfile.uid);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: updated.isPublished ? 'product_published' : 'product_unpublished',
      entityType: 'product',
      entityId: p.id,
      summaryAr: `${updated.isPublished ? 'نشر' : 'إلغاء نشر'} المنتج: ${p.nameAr}`,
      summaryEn: `${updated.isPublished ? 'Published' : 'Unpublished'} product: ${p.nameEn}`,
    });
  };

  const handleDelete = async (p: Product) => {
    if (!userProfile) return;
    await deleteProduct(p.id);
    await logAdminActivity({
      actorUid: userProfile.uid,
      actorEmail: userProfile.email,
      actorRole: userProfile.role,
      action: 'product_deleted',
      entityType: 'product',
      entityId: p.id,
      summaryAr: `حذف المنتج: ${p.nameAr}`,
      summaryEn: `Deleted product: ${p.nameEn}`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    setSaving(true);
    try {
      const cat = categories.find((c) => c.id === editing.categoryId);
      const br = brands.find((b) => b.id === editing.brandId);
      const prev = Number(editing.previousPrice || 0);
      const retail = Number(editing.retailPrice || 0);
      const autoDiscount =
        prev > retail && prev > 0 ? Math.round(((prev - retail) / prev) * 100) : 0;

      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      const finalProduct: Product = {
        ...editing,
        categoryNameAr: cat?.nameAr || editing.categoryNameAr || '',
        categoryNameEn: cat?.nameEn || editing.categoryNameEn || '',
        brandName: br?.nameEn || editing.brandName || '',
        retailPrice: retail,
        previousPrice: prev,
        discountPercentage: autoDiscount,
        availableQuantity: Number(editing.availableQuantity || 0),
        tags,
      };
      await saveProduct(finalProduct, wholesalePrice, supplierNotes, userProfile.uid);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'product_saved',
        entityType: 'product',
        entityId: finalProduct.id,
        summaryAr: `حفظ المنتج: ${finalProduct.nameAr}`,
        summaryEn: `Saved product: ${finalProduct.nameEn}`,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.nameAr.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      (p.modelNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0E0E10]">
            {t(lang, 'إدارة المنتجات والأسعار', 'Products & Pricing Management')}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t(
              lang,
              'أضف وعدّل المنتجات، أسعار التجزئة والجملة الخاصة بالإدارة، الصور المتعددة وحالات التوفر.',
              'Add, edit, duplicate, publish/unpublish hardware with admin-only wholesale prices.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2.5 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة منتج جديد', 'Add Product')}</span>
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-[#C89D3C]/50 rounded-xl p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#F0F0EC] pb-3">
            <h3 className="text-base font-bold text-[#0E0E10]">
              {editing.nameAr
                ? t(lang, `تعديل: ${editing.nameAr}`, `Edit: ${editing.nameEn}`)
                : t(lang, 'إضافة جهاز شبكة جديد', 'Add New Networking Product')}
            </h3>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-neutral-500 hover:text-[#0E0E10] cursor-pointer"
            >
              {t(lang, 'إلغاء', 'Cancel')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'اسم المنتج بالعربية *', 'Product Name (Arabic) *')}
              </label>
              <input
                required
                value={editing.nameAr}
                onChange={(e) => setEditing({ ...editing, nameAr: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'اسم المنتج بالإنجليزية *', 'Product Name (English) *')}
              </label>
              <input
                required
                value={editing.nameEn}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'التصنيف', 'Category')}
              </label>
              <select
                value={editing.categoryId}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'ar' ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'العلامة التجارية', 'Brand')}
              </label>
              <select
                value={editing.brandId}
                onChange={(e) => setEditing({ ...editing, brandId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {lang === 'ar' ? b.nameAr : b.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'رقم الموديل', 'Model Number')}
              </label>
              <input
                value={editing.modelNumber || ''}
                onChange={(e) => setEditing({ ...editing, modelNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'حالة التوفر', 'Product Status')}
              </label>
              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value as ProductStatus })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              >
                {(Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {lang === 'ar' ? PRODUCT_STATUS_LABELS[st].ar : PRODUCT_STATUS_LABELS[st].en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'سعر البيع (تجزئة) $', 'Retail Price ($)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editing.retailPrice}
                onChange={(e) =>
                  setEditing({ ...editing, retailPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'السعر السابق $', 'Previous Price ($)')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editing.previousPrice || 0}
                onChange={(e) =>
                  setEditing({ ...editing, previousPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9E7822] mb-1">
                {t(lang, 'سعر الجملة (للإدارة فقط) $', 'Wholesale Price (Admin Only) $')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[#FAF5E8] border border-[#C89D3C]/50 rounded-lg font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الكمية المتوفرة', 'Available Quantity')}
              </label>
              <input
                type="number"
                min="0"
                required
                value={editing.availableQuantity}
                onChange={(e) =>
                  setEditing({ ...editing, availableQuantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الوصف بالعربية', 'Description (Arabic)')}
              </label>
              <textarea
                rows={3}
                value={editing.descriptionAr || ''}
                onChange={(e) => setEditing({ ...editing, descriptionAr: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الوصف بالإنجليزية', 'Description (English)')}
              </label>
              <textarea
                rows={3}
                value={editing.descriptionEn || ''}
                onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'المواصفات التقنية (عربي)', 'Technical Specs (Arabic)')}
              </label>
              <textarea
                rows={2}
                value={editing.specsAr || ''}
                onChange={(e) => setEditing({ ...editing, specsAr: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'المواصفات التقنية (إنجليزي)', 'Technical Specs (English)')}
              </label>
              <textarea
                rows={2}
                value={editing.specsEn || ''}
                onChange={(e) => setEditing({ ...editing, specsEn: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
          </div>

          {/* Multi-Image Manager */}
          <div className="space-y-3 border-t border-[#F0F0EC] pt-4">
            <ImageUploader
              label={t(lang, 'إضافة صورة للمنتج (رفع ملف أو اختيار من الجاهز)', 'Add Product Image')}
              value={imageUrlInput}
              onChange={(url) => {
                setImageUrlInput('');
                if (url) {
                  const list = [...(editing.images || []), url].slice(0, 8);
                  setEditing({ ...editing, images: list });
                }
              }}
            />
            {(editing.images || []).length > 0 && (
              <div className="flex flex-wrap gap-3">
                {(editing.images || []).map((img, i) => (
                  <div key={i} className="relative w-24 h-20 rounded-lg overflow-hidden border border-[#E5E5E0]">
                    <ResilientImage src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          images: (editing.images || []).filter((_, idx) => idx !== i),
                        })
                      }
                      className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/80 text-white text-[10px] cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الوسوم (مفصولة بفاصلة)', 'Tags (comma-separated)')}
              </label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="MikroTik, Wi-Fi 6, OpenWrt"
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'الضمان', 'Warranty')}
              </label>
              <input
                value={lang === 'ar' ? editing.warrantyAr || '' : editing.warrantyEn || ''}
                onChange={(e) =>
                  setEditing(
                    lang === 'ar'
                      ? { ...editing, warrantyAr: e.target.value }
                      : { ...editing, warrantyEn: e.target.value }
                  )
                }
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'رابط الوثائق الفنية', 'Documentation URL')}
              </label>
              <input
                value={editing.documentationUrl || ''}
                onChange={(e) => setEditing({ ...editing, documentationUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg font-mono-num"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5 pt-2 text-xs font-semibold">
            {[
              { key: 'isPublished', ar: 'منشور للعملاء', en: 'Published' },
              { key: 'isFeatured', ar: 'منتج مميز', en: 'Featured' },
              { key: 'isNewArrival', ar: 'وصل حديثاً', en: 'New Arrival' },
              { key: 'isExclusive', ar: 'حصري', en: 'Exclusive' },
              { key: 'isBestSeller', ar: 'الأكثر مبيعاً', en: 'Best Seller' },
            ].map((flag) => (
              <label key={flag.key} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((editing as unknown as Record<string, unknown>)[flag.key])}
                  onChange={(e) =>
                    setEditing({ ...editing, [flag.key]: e.target.checked } as Product)
                  }
                />
                <span>{lang === 'ar' ? flag.ar : flag.en}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[#E5E5E0] text-xs font-semibold cursor-pointer"
            >
              {t(lang, 'إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-[#0E0E10] text-white text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
            >
              {saving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ المنتج', 'Save Product')}
            </button>
          </div>
        </form>
      )}

      {/* Search & Table */}
      <div className="bg-white border border-[#E5E5E0] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#F0F0EC]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(lang, 'تصفية المنتجات بالاسم أو الموديل...', 'Filter products...')}
            className="w-full sm:w-80 px-3.5 py-2 text-sm bg-[#F8F8F7] border border-[#E5E5E0] rounded-lg focus:outline-none focus:border-[#C89D3C]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#F8F8F7] text-neutral-600 border-b border-[#E5E5E0]">
              <tr>
                <th className="py-3 px-4 text-start">{t(lang, 'المنتج', 'Product')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'التصنيف', 'Category')}</th>
                <th className="py-3 px-4 text-end">{t(lang, 'التجزئة', 'Retail')}</th>
                <th className="py-3 px-4 text-end">{t(lang, 'الجملة', 'Wholesale')}</th>
                <th className="py-3 px-4 text-end">{t(lang, 'المخزون', 'Stock')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'الحالة', 'Status')}</th>
                <th className="py-3 px-4 text-end">{t(lang, 'إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#F8F8F7]/60">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-9 rounded-md overflow-hidden bg-neutral-100 shrink-0">
                        <ResilientImage src={p.images?.[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-[#0E0E10]">
                          {lang === 'ar' ? p.nameAr : p.nameEn}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono-num">
                          {p.brandName} · {p.modelNumber || p.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {lang === 'ar' ? p.categoryNameAr : p.categoryNameEn}
                  </td>
                  <td className="py-3 px-4 text-end font-mono-num font-bold">
                    {formatCurrency(p.retailPrice)}
                  </td>
                  <td className="py-3 px-4 text-end font-mono-num text-[#9E7822]">
                    {formatCurrency(wholesaleMap[p.id]?.wholesalePrice || 0)}
                  </td>
                  <td className="py-3 px-4 text-end font-mono-num">{p.availableQuantity}</td>
                  <td className="py-3 px-4">
                    <span className={p.isPublished ? 'text-emerald-700 font-semibold' : 'text-neutral-400'}>
                      {p.isPublished ? t(lang, 'منشور', 'Published') : t(lang, 'مسودة', 'Draft')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        title={t(lang, 'تعديل', 'Edit')}
                        className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(p)}
                        title={t(lang, 'نسخ', 'Duplicate')}
                        className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(p)}
                        title={t(lang, 'نشر / إخفاء', 'Publish / Unpublish')}
                        className="p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                      >
                        {p.isPublished ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
                        title={t(lang, 'حذف', 'Delete')}
                        className="p-1.5 rounded hover:bg-rose-100 text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

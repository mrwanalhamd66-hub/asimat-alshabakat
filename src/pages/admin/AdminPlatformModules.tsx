import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Edit3,
  Eye,
  EyeOff,
  FlaskConical,
  Gift,
  Layers,
  MessageSquare,
  Pin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { t } from '../../i18n/translations.ts';
import {
  adminVerifyEngineerBadge,
  awardLoyaltyPoints,
  deleteCommunityPost,
  logAdminActivity,
  removeLabResource,
  removeProjectPackage,
  removeRewardOffer,
  reviewLabResource,
  saveProjectPackage,
  saveRewardOffer,
  subscribeCommunityPosts,
  subscribeCommunityReports,
  subscribePublicEngineers,
  updateCommunityPost,
  updateCommunityReportStatus,
} from '../../services/firestoreService.ts';
import type {
  CommunityPost,
  CommunityReport,
  EngineerProfile,
  ProjectPackage,
  ProjectPackageCategoryType,
  ProjectPackageItem,
  RewardOffer,
} from '../../types/index.ts';
import { ImageUploader } from '../../components/ImageUploader.tsx';

// =========================================================================
// 1. PROJECT PACKAGES ADMIN MODULE
// =========================================================================
const PACKAGE_CATEGORIES: { id: ProjectPackageCategoryType; ar: string; en: string }[] = [
  { id: 'internet_setup', ar: 'تأسيس شبكة إنترنت', en: 'Internet Setup' },
  { id: 'isp', ar: 'مزودي خدمة ISP', en: 'ISP Core' },
  { id: 'cctv', ar: 'كاميرات المراقبة', en: 'CCTV' },
  { id: 'wireless_link', ar: 'الربط اللاسلكي', en: 'Wireless Link' },
  { id: 'server_room', ar: 'غرف السيرفرات', en: 'Server Room' },
  { id: 'smb', ar: 'الشركات الصغيرة والمتوسطة', en: 'SMB Network' },
];

export function AdminPackagesModule() {
  const { lang, projectPackages, products, userProfile } = useApp();
  const [editing, setEditing] = useState<ProjectPackage | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    const now = new Date().toISOString();
    setEditing({
      id: `pkg_${Date.now()}`,
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      categoryType: 'internet_setup',
      targetSubscribers: '50 - 150',
      coverageArea: '300m',
      items: products[0]
        ? [{ productId: products[0].id, quantity: 1, roleAr: 'راوتر أساسي', roleEn: 'Core Router' }]
        : [],
      packageDiscountPercent: 5,
      imageUrl: '',
      isFeatured: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !userProfile) return;
    setSaving(true);
    try {
      const next: ProjectPackage = {
        ...editing,
        titleEn: editing.titleEn.trim() || editing.titleAr.trim(),
        packageDiscountPercent: Math.max(0, Math.min(50, Number(editing.packageDiscountPercent || 0))),
        items: editing.items.filter((i) => i.productId && i.quantity >= 1),
        updatedAt: new Date().toISOString(),
      };
      await saveProjectPackage(next);
      await logAdminActivity({
        actorUid: userProfile.uid,
        actorEmail: userProfile.email,
        actorRole: userProfile.role,
        action: 'package_saved',
        entityType: 'project_package',
        entityId: next.id,
        summaryAr: `حفظ باقة مشروع: ${next.titleAr}`,
        summaryEn: `Saved project package: ${next.titleEn}`,
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#C89D3C]" />
            <span>{t(lang, 'إدارة الباقات الجاهزة ومشاريع الشبكات', 'Ready Project Packages Management')}</span>
          </h2>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة باقة جديدة', 'Add Package')}</span>
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/50 rounded-xl p-6 space-y-4"
        >
          <div className="flex justify-between items-center border-b border-[#F0F0EC] dark:border-white/10 pb-3">
            <h3 className="text-base font-bold">
              {editing.titleAr || t(lang, 'باقة مشروع جديدة', 'New Project Package')}
            </h3>
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-neutral-500 cursor-pointer">
              {t(lang, 'إلغاء', 'Cancel')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              value={editing.titleAr}
              onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
              placeholder={t(lang, 'اسم الباقة (عربي) *', 'Package Title (AR) *')}
              className="px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            />
            <input
              value={editing.titleEn}
              onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
              placeholder={t(lang, 'اسم الباقة (إنجليزي)', 'Package Title (EN)')}
              className="px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            />
            <select
              value={editing.categoryType}
              onChange={(e) =>
                setEditing({ ...editing, categoryType: e.target.value as ProjectPackageCategoryType })
              }
              className="px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            >
              {PACKAGE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' ? c.ar : c.en}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input
                value={editing.targetSubscribers || ''}
                onChange={(e) => setEditing({ ...editing, targetSubscribers: e.target.value })}
                placeholder="Subscribers"
                className="px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
              <input
                value={editing.coverageArea || ''}
                onChange={(e) => setEditing({ ...editing, coverageArea: e.target.value })}
                placeholder="Coverage"
                className="px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
              <input
                type="number"
                min={0}
                max={50}
                value={editing.packageDiscountPercent || 0}
                onChange={(e) =>
                  setEditing({ ...editing, packageDiscountPercent: Number(e.target.value) })
                }
                placeholder="Disc %"
                className="px-2.5 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
              />
            </div>
          </div>

          <textarea
            rows={2}
            value={editing.descriptionAr || ''}
            onChange={(e) => setEditing({ ...editing, descriptionAr: e.target.value })}
            placeholder={t(lang, 'وصف الباقة ومميزاتها...', 'Package description...')}
            className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
          />

          <ImageUploader
            label={t(lang, 'صورة الباقة', 'Package Image')}
            value={editing.imageUrl || ''}
            onChange={(url) => setEditing({ ...editing, imageUrl: url })}
          />

          <div className="space-y-2 border-t border-[#F0F0EC] dark:border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{t(lang, 'الأجهزة المكونة للباقة', 'Package Hardware Items')}</span>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    items: [
                      ...editing.items,
                      {
                        productId: products[0]?.id || '',
                        quantity: 1,
                        roleAr: '',
                        roleEn: '',
                      },
                    ],
                  })
                }
                className="px-2.5 py-1 rounded border border-[#C89D3C] text-xs font-semibold cursor-pointer"
              >
                + {t(lang, 'إضافة جهاز', 'Add Item')}
              </button>
            </div>
            {editing.items.map((it: ProjectPackageItem, idx: number) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <select
                  value={it.productId}
                  onChange={(e) => {
                    const next = [...editing.items];
                    next[idx] = { ...it, productId: e.target.value };
                    setEditing({ ...editing, items: next });
                  }}
                  className="sm:col-span-6 px-2.5 py-1.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === 'ar' ? p.nameAr : p.nameEn} (${p.retailPrice})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => {
                    const next = [...editing.items];
                    next[idx] = { ...it, quantity: Number(e.target.value) };
                    setEditing({ ...editing, items: next });
                  }}
                  className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                />
                <input
                  value={it.roleAr || ''}
                  onChange={(e) => {
                    const next = [...editing.items];
                    next[idx] = { ...it, roleAr: e.target.value };
                    setEditing({ ...editing, items: next });
                  }}
                  placeholder={t(lang, 'الدور في الشبكة', 'Role')}
                  className="sm:col-span-3 px-2.5 py-1.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) })
                  }
                  className="sm:col-span-1 p-1.5 text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              <span>{t(lang, 'نشطة ومفعلة في المتجر', 'Active in Store')}</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
            >
              {saving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ الباقة', 'Save Package')}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 flex flex-col justify-between gap-3"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#9E7822] dark:text-[#D4AF37]">{pkg.categoryType}</span>
                <span className={pkg.isActive ? 'text-emerald-600' : 'text-neutral-400'}>
                  {pkg.isActive ? t(lang, 'مفعلة', 'Active') : t(lang, 'معطلة', 'Inactive')}
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1">{lang === 'ar' ? pkg.titleAr : pkg.titleEn}</h3>
              <p className="text-xs text-neutral-500 mt-1">
                {pkg.items.length} {t(lang, 'مكونات', 'items')} · {t(lang, 'خصم', 'Discount')}{' '}
                {pkg.packageDiscountPercent || 0}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing({ ...pkg })}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t(lang, 'تعديل', 'Edit')}</span>
              </button>
              <button
                type="button"
                onClick={() => void removeProjectPackage(pkg.id)}
                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t(lang, 'حذف', 'Delete')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 2. COMMUNITY MODERATION ADMIN MODULE
// =========================================================================
export function AdminCommunityModule() {
  const { lang } = useApp();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  useEffect(() => {
    const u1 = subscribeCommunityPosts(true, setPosts);
    const u2 = subscribeCommunityReports(setReports);
    return () => {
      u1();
      u2();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-[#C89D3C]" />
        <span>{t(lang, 'إشراف مجتمع عاصمة الشبكات والبلاغات', 'Community Moderation & Reports')}</span>
      </h2>

      {/* Reports */}
      <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold">
          {t(lang, 'البلاغات الواردة', 'Moderation Reports')} ({reports.filter((r) => r.status === 'pending').length}{' '}
          {t(lang, 'معلق', 'pending')})
        </h3>
        {reports.length === 0 ? (
          <p className="text-xs text-neutral-500">{t(lang, 'لا توجد بلاغات.', 'No reports.')}</p>
        ) : (
          <div className="space-y-2.5">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-lg bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold">
                    [{rep.targetType}] {rep.reason}
                  </div>
                  <div className="text-neutral-500">
                    {rep.reporterName} · {rep.details || rep.targetId} ·{' '}
                    <span className="font-semibold">{rep.status}</span>
                  </div>
                </div>
                {rep.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void updateCommunityReportStatus(rep.id, 'reviewed')}
                      className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold cursor-pointer"
                    >
                      {t(lang, 'تمت المعالجة', 'Mark Reviewed')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateCommunityReportStatus(rep.id, 'dismissed')}
                      className="px-3 py-1 rounded border border-[#E5E5E0] dark:border-white/10 font-semibold cursor-pointer"
                    >
                      {t(lang, 'تجاهل', 'Dismiss')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold">{t(lang, 'مشاركات المجتمع', 'Community Posts')} ({posts.length})</h3>
        <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
          {posts.map((post) => (
            <div key={post.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 max-w-xl">
                <div className="flex items-center gap-2">
                  {post.isPinned && <Pin className="w-3.5 h-3.5 text-[#C89D3C]" />}
                  <span className="font-bold text-sm">{post.title}</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/10">{post.category}</span>
                </div>
                <p className="text-neutral-500 truncate">{post.authorName} · {post.content}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void updateCommunityPost(post.id, { isPinned: !post.isPinned })}
                  className="px-2.5 py-1.5 rounded border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{post.isPinned ? t(lang, 'إلغاء التثبيت', 'Unpin') : t(lang, 'تثبيت', 'Pin')}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void updateCommunityPost(post.id, {
                      status: post.status === 'active' ? 'hidden' : 'active',
                    })
                  }
                  className="px-2.5 py-1.5 rounded border border-[#E5E5E0] dark:border-white/10 inline-flex items-center gap-1 cursor-pointer"
                >
                  {post.status === 'active' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{post.status === 'active' ? t(lang, 'إخفاء', 'Hide') : t(lang, 'إظهار', 'Restore')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCommunityPost(post.id)}
                  className="px-2.5 py-1.5 rounded border border-rose-200 text-rose-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 3. TECHNICAL LAB MODERATION ADMIN MODULE
// =========================================================================
export function AdminLabModule() {
  const { lang, labResources } = useApp();
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-[#C89D3C]" />
          <span>{t(lang, 'إدارة واعتماد موارد المختبر التقني', 'Technical Lab Moderation')}</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t(
            lang,
            'مراجعة واعتماد السكربتات وملفات الإعدادات المقترحة من المهندسين قبل نشرها للجميع.',
            'Review and approve/reject user-submitted scripts & configs before public listing.'
          )}
        </p>
      </div>

      <div className="space-y-4">
        {labResources.map((res) => (
          <div
            key={res.id}
            className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#FAF5E8] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37] font-bold">
                    {res.resourceType}
                  </span>
                  <span
                    className={`font-bold ${
                      res.status === 'approved'
                        ? 'text-emerald-600'
                        : res.status === 'pending_review'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {res.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold mt-1">{res.title}</h3>
                <p className="text-xs text-neutral-500">{res.authorName} · {res.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => void removeLabResource(res.id)}
                className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <pre
              dir="ltr"
              className="p-3 rounded-lg bg-[#0E0E10] text-emerald-300 text-xs overflow-x-auto max-h-40 font-mono-num"
            >
              {res.contentBody}
            </pre>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={notesMap[res.id] ?? res.reviewNote ?? ''}
                onChange={(e) => setNotesMap({ ...notesMap, [res.id]: e.target.value })}
                placeholder={t(lang, 'ملاحظة المراجع (اختياري)...', 'Reviewer note (optional)...')}
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
              <button
                type="button"
                onClick={() =>
                  void reviewLabResource(
                    res.id,
                    'approved',
                    notesMap[res.id],
                    res.authorUid,
                    res.title
                  )
                }
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t(lang, 'اعتماد ونشر', 'Approve')}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void reviewLabResource(res.id, 'rejected', notesMap[res.id], res.authorUid, res.title)
                }
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t(lang, 'رفض', 'Reject')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// 4. ENGINEERS VERIFICATION ADMIN MODULE
// =========================================================================
export function AdminEngineersModule() {
  const { lang } = useApp();
  const [engineers, setEngineers] = useState<EngineerProfile[]>([]);
  const [badgeTexts, setBadgeTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    return subscribePublicEngineers(true, setEngineers);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-[#C89D3C]" />
        <span>{t(lang, 'اعتماد وتوثيق بطاقات المهندسين', 'Engineers Verification & Directory')}</span>
      </h2>

      <div className="space-y-3">
        {engineers.length === 0 ? (
          <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-8 text-center text-xs text-neutral-500">
            {t(lang, 'لا توجد ملفات مهندسين مسجلة بعد.', 'No engineer profiles created yet.')}
          </div>
        ) : (
          engineers.map((eng) => (
            <div
              key={eng.uid}
              className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{eng.fullName}</span>
                    <span className="font-mono-num text-xs text-[#9E7822] dark:text-[#D4AF37]">
                      {eng.membershipId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        eng.isVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : eng.verificationStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {eng.isVerified
                        ? t(lang, 'معتمد ✓', 'Verified ✓')
                        : eng.verificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {eng.specialty} · {eng.yearsExperience}y · {eng.governorate} ·{' '}
                    {eng.showInDirectory ? t(lang, 'ظاهر في الدليل', 'In Directory') : t(lang, 'خاص', 'Private')}
                  </p>
                  {eng.projectsSummary && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">{eng.projectsSummary}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={badgeTexts[eng.uid] ?? eng.verificationBadge ?? 'مهندس شبكات معتمد'}
                  onChange={(e) => setBadgeTexts({ ...badgeTexts, [eng.uid]: e.target.value })}
                  placeholder={t(lang, 'نص الشارة (مثال: مهندس MikroTik معتمد)', 'Badge label')}
                  className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() =>
                    void adminVerifyEngineerBadge(
                      eng,
                      true,
                      badgeTexts[eng.uid] ?? eng.verificationBadge ?? 'مهندس شبكات معتمد'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold cursor-pointer"
                >
                  {t(lang, 'منح شارة التوثيق', 'Approve & Verify')}
                </button>
                {eng.isVerified && (
                  <button
                    type="button"
                    onClick={() => void adminVerifyEngineerBadge(eng, false, '')}
                    className="px-3.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    {t(lang, 'سحب التوثيق', 'Revoke Badge')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =========================================================================
// 5. REWARDS & LOYALTY ADMIN MODULE
// =========================================================================
export function AdminRewardsModule() {
  const { lang, rewardOffers } = useApp();
  const [editing, setEditing] = useState<RewardOffer | null>(null);
  const [bonusUid, setBonusUid] = useState('');
  const [bonusPoints, setBonusPoints] = useState(50);
  const [bonusReason, setBonusReason] = useState('مكافأة مساهمة هندسية متميزة');
  const [bonusMsg, setBonusMsg] = useState('');

  const openNewOffer = () => {
    const now = new Date().toISOString();
    setEditing({
      id: `rew_${Date.now()}`,
      titleAr: '',
      titleEn: '',
      descriptionAr: '',
      descriptionEn: '',
      pointsCost: 200,
      discountCode: 'ASEMA-VIP',
      discountValueText: '$15',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    await saveRewardOffer({
      ...editing,
      titleEn: editing.titleEn.trim() || editing.titleAr.trim(),
      pointsCost: Math.max(10, Number(editing.pointsCost || 100)),
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
  };

  const handleGrantBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusUid.trim()) return;
    await awardLoyaltyPoints({
      uid: bonusUid.trim(),
      points: bonusPoints,
      source: 'bonus',
      titleAr: bonusReason,
      badgeId: 'community_helper',
    });
    setBonusMsg(t(lang, 'تم منح النقاط بنجاح.', 'Bonus points awarded.'));
    setBonusUid('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#C89D3C]" />
          <span>{t(lang, 'إدارة النقاط وعروض المكافآت', 'Rewards & Loyalty Management')}</span>
        </h2>
        <button
          type="button"
          onClick={openNewOffer}
          className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t(lang, 'إضافة مكافأة جديدة', 'Add Reward Offer')}</span>
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSaveOffer}
          className="bg-white dark:bg-[#17171B] border border-[#C89D3C]/50 rounded-xl p-5 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              value={editing.titleAr}
              onChange={(e) => setEditing({ ...editing, titleAr: e.target.value })}
              placeholder={t(lang, 'عنوان العرض (عربي) *', 'Offer Title (AR) *')}
              className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            />
            <input
              value={editing.titleEn}
              onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })}
              placeholder={t(lang, 'عنوان العرض (إنجليزي)', 'Offer Title (EN)')}
              className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
            />
            <input
              type="number"
              min={10}
              value={editing.pointsCost}
              onChange={(e) => setEditing({ ...editing, pointsCost: Number(e.target.value) })}
              placeholder="Points Cost"
              className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editing.discountValueText}
                onChange={(e) => setEditing({ ...editing, discountValueText: e.target.value })}
                placeholder="Value (e.g. $20)"
                className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
              <input
                value={editing.discountCode || ''}
                onChange={(e) => setEditing({ ...editing, discountCode: e.target.value })}
                placeholder="Promo Code"
                className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-neutral-500 cursor-pointer">
              {t(lang, 'إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold cursor-pointer"
            >
              {t(lang, 'حفظ العرض', 'Save Offer')}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewardOffers.map((offer) => (
          <div
            key={offer.id}
            className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-4 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-bold text-sm">{lang === 'ar' ? offer.titleAr : offer.titleEn}</div>
              <div className="text-xs text-[#9E7822] dark:text-[#D4AF37] font-mono-num">
                {offer.pointsCost} pts · {offer.discountValueText} · {offer.discountCode}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing({ ...offer })}
                className="p-1.5 border border-[#E5E5E0] dark:border-white/10 rounded cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void removeRewardOffer(offer.id)}
                className="p-1.5 border border-rose-200 text-rose-600 rounded cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Bonus Grant */}
      <form
        onSubmit={handleGrantBonus}
        className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3"
      >
        <h3 className="text-sm font-bold">{t(lang, 'منح نقاط تشجيعية يدوياً لمستخدم', 'Award Bonus Points Manually')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            required
            value={bonusUid}
            onChange={(e) => setBonusUid(e.target.value)}
            placeholder="User UID"
            className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
          />
          <input
            type="number"
            min={5}
            max={1000}
            value={bonusPoints}
            onChange={(e) => setBonusPoints(Number(e.target.value))}
            className="px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
          />
          <input
            value={bonusReason}
            onChange={(e) => setBonusReason(e.target.value)}
            placeholder={t(lang, 'السبب', 'Reason')}
            className="md:col-span-2 px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
          />
        </div>
        {bonusMsg && <p className="text-xs text-emerald-600 font-semibold">{bonusMsg}</p>}
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold cursor-pointer"
        >
          {t(lang, 'إضافة النقاط الآن', 'Grant Bonus Points')}
        </button>
      </form>
    </div>
  );
}

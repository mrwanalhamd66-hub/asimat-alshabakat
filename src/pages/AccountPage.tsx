import React, { useEffect, useState } from 'react';
import {
  Award,
  BadgeCheck,
  Bell,
  Check,
  CreditCard,
  Download,
  Eye,
  FileText,
  Gift,
  Heart,
  LogOut,
  Package,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  INVOICE_PAYMENT_STATUS_LABELS,
  PRODUCT_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  YEMEN_GOVERNORATES,
  formatCurrency,
  t,
} from '../i18n/translations.ts';
import {
  cancelCustomerReservation,
  getEngineerProfile,
  markNotificationRead,
  redeemRewardOffer,
  removeAlertSubscription,
  saveEngineerProfile,
  subscribeCustomerReservations,
  subscribeInvoices,
  updateUserRoleAndPermissions,
} from '../services/firestoreService.ts';
import type {
  EngineerProfile,
  Invoice,
  Reservation,
  RewardOffer,
} from '../types/index.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { InvoicePreviewModal } from '../components/InvoicePreviewModal.tsx';
import { EngineerCardModal } from '../components/EngineerCardModal.tsx';
import { ImageUploader } from '../components/ImageUploader.tsx';
import { downloadInvoicePdf } from '../utils/invoicePdf.ts';

type AccountTab = 'overview' | 'engineer' | 'rewards' | 'alerts';

const BADGE_LABELS: Record<string, { ar: string; en: string }> = {
  verified_buyer: { ar: 'مشتري موثوق', en: 'Verified Buyer' },
  enterprise_buyer: { ar: 'شريك مشاريع شبكات', en: 'Enterprise Partner' },
  academy_certified: { ar: 'خريج أكاديمية عاصمة الشبكات', en: 'Academy Certified' },
  community_helper: { ar: 'مساهم تقني فعّال', en: 'Community Contributor' },
};

export function AccountPage() {
  const {
    lang,
    firebaseUser,
    userProfile,
    signInWithGoogle,
    authLoading,
    authError,
    clearAuthError,
    logout,
    isAdminOrStaff,
    isTrainerOrStaff,
    navigate,
    products,
    setSelectedProduct,
    favorites,
    isFavoriteBusy,
    removeFromFavorites,
    storeSettings,
    userRewards,
    rewardOffers,
    alertSubscriptions,
    userNotifications,
    unreadNotificationsCount,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AccountTab>('overview');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  // Delivery profile state
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState(YEMEN_GOVERNORATES[0].ar);
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Engineer Identity state
  const [engineerProfile, setEngineerProfile] = useState<EngineerProfile | null>(null);
  const [engForm, setEngForm] = useState({
    fullName: '',
    photoUrl: '',
    specialty: 'مهندس شبكات MikroTik & Ubiquiti',
    yearsExperience: 3,
    skillsText: 'MikroTik RouterOS, VLAN, Wireless PtP, Fiber, PoE',
    certificatesText: '',
    projectsSummary: '',
    governorate: YEMEN_GOVERNORATES[0].ar,
    contactPhone: '',
    showInDirectory: false,
  });
  const [savingEng, setSavingEng] = useState(false);
  const [engMsg, setEngMsg] = useState('');
  const [cardModalOpen, setCardModalOpen] = useState(false);

  // Rewards state
  const [redeemBusyId, setRedeemBusyId] = useState<string | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setGovernorate(userProfile.governorate || YEMEN_GOVERNORATES[0].ar);
      setAddress(userProfile.address || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!firebaseUser) return;
    const u1 = subscribeCustomerReservations(firebaseUser.uid, setReservations);
    const u2 = subscribeInvoices('customer', firebaseUser.uid, setInvoices);
    getEngineerProfile(firebaseUser.uid)
      .then((prof) => {
        if (prof) {
          setEngineerProfile(prof);
          setEngForm({
            fullName: prof.fullName || '',
            photoUrl: prof.photoUrl || '',
            specialty: prof.specialty || 'مهندس شبكات MikroTik & Ubiquiti',
            yearsExperience: prof.yearsExperience ?? 1,
            skillsText: (prof.skills || []).join(', '),
            certificatesText: (prof.certificates || []).join(', '),
            projectsSummary: prof.projectsSummary || '',
            governorate: prof.governorate || YEMEN_GOVERNORATES[0].ar,
            contactPhone: prof.contactPhone || '',
            showInDirectory: Boolean(prof.showInDirectory),
          });
        } else if (userProfile) {
          setEngForm((prev) => ({
            ...prev,
            fullName: userProfile.displayName || '',
            governorate: userProfile.governorate || YEMEN_GOVERNORATES[0].ar,
            contactPhone: userProfile.phone || '',
          }));
        }
      })
      .catch(() => null);
    return () => {
      u1();
      u2();
    };
  }, [firebaseUser, userProfile]);

  if (!firebaseUser || !userProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center space-y-6">
        <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-2xl p-8 sm:p-10 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0E0E10] dark:text-white">
            {t(lang, 'حساب العميل والهوية المهنية', 'Customer Account & Engineer Identity')}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {t(
              lang,
              'سجل دخولك لإدارة هويتك المهنية، بطاقة العضوية، نقاط المكافآت، المفضلة، الحجوزات والفواتير الإلكترونية.',
              'Sign in to manage your Engineer Identity Card, loyalty rewards, wishlist, reservations, and PDF invoices.'
            )}
          </p>
          {authError && (
            <div className="flex items-start justify-between gap-3 text-start bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3.5 py-2.5 text-xs">
              <span>{authError}</span>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-amber-700 hover:text-amber-950 shrink-0 cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={authLoading}
            className="w-full py-3 px-6 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] font-semibold text-sm hover:bg-[#C89D3C] hover:text-[#0E0E10] dark:hover:bg-[#D4AF37] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {authLoading
              ? t(lang, 'جاري فتح نافذة تسجيل الدخول...', 'Opening Google sign-in...')
              : t(lang, 'تسجيل الدخول عبر Google', 'Sign In with Google')}
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice('');
    try {
      await updateUserRoleAndPermissions({
        ...userProfile,
        displayName,
        phone,
        governorate,
        address,
      });
      setSavedNotice(t(lang, 'تم حفظ بيانات الحساب بنجاح.', 'Profile updated successfully.'));
    } finally {
      setSaving(false);
    }
  };

  const buildNextEngineerProfile = (requestVerification = false): EngineerProfile => {
    const now = new Date().toISOString();
    const existingId =
      engineerProfile?.membershipId ||
      `ASM-ENG-${String(Math.floor(1000 + Math.random() * 8999))}`;
    const skills = engForm.skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 15);
    const certificates = engForm.certificatesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    const verificationStatus: EngineerProfile['verificationStatus'] = requestVerification
      ? engineerProfile?.isVerified
        ? 'approved'
        : 'pending'
      : engineerProfile?.verificationStatus || 'none';

    return {
      uid: firebaseUser.uid,
      membershipId: existingId,
      fullName: engForm.fullName.trim() || userProfile.displayName || 'مهندس شبكات',
      photoUrl: engForm.photoUrl.trim(),
      specialty: engForm.specialty.trim() || 'مهندس شبكات',
      yearsExperience: Math.max(0, Math.min(60, Number(engForm.yearsExperience || 0))),
      skills,
      certificates,
      projectsSummary: engForm.projectsSummary.trim().slice(0, 600),
      governorate: engForm.governorate,
      contactPhone: engForm.contactPhone.trim(),
      contactEmail: userProfile.email,
      showInDirectory: engForm.showInDirectory,
      isVerified: Boolean(engineerProfile?.isVerified),
      verificationBadge: engineerProfile?.verificationBadge || '',
      verificationStatus,
      createdAt: engineerProfile?.createdAt || now,
      updatedAt: now,
    };
  };

  const handleSaveEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEng(true);
    setEngMsg('');
    try {
      const next = buildNextEngineerProfile(false);
      await saveEngineerProfile(next);
      setEngineerProfile(next);
      setEngMsg(
        t(
          lang,
          'تم حفظ ملفك المهني وتحديث بطاقة العضوية الرقمية بنجاح.',
          'Engineer profile & membership ID saved successfully.'
        )
      );
    } finally {
      setSavingEng(false);
    }
  };

  const handleRequestVerification = async () => {
    setSavingEng(true);
    setEngMsg('');
    try {
      const next = buildNextEngineerProfile(true);
      await saveEngineerProfile(next);
      setEngineerProfile(next);
      setEngMsg(
        t(
          lang,
          'تم إرسال طلب توثيق الشارة المهنية لإدارة عاصمة الشبكات للمراجعة.',
          'Verification badge request submitted to ASEMA administration.'
        )
      );
    } finally {
      setSavingEng(false);
    }
  };

  const handleRedeemOffer = async (offer: RewardOffer) => {
    setRedeemBusyId(offer.id);
    setRedeemMsg(null);
    try {
      await redeemRewardOffer(firebaseUser.uid, offer);
      setRedeemMsg({
        type: 'ok',
        text: t(
          lang,
          `تم استبدال العرض بنجاح! رمز الخصم الخاص بك: ${offer.discountCode || offer.discountValueText}`,
          `Offer redeemed! Your code: ${offer.discountCode || offer.discountValueText}`
        ),
      });
    } catch (err) {
      setRedeemMsg({
        type: 'err',
        text: err instanceof Error ? err.message : t(lang, 'تعذر الاستبدال', 'Redeem failed'),
      });
    } finally {
      setRedeemBusyId(null);
    }
  };

  const greetingName = engineerProfile?.fullName || userProfile.displayName || 'المهندس';
  const totalPoints = userRewards?.totalPoints || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      {/* Luxury Engineer Greeting Banner */}
      <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/40 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-lg">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
            <Sparkles className="w-4 h-4" />
            <span>{t(lang, 'هوية المهندس · عاصمة الشبكات', 'CAPITAL NETWORKS · ENGINEER PORTAL')}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-relaxed text-white">
            {lang === 'ar'
              ? `أهلاً بك يا مهندس ${greetingName} 👋 نورت عاصمة الشبكات، بيت الخبرة والابتكار في عالم الشبكات وتقنياتها.`
              : `Welcome Engineer ${greetingName} 👋 You light up ASEMA NETWORKS, the home of networking expertise and innovation.`}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="font-mono-num">{userProfile.email}</span>
            {engineerProfile?.membershipId && (
              <span className="px-2.5 py-0.5 rounded bg-[#C89D3C]/15 border border-[#C89D3C]/40 text-[#D4AF37] font-mono-num font-bold">
                {engineerProfile.membershipId}
              </span>
            )}
            {engineerProfile?.isVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>{engineerProfile.verificationBadge || t(lang, 'مهندس معتمد', 'Verified Engineer')}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (engineerProfile) {
                setCardModalOpen(true);
              } else {
                setActiveTab('engineer');
              }
            }}
            className="px-4 py-2.5 rounded-lg bg-[#1C1C22] border border-[#C89D3C]/50 text-[#D4AF37] hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{t(lang, 'بطاقة المهندس الرقمية', 'Engineer ID Card')}</span>
          </button>

          {isTrainerOrStaff && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isAdminOrStaff
                  ? t(lang, 'فتح مركز الإدارة', 'Admin Dashboard')
                  : t(lang, 'لوحة المدرب', 'Trainer Console')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2.5 rounded-lg border border-white/15 bg-white/5 text-neutral-200 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t(lang, 'خروج', 'Sign Out')}</span>
          </button>
        </div>
      </div>

      {/* Account Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="text-start bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(lang, 'المنتجات المفضلة', 'Saved Favorites')}</p>
            <p className="text-xl font-bold text-[#0E0E10] dark:text-white font-mono-num mt-0.5">{favorites.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className="text-start bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(lang, 'الحجوزات والفواتير', 'Orders & Invoices')}</p>
            <p className="text-xl font-bold text-[#0E0E10] dark:text-white font-mono-num mt-0.5">
              {reservations.length} / {invoices.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rewards')}
          className="text-start bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(lang, 'رصيد النقاط', 'Loyalty Points')}</p>
            <p className="text-xl font-bold text-[#9E7822] dark:text-[#D4AF37] font-mono-num mt-0.5">{totalPoints}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center">
            <Trophy className="w-5 h-5" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className="text-start bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] rounded-xl p-4 flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t(lang, 'التنبيهات والإشعارات', 'Alerts & Notifications')}</p>
            <p className="text-xl font-bold text-[#0E0E10] dark:text-white font-mono-num mt-0.5">
              {unreadNotificationsCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5E5E0] dark:border-white/10 pb-3">
        {[
          { id: 'overview' as const, ar: 'الحساب والطلبات والفواتير', en: 'Account, Wishlist & Invoices', icon: Package },
          { id: 'engineer' as const, ar: 'هويتي المهنية وبطاقة المهندس', en: 'Engineer Identity & ID Card', icon: Award },
          { id: 'rewards' as const, ar: 'نقاطي ومكافآتي', en: 'Points & Rewards', icon: Gift },
          { id: 'alerts' as const, ar: 'التنبيهات الذكية والإشعارات', en: 'Smart Alerts & Notifications', icon: Bell },
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const active = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setActiveTab(tabItem.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10]'
                  : 'bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:border-[#C89D3C]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{lang === 'ar' ? tabItem.ar : tabItem.en}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW (PRESERVES ALL ORIGINAL MODULES) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile Form */}
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-5 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4 h-fit"
          >
            <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
              {t(lang, 'بيانات التوصيل المحفوظة', 'Saved Delivery Profile')}
            </h2>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t(lang, 'الاسم الكامل', 'Full Name')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t(lang, 'رقم الهاتف', 'Phone Number')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="770XXXXXX"
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t(lang, 'المحافظة', 'Governorate')}
              </label>
              <select
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              >
                {YEMEN_GOVERNORATES.map((g) => (
                  <option key={g.ar} value={lang === 'ar' ? g.ar : g.en}>
                    {lang === 'ar' ? g.ar : g.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t(lang, 'العنوان التفصيلي', 'Delivery Address')}
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>

            {savedNotice && <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{savedNotice}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-sm font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
            >
              {saving ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ التغييرات', 'Save Profile')}
            </button>
          </form>

          {/* Wishlist, Reservations & Electronic Invoices */}
          <div className="lg:col-span-7 space-y-6">
            {/* Saved Wishlist / Favorites */}
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#C89D3C] fill-[#C89D3C]" />
                  <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
                    {t(lang, 'قائمة المفضلة', 'Saved Wishlist')} ({favorites.length})
                  </h2>
                </div>
                {favorites.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="text-xs font-semibold text-[#9E7822] dark:text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    {t(lang, 'تصفح المزيد', 'Browse More')}
                  </button>
                )}
              </div>

              {favorites.length === 0 ? (
                <div className="bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    {t(
                      lang,
                      'لم تقم بحفظ أي أجهزة شبكات في المفضلة بعد. اضغط على أيقونة القلب في أي منتج لحفظه هنا والرجوع إليه لاحقاً.',
                      'You have not saved any networking devices yet. Tap the heart icon on any product to save it here for later.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t(lang, 'استعراض الكتالوج', 'Browse Catalog')}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                  {favorites.map((fav) => {
                    const live = products.find((p) => p.id === fav.productId);
                    const favName = lang === 'ar'
                      ? live?.nameAr || fav.productNameAr
                      : live?.nameEn || fav.productNameEn;
                    const displayBrand = live?.brandName || fav.brandName;
                    const displayModel = live?.modelNumber || fav.modelNumber;
                    const displayPrice = live?.retailPrice ?? fav.retailPrice;
                    const displayImage = live?.images?.[0] || fav.imageUrl;
                    const statusInfo = live
                      ? PRODUCT_STATUS_LABELS[live.status] || PRODUCT_STATUS_LABELS.available
                      : null;
                    const busy = isFavoriteBusy(fav.productId);

                    return (
                      <div
                        key={fav.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-14 rounded-lg bg-[#F3F3F1] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 overflow-hidden shrink-0">
                            <ResilientImage
                              src={displayImage}
                              alt={favName}
                              fallbackLabel={favName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                              {displayBrand && (
                                <span className="font-semibold text-neutral-700 dark:text-neutral-200">{displayBrand}</span>
                              )}
                              {displayModel && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono-num">{displayModel}</span>
                                </>
                              )}
                              {statusInfo ? (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      statusInfo.tone === 'emerald'
                                        ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                        : statusInfo.tone === 'amber'
                                        ? 'text-amber-700 dark:text-amber-400 font-medium'
                                        : statusInfo.tone === 'rose'
                                        ? 'text-rose-700 dark:text-rose-400 font-medium'
                                        : 'text-neutral-500'
                                    }
                                  >
                                    {lang === 'ar' ? statusInfo.ar : statusInfo.en}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-neutral-400">
                                    {t(lang, 'غير مدرج حالياً', 'Currently unlisted')}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-[#0E0E10] dark:text-white truncate">
                              {favName}
                            </div>
                            <div className="text-xs font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                              {formatCurrency(displayPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {live && (
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(live)}
                              className="px-3.5 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-semibold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
                            >
                              {t(lang, 'عرض وحجز', 'View & Reserve')}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void removeFromFavorites(fav.productId)}
                            aria-label={t(lang, 'إزالة من المفضلة', 'Remove from Wishlist')}
                            title={t(lang, 'إزالة من المفضلة', 'Remove from Wishlist')}
                            className="p-2 rounded-lg border border-[#E5E5E0] dark:border-white/10 text-neutral-500 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reservations */}
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#C89D3C]" />
                <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
                  {t(lang, 'سجل حجوزاتي', 'My Reservations')} ({reservations.length})
                </h2>
              </div>

              {reservations.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4">
                  {t(lang, 'لم تقم بتقديم أي حجوزات بعد.', 'You have no reservations yet.')}
                </p>
              ) : (
                <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                  {reservations.map((res) => {
                    const linkedInvoice =
                      (res.invoiceId && invoices.find((inv) => inv.id === res.invoiceId)) ||
                      invoices.find((inv) => inv.reservationId === res.id);
                    return (
                      <div
                        key={res.id}
                        className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs text-neutral-500 font-mono-num">
                            {res.referenceNumber} · {new Date(res.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm font-semibold text-[#0E0E10] dark:text-white">
                            {lang === 'ar' ? res.productNameAr : res.productNameEn} ({res.quantity})
                          </div>
                          <div className="text-xs font-mono-num text-[#9E7822] dark:text-[#D4AF37] font-semibold">
                            {formatCurrency(res.totalPrice)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-semibold text-[#0E0E10] dark:text-neutral-200">
                            {lang === 'ar'
                              ? RESERVATION_STATUS_LABELS[res.status].ar
                              : RESERVATION_STATUS_LABELS[res.status].en}
                          </span>
                          {linkedInvoice && (
                            <button
                              type="button"
                              onClick={() => setPreviewInvoice(linkedInvoice)}
                              className="px-3 py-1.5 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 border border-[#C89D3C]/50 text-[#9E7822] dark:text-[#D4AF37] hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-mono-num font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{linkedInvoice.invoiceNumber}</span>
                            </button>
                          )}
                          {(res.status === 'pending' || res.status === 'confirmed') && (
                            <button
                              type="button"
                              onClick={() => cancelCustomerReservation(res)}
                              className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold cursor-pointer"
                            >
                              {t(lang, 'إلغاء', 'Cancel')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Electronic PDF Invoices */}
            <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#C89D3C]" />
                <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
                  {t(lang, 'فواتيري الإلكترونية', 'My Electronic Invoices')} ({invoices.length})
                </h2>
              </div>

              {invoices.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3">
                  {t(
                    lang,
                    'تصدر فواتيرك الإلكترونية بصيغة PDF تلقائياً فور تأكيد طلباتك من قِبل الإدارة.',
                    'Your official PDF invoices appear here automatically once your orders are confirmed.'
                  )}
                </p>
              ) : (
                <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                  {invoices.map((inv) => {
                    const st = INVOICE_PAYMENT_STATUS_LABELS[inv.paymentStatus];
                    return (
                      <div
                        key={inv.id}
                        className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                              {inv.invoiceNumber}
                            </span>
                            <span className="text-neutral-400">·</span>
                            <span className="font-mono-num text-neutral-500">
                              {new Date(inv.issuedAt).toLocaleDateString()}
                            </span>
                            <span className="text-neutral-400">·</span>
                            <span
                              className={
                                inv.paymentStatus === 'paid'
                                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                  : inv.paymentStatus === 'partial'
                                  ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                  : 'text-rose-700 dark:text-rose-400 font-semibold'
                              }
                            >
                              {lang === 'ar' ? st.ar : st.en}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-700 dark:text-neutral-300">
                            {inv.items.map((it) => `${it.nameAr} × ${it.quantity}`).join('، ')}
                          </div>
                          <div className="text-xs font-mono-num font-bold text-[#0E0E10] dark:text-white" dir="ltr">
                            {formatCurrency(inv.totalAmount, storeSettings.currencyCode || 'USD')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="px-3 py-1.5 rounded-lg border border-[#E5E5E0] dark:border-white/10 hover:border-[#C89D3C] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t(lang, 'معاينة وطباعة', 'Preview')}</span>
                          </button>
                          <button
                            type="button"
                            disabled={downloadingInvoiceId === inv.id}
                            onClick={async () => {
                              setDownloadingInvoiceId(inv.id);
                              try {
                                await downloadInvoicePdf(inv, storeSettings);
                              } finally {
                                setDownloadingInvoiceId(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] hover:bg-[#C89D3C] hover:text-[#0E0E10] text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENGINEER IDENTITY & MEMBERSHIP CARD */}
      {activeTab === 'engineer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveEngineer}
            className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0EC] dark:border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0E0E10] dark:text-white">
                  {t(lang, 'الملف المهني وهوية مهندس الشبكات', 'Professional Networking Engineer Identity')}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t(
                    lang,
                    'تُنشأ بطاقة عضوية رقمية ذكية باسمك ورقمك التسلسلي، ويمكنك طلب توثيقها أو نشرها في دليل المهندسين.',
                    'Generates your official ASEMA Engineer Membership Card with optional verification & directory opt-in.'
                  )}
                </p>
              </div>
              {engineerProfile?.membershipId && (
                <span className="px-3 py-1 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/15 text-[#9E7822] dark:text-[#D4AF37] font-mono-num text-xs font-bold">
                  {engineerProfile.membershipId}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الاسم المهني الكامل *', 'Full Professional Name *')}
                </label>
                <input
                  required
                  value={engForm.fullName}
                  onChange={(e) => setEngForm({ ...engForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'التخصص الرئيسي *', 'Primary Specialty *')}
                </label>
                <input
                  required
                  value={engForm.specialty}
                  onChange={(e) => setEngForm({ ...engForm, specialty: e.target.value })}
                  placeholder="مهندس شبكات MikroTik & ISP"
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'سنوات الخبرة', 'Years of Experience')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={engForm.yearsExperience}
                  onChange={(e) => setEngForm({ ...engForm, yearsExperience: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'المحافظة / المدينة', 'Governorate')}
                </label>
                <select
                  value={engForm.governorate}
                  onChange={(e) => setEngForm({ ...engForm, governorate: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                >
                  {YEMEN_GOVERNORATES.map((g) => (
                    <option key={g.ar} value={lang === 'ar' ? g.ar : g.en}>
                      {lang === 'ar' ? g.ar : g.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ImageUploader
              label={t(lang, 'الصورة الشخصية للبطاقة المهنية (اختياري)', 'Card Profile Photo (Optional)')}
              value={engForm.photoUrl}
              onChange={(url) => setEngForm({ ...engForm, photoUrl: url })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'المهارات (مفصولة بفاصلة)', 'Skills (comma-separated)')}
                </label>
                <input
                  value={engForm.skillsText}
                  onChange={(e) => setEngForm({ ...engForm, skillsText: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t(lang, 'الشهادات (مفصولة بفاصلة)', 'Certificates (comma-separated)')}
                </label>
                <input
                  value={engForm.certificatesText}
                  onChange={(e) => setEngForm({ ...engForm, certificatesText: e.target.value })}
                  placeholder="MTCNA, MTCRE, CCNA"
                  className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'هاتف التواصل المهني (للدليل)', 'Professional Contact Phone')}
              </label>
              <input
                value={engForm.contactPhone}
                onChange={(e) => setEngForm({ ...engForm, contactPhone: e.target.value })}
                placeholder="770XXXXXX"
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg font-mono-num"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {t(lang, 'ملخص أبرز المشاريع والخبرات', 'Key Projects & Experience Summary')}
              </label>
              <textarea
                rows={3}
                value={engForm.projectsSummary}
                onChange={(e) => setEngForm({ ...engForm, projectsSummary: e.target.value })}
                placeholder={t(
                  lang,
                  'مثال: تأسيس شبكات فايبر وأبراج Ubiquiti لـ 400 مشترك في صنعاء وتنفيذ سيرفرات MikroTik Hotspot...',
                  'e.g. Deployed MikroTik Hotspot & Ubiquiti PtP links for 400+ subscribers...'
                )}
                className="w-full px-3 py-2 text-xs bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 rounded-lg"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FAF5E8]/70 dark:bg-[#C89D3C]/10 border border-[#C89D3C]/30 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={engForm.showInDirectory}
                onChange={(e) => setEngForm({ ...engForm, showInDirectory: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                {t(
                  lang,
                  'نشر ملفي في «دليل المهندسين» العام ليتمكن العملاء والشركات من العثور عليّ والتواصل معي.',
                  'Publish my profile in the public ASEMA Engineers Directory (opt-in).'
                )}
              </span>
            </label>

            {engMsg && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{engMsg}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingEng}
                className="px-5 py-2.5 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] transition-colors cursor-pointer"
              >
                {savingEng ? t(lang, 'جاري الحفظ...', 'Saving...') : t(lang, 'حفظ الهوية المهنية', 'Save Engineer Profile')}
              </button>

              <button
                type="button"
                disabled={savingEng || engineerProfile?.isVerified}
                onClick={() => void handleRequestVerification()}
                className="px-4 py-2.5 rounded-lg border border-[#C89D3C] text-[#9E7822] dark:text-[#D4AF37] text-xs font-bold hover:bg-[#FAF5E8] dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
              >
                {engineerProfile?.isVerified
                  ? t(lang, 'الشارة موثقة ✓', 'Badge Verified ✓')
                  : engineerProfile?.verificationStatus === 'pending'
                  ? t(lang, 'طلب التوثيق قيد المراجعة', 'Verification Pending')
                  : t(lang, 'طلب توثيق الشارة', 'Request Verification Badge')}
              </button>
            </div>
          </form>

          {/* Engineer Digital Card Preview Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/40 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#D4AF37]">
                  {t(lang, 'معاينة العضوية الرقمية', 'DIGITAL MEMBERSHIP CARD')}
                </span>
                <CreditCard className="w-5 h-5 text-[#C89D3C]" />
              </div>

              <div className="space-y-1">
                <div className="text-lg font-bold">{engForm.fullName || userProfile.displayName}</div>
                <div className="text-xs text-[#D4AF37]">{engForm.specialty}</div>
                <div className="text-xs text-neutral-400 font-mono-num">
                  {engineerProfile?.membershipId || t(lang, 'احفظ الملف لإصدار الرقم التسلسلي', 'Save profile to generate ID')}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {engForm.skillsText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 6)
                  .map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 rounded bg-white/10 text-[11px] text-neutral-200"
                    >
                      {sk}
                    </span>
                  ))}
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-neutral-300">
                  {t(lang, 'حالة التوثيق:', 'Verification:')}{' '}
                  <strong className="text-[#D4AF37]">
                    {engineerProfile?.isVerified
                      ? t(lang, 'معتمد رسمياً', 'Verified')
                      : engineerProfile?.verificationStatus === 'pending'
                      ? t(lang, 'قيد المراجعة', 'Pending')
                      : t(lang, 'عضو مسجل', 'Member')}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!engineerProfile) {
                    const draft = buildNextEngineerProfile(false);
                    setEngineerProfile(draft);
                  }
                  setCardModalOpen(true);
                }}
                className="w-full py-2.5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-xs font-bold hover:bg-[#D4AF37] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t(lang, 'معاينة وتحميل بطاقة المهندس (PNG / PDF)', 'Preview & Download Engineer Card')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POINTS, BADGES & REWARDS */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t(lang, 'النقاط المتاحة', 'Available Points'), val: userRewards?.totalPoints || 0 },
              { label: t(lang, 'إجمالي النقاط المكتسبة', 'Lifetime Points'), val: userRewards?.lifetimePoints || 0 },
              { label: t(lang, 'نقاط الأكاديمية', 'Academy Points'), val: userRewards?.academyPoints || 0 },
              { label: t(lang, 'نقاط المشتريات', 'Purchase Points'), val: userRewards?.purchasePoints || 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-4"
              >
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</div>
                <div className="text-2xl font-bold font-mono-num text-[#9E7822] dark:text-[#D4AF37] mt-1">
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {redeemMsg && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold border ${
                redeemMsg.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
              }`}
            >
              {redeemMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Redeemable Offers */}
            <div className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#C89D3C]" />
                <h2 className="text-base font-bold">{t(lang, 'مكافآت وعروض حصرية بالنقاط', 'Redeemable Rewards & Discounts')}</h2>
              </div>

              <div className="space-y-3">
                {rewardOffers.map((offer) => {
                  const alreadyRedeemed = userRewards?.redeemedOffers?.includes(offer.id);
                  const canAfford = (userRewards?.totalPoints || 0) >= offer.pointsCost;
                  return (
                    <div
                      key={offer.id}
                      className="p-4 rounded-xl bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{lang === 'ar' ? offer.titleAr : offer.titleEn}</span>
                          <span className="px-2 py-0.5 rounded bg-[#FAF5E8] dark:bg-[#C89D3C]/20 text-[#9E7822] dark:text-[#D4AF37] font-mono-num text-[11px] font-bold">
                            {offer.pointsCost} pts
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {lang === 'ar' ? offer.descriptionAr : offer.descriptionEn}
                        </p>
                        {alreadyRedeemed && (
                          <p className="text-xs font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                            {t(lang, 'رمزك:', 'Code:')} {offer.discountCode || offer.discountValueText}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={Boolean(alreadyRedeemed) || !canAfford || redeemBusyId === offer.id}
                        onClick={() => void handleRedeemOffer(offer)}
                        className="px-4 py-2 rounded-lg bg-[#0E0E10] dark:bg-[#C89D3C] text-white dark:text-[#0E0E10] text-xs font-bold hover:bg-[#C89D3C] hover:text-[#0E0E10] disabled:opacity-40 cursor-pointer"
                      >
                        {alreadyRedeemed
                          ? t(lang, 'تم الاستبدال', 'Redeemed')
                          : !canAfford
                          ? t(lang, 'نقاط غير كافية', 'Need More Points')
                          : t(lang, 'استبدال الآن', 'Redeem')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Badges & Points Ledger */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#C89D3C]" />
                  <h2 className="text-base font-bold">{t(lang, 'الشارات والإنجازات', 'Badges & Achievements')}</h2>
                </div>
                {!userRewards?.badges || userRewards.badges.length === 0 ? (
                  <p className="text-xs text-neutral-500">
                    {t(lang, 'أكمل دورة في الأكاديمية أو أتمم طلباً للحصول على أول شارة إنجاز.', 'Complete an Academy course or order to unlock your first badge.')}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userRewards.badges.map((b) => {
                      const lbl = BADGE_LABELS[b];
                      return (
                        <span
                          key={b}
                          className="px-3 py-1.5 rounded-lg bg-[#FAF5E8] dark:bg-[#C89D3C]/20 border border-[#C89D3C]/40 text-[#9E7822] dark:text-[#D4AF37] text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{lbl ? (lang === 'ar' ? lbl.ar : lbl.en) : b}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-bold">{t(lang, 'سجل النقاط الأخير', 'Recent Points Activity')}</h3>
                {!userRewards?.recentEvents || userRewards.recentEvents.length === 0 ? (
                  <p className="text-xs text-neutral-500">{t(lang, 'لا توجد حركات نقاط بعد.', 'No points events yet.')}</p>
                ) : (
                  <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                    {userRewards.recentEvents.slice(0, 8).map((ev) => (
                      <div key={ev.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="truncate max-w-[210px]">{ev.titleAr}</span>
                        <span
                          className={`font-mono-num font-bold ${
                            ev.points >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'
                          }`}
                        >
                          {ev.points >= 0 ? `+${ev.points}` : ev.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMART ALERTS & NOTIFICATIONS */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4 h-fit">
            <h2 className="text-base font-bold">
              {t(lang, 'اشتراكات التنبيهات الذكية', 'Active Smart Alert Subscriptions')} ({alertSubscriptions.length})
            </h2>
            {alertSubscriptions.length === 0 ? (
              <p className="text-xs text-neutral-500">
                {t(
                  lang,
                  'يمكنك تفعيل تنبيه «أعلمني عند التوفر» أو «تنبيه انخفاض السعر» من داخل صفحة أي منتج.',
                  'Subscribe to Back-in-Stock or Price-Drop alerts inside any product detail view.'
                )}
              </p>
            ) : (
              <div className="space-y-2.5">
                {alertSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-lg bg-[#F8F8F7] dark:bg-[#0E0E10] border border-[#E5E5E0] dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold">
                        {sub.productNameAr || sub.alertType}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {sub.alertType === 'back_in_stock'
                          ? t(lang, 'تنبيه توفر المخزون', 'Back-in-stock alert')
                          : sub.alertType === 'price_drop'
                          ? t(lang, 'تنبيه انخفاض السعر', 'Price-drop alert')
                          : sub.alertType}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeAlertSubscription(sub.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer"
                      aria-label="Remove alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold">
              {t(lang, 'مركز الإشعارات', 'Notifications Feed')} ({userNotifications.length})
            </h2>

            {userNotifications.length === 0 ? (
              <p className="text-xs text-neutral-500">
                {t(lang, 'لا توجد إشعارات جديدة.', 'No notifications yet.')}
              </p>
            ) : (
              <div className="space-y-2">
                {userNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                      n.isRead
                        ? 'bg-[#F8F8F7] dark:bg-[#0E0E10] border-[#E5E5E0] dark:border-white/10 text-neutral-600 dark:text-neutral-300'
                        : 'bg-[#FAF5E8] dark:bg-[#C89D3C]/15 border-[#C89D3C]/50 text-[#0E0E10] dark:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold">
                        {lang === 'ar' ? n.titleAr : n.titleEn}
                      </div>
                      <div className="mt-0.5">{lang === 'ar' ? n.messageAr : n.messageEn}</div>
                      <div className="text-[10px] text-neutral-400 font-mono-num mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead(n.id)}
                        className="px-2.5 py-1 rounded border border-[#C89D3C]/50 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>{t(lang, 'مقروء', 'Read')}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {previewInvoice && (
        <InvoicePreviewModal
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {cardModalOpen && engineerProfile && (
        <EngineerCardModal
          profile={engineerProfile}
          onClose={() => setCardModalOpen(false)}
        />
      )}
    </div>
  );
}

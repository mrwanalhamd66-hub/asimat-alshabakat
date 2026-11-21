import React, { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarClock,
  ClipboardList,
  DatabaseBackup,
  FileText,
  FlaskConical,
  FolderTree,
  Gift,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BOOTSTRAP_OWNER_EMAIL } from '../../lib/firebase.ts';
import { t } from '../../i18n/translations.ts';
import {
  isOfferCurrentlyActive,
  subscribeActivityLogs,
  subscribeAdminWholesale,
  subscribeAllReservations,
  subscribeBackups,
  subscribeInvoices,
  subscribeNotifications,
  subscribeUsers,
} from '../../services/firestoreService.ts';
import type {
  ActivityLog,
  AdminPermission,
  AppNotification,
  Invoice,
  ProductPrivate,
  Reservation,
  StoreBackup,
  UserProfile,
} from '../../types/index.ts';
import { AdminProductsModule } from './AdminProductsModule.tsx';
import {
  AdminAdsModule,
  AdminBrandsModule,
  AdminCategoriesModule,
  AdminOffersModule,
} from './AdminCatalogAndOffers.tsx';
import {
  AdminCustomersModule,
  AdminHomepageBuilder,
  AdminReservationsModule,
} from './AdminOperations.tsx';
import {
  AdminActivityLogsModule,
  AdminBackupRestoreModule,
  AdminNotificationsModule,
  AdminReportsModule,
  AdminSettingsModule,
  AdminUsersPermissionsModule,
} from './AdminGovernance.tsx';
import { AdminChatConsole } from './AdminChatConsole.tsx';
import { AdminInvoicesModule } from './AdminInvoicesModule.tsx';
import { AdminAcademyModule } from './AdminAcademyModule.tsx';
import {
  AdminCommunityModule,
  AdminEngineersModule,
  AdminLabModule,
  AdminPackagesModule,
  AdminRewardsModule,
} from './AdminPlatformModules.tsx';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'offers'
  | 'packages'
  | 'reservations'
  | 'invoices'
  | 'academy'
  | 'community'
  | 'lab'
  | 'engineers'
  | 'rewards'
  | 'ads'
  | 'customers'
  | 'brands'
  | 'homepage'
  | 'chat'
  | 'notifications'
  | 'reports'
  | 'settings'
  | 'users'
  | 'backup'
  | 'logs';

export function AdminDashboard() {
  const {
    lang,
    authReady,
    firebaseUser,
    userProfile,
    isAdminOrStaff,
    isTrainerOrStaff,
    isSuperAdmin,
    signInWithGoogle,
    authLoading,
    authError,
    clearAuthError,
    products,
    offers,
    ads,
    navigate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [wholesaleMap, setWholesaleMap] = useState<Record<string, ProductPrivate>>({});
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [backups, setBackups] = useState<StoreBackup[]>([]);

  const isBootstrapOwner =
    firebaseUser?.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase();

  useEffect(() => {
    if (userProfile?.role === 'trainer' && !isAdminOrStaff) {
      setActiveTab('academy');
    }
  }, [userProfile?.role, isAdminOrStaff]);

  useEffect(() => {
    if (!isAdminOrStaff) return;
    const u1 = subscribeAdminWholesale(setWholesaleMap);
    const u2 = subscribeAllReservations(setReservations);
    const u3 = subscribeUsers(setUsers);
    const u4 = subscribeNotifications(true, userProfile?.uid, setNotifications);
    const u5 = subscribeActivityLogs(setLogs);
    const u6 = subscribeBackups(setBackups);
    const u7 = subscribeInvoices(
      isBootstrapOwner ? 'owner' : 'manager',
      userProfile?.uid || firebaseUser?.uid,
      setInvoices
    );
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
    };
  }, [isAdminOrStaff, isBootstrapOwner, userProfile?.uid, firebaseUser?.uid]);

  if (!authReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-500">
        {t(lang, 'جاري التحقق من الجلسة...', 'Verifying admin session...')}
      </div>
    );
  }

  if (!firebaseUser || !isTrainerOrStaff) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-[#0E0E10] text-white border border-[#C89D3C]/40 rounded-2xl p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#C89D3C]/15 text-[#D4AF37] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">
            {t(lang, 'مركز التحكم الإداري والأكاديمي — عاصمة الشبكات', 'Private Admin & Academy Control Center')}
          </h1>
          <p className="text-xs text-neutral-300 leading-relaxed">
            {firebaseUser
              ? t(
                  lang,
                  'هذا الحساب لا يملك صلاحيات الإدارة أو المدرب. يرجى تسجيل الدخول بحساب مصرح له.',
                  'This account does not have administrator or trainer permissions. Please sign in with an authorized account.'
                )
              : t(
                  lang,
                  'لإدارة المنتجات والباقات والأكاديمية والحجوزات، يرجى تسجيل الدخول بحساب الإدارة المعتمد.',
                  'Sign in with the authorized store owner or trainer Google account to access the control center.'
                )}
          </p>
          {authError && (
            <div className="flex items-start justify-between gap-3 text-start bg-amber-500/15 border border-amber-400/40 text-amber-200 rounded-lg px-3.5 py-2.5 text-xs">
              <span>{authError}</span>
              <button
                type="button"
                onClick={clearAuthError}
                className="text-amber-300 hover:text-white shrink-0 cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={authLoading}
              className="flex-1 py-2.5 px-5 rounded-lg bg-[#C89D3C] text-[#0E0E10] text-sm font-bold hover:bg-[#D4AF37] cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {authLoading
                ? t(lang, 'جاري تسجيل الدخول...', 'Signing in...')
                : t(lang, 'تسجيل دخول الإدارة عبر Google', 'Admin Sign In with Google')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="py-2.5 px-5 rounded-lg border border-white/20 text-white text-sm font-semibold hover:border-[#C89D3C] cursor-pointer"
            >
              {t(lang, 'العودة للمتجر', 'Back to Storefront')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canAccess = (perm: AdminTab): boolean => {
    if (isSuperAdmin) return true;
    if (userProfile?.role === 'trainer' && !isAdminOrStaff) return perm === 'academy';
    if (perm === 'users' || perm === 'backup' || perm === 'logs') return false;
    const assigned = userProfile?.permissions || [];
    return assigned.includes(perm as AdminPermission);
  };

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;

  const rawMenuItems: {
    id: AdminTab;
    ar: string;
    en: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', ar: 'لوحة الإحصائيات', en: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', ar: 'إدارة المنتجات', en: 'Products', icon: Package },
    { id: 'categories', ar: 'التصنيفات', en: 'Categories', icon: FolderTree },
    { id: 'offers', ar: 'إدارة العروض', en: 'Offers', icon: Tag },
    { id: 'packages', ar: 'الباقات الجاهزة', en: 'Project Packages', icon: Layers },
    { id: 'reservations', ar: 'الحجوزات', en: 'Reservations', icon: ClipboardList },
    {
      id: 'invoices',
      ar: 'الفواتير الإلكترونية PDF',
      en: 'PDF Invoices',
      icon: FileText,
      badge: invoices.length > 0 ? invoices.length : undefined,
    },
    { id: 'academy', ar: 'الأكاديمية والشهادات', en: 'Academy & Certs', icon: GraduationCap },
    { id: 'community', ar: 'إشراف المجتمع', en: 'Community Mod', icon: MessageSquare },
    { id: 'lab', ar: 'المختبر التقني', en: 'Technical Lab', icon: FlaskConical },
    { id: 'engineers', ar: 'توثيق المهندسين', en: 'Engineers Verify', icon: BadgeCheck },
    { id: 'rewards', ar: 'النقاط والمكافآت', en: 'Rewards & Loyalty', icon: Gift },
    { id: 'ads', ar: 'الإعلانات والجدولة', en: 'Advertisements', icon: Megaphone },
    { id: 'customers', ar: 'العملاء', en: 'Customers', icon: Users },
    { id: 'brands', ar: 'العلامات التجارية', en: 'Brands', icon: Award },
    { id: 'homepage', ar: 'منشئ الصفحة الرئيسية', en: 'Homepage Builder', icon: LayoutTemplate },
    { id: 'chat', ar: 'الدردشة الفورية', en: 'Live Support Chat', icon: MessageSquare },
    {
      id: 'notifications',
      ar: 'الإشعارات',
      en: 'Notifications',
      icon: Bell,
      badge: unreadNotifs > 0 ? unreadNotifs : undefined,
    },
    { id: 'reports', ar: 'التقارير والتحليلات', en: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', ar: 'إعدادات المتجر', en: 'Store Settings', icon: Settings },
    { id: 'users', ar: 'المستخدمون والصلاحيات', en: 'Users & Roles', icon: CalendarClock },
    { id: 'backup', ar: 'النسخ الاحتياطي', en: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'logs', ar: 'سجل النشاطات', en: 'Activity Logs', icon: Activity },
  ];

  const menuItems = rawMenuItems.filter((m) => canAccess(m.id));

  // Overview KPIs
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const confirmedCount = reservations.filter((r) => r.status === 'confirmed').length;
  const activeOffersCount = offers.filter(isOfferCurrentlyActive).length;
  const expiredOffersCount = offers.length - activeOffersCount;
  const customersCount = users.filter((u) => u.role === 'customer').length;
  const mostViewed = [...products]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 4);
  const mostReserved = [...products]
    .sort((a, b) => (b.reservationCount || 0) - (a.reservationCount || 0))
    .slice(0, 4);

  return (
    <div className="min-h-[82vh] max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="lg:col-span-3 bg-[#0E0E10] text-white rounded-2xl p-4 h-fit border border-[#C89D3C]/25">
        <div className="px-3 py-3 border-b border-white/10 mb-3">
          <div className="text-xs text-[#D4AF37] font-semibold">
            {isSuperAdmin
              ? 'SUPER ADMIN'
              : userProfile?.role === 'trainer' && !isAdminOrStaff
              ? 'ACADEMY TRAINER'
              : 'MANAGER'}
          </div>
          <div className="text-sm font-bold truncate mt-0.5">{userProfile?.displayName}</div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C89D3C] text-[#0E0E10]'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? item.ar : item.en}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded ${
                      active ? 'bg-[#0E0E10] text-white' : 'bg-[#C89D3C] text-[#0E0E10]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:col-span-9 space-y-6">
        {activeTab === 'dashboard' && isAdminOrStaff && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0E0E10] dark:text-white">
                {t(lang, 'مركز التحكم الرئيسي — عاصمة الشبكات', 'ASEMA NETWORKS Control Overview')}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                {t(
                  lang,
                  'إدارة شاملة للمنتجات، الباقات، الأكاديمية، المجتمع، المختبر، الحجوزات والفواتير في الزمن الحقيقي.',
                  'Real-time overview of catalog, packages, academy, community, lab, reservations, and invoicing.'
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: t(lang, 'إجمالي المنتجات', 'Total Products'), val: products.length },
                { label: t(lang, 'إجمالي الحجوزات', 'Total Bookings'), val: reservations.length },
                { label: t(lang, 'حجوزات قيد الانتظار', 'Pending Bookings'), val: pendingCount },
                { label: t(lang, 'حجوزات مؤكدة', 'Confirmed Bookings'), val: confirmedCount },
                { label: t(lang, 'العروض النشطة', 'Active Offers'), val: activeOffersCount },
                { label: t(lang, 'العروض المنتهية', 'Expired Offers'), val: expiredOffersCount },
                { label: t(lang, 'إجمالي العملاء', 'Total Customers'), val: customersCount },
                { label: t(lang, 'الإعلانات', 'Advertisements'), val: ads.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-4"
                >
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</div>
                  <div className="text-2xl font-bold font-mono-num text-[#0E0E10] dark:text-white mt-1">
                    {stat.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#0E0E10] dark:text-white">
                  {t(lang, 'الأكثر مشاهدة', 'Most Viewed Products')}
                </h2>
                <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                  {mostViewed.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between text-xs">
                      <span className="truncate max-w-[230px]">
                        {lang === 'ar' ? p.nameAr : p.nameEn}
                      </span>
                      <span className="font-mono-num font-bold text-[#9E7822] dark:text-[#D4AF37]">
                        {p.viewCount || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#17171B] border border-[#E5E5E0] dark:border-white/10 rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-[#0E0E10] dark:text-white">
                  {t(lang, 'الأكثر حجزاً', 'Most Reserved Products')}
                </h2>
                <div className="divide-y divide-[#F0F0EC] dark:divide-white/10">
                  {mostReserved.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between text-xs">
                      <span className="truncate max-w-[230px]">
                        {lang === 'ar' ? p.nameAr : p.nameEn}
                      </span>
                      <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
                        {p.reservationCount || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && <AdminProductsModule wholesaleMap={wholesaleMap} />}
        {activeTab === 'categories' && <AdminCategoriesModule />}
        {activeTab === 'brands' && <AdminBrandsModule />}
        {activeTab === 'offers' && <AdminOffersModule />}
        {activeTab === 'packages' && <AdminPackagesModule />}
        {activeTab === 'ads' && <AdminAdsModule />}
        {activeTab === 'reservations' && (
          <AdminReservationsModule reservations={reservations} invoices={invoices} />
        )}
        {activeTab === 'invoices' && (
          <AdminInvoicesModule
            invoices={invoices}
            reservations={reservations}
            users={users}
          />
        )}
        {activeTab === 'academy' && <AdminAcademyModule />}
        {activeTab === 'community' && <AdminCommunityModule />}
        {activeTab === 'lab' && <AdminLabModule />}
        {activeTab === 'engineers' && <AdminEngineersModule />}
        {activeTab === 'rewards' && <AdminRewardsModule />}
        {activeTab === 'customers' && (
          <AdminCustomersModule users={users} reservations={reservations} />
        )}
        {activeTab === 'homepage' && <AdminHomepageBuilder />}
        {activeTab === 'chat' && <AdminChatConsole />}
        {activeTab === 'notifications' && (
          <AdminNotificationsModule notifications={notifications} />
        )}
        {activeTab === 'reports' && (
          <AdminReportsModule reservations={reservations} users={users} />
        )}
        {activeTab === 'settings' && <AdminSettingsModule />}
        {activeTab === 'users' && <AdminUsersPermissionsModule users={users} />}
        {activeTab === 'backup' && <AdminBackupRestoreModule backups={backups} />}
        {activeTab === 'logs' && <AdminActivityLogsModule logs={logs} />}
      </main>
    </div>
  );
}

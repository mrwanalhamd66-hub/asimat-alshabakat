import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  BOOTSTRAP_OWNER_EMAIL,
  auth,
  googleAuthProvider,
} from '../lib/firebase.ts';
import {
  DEFAULT_PAYMENT_ACCOUNTS,
  INITIAL_ACADEMY_COURSES,
  INITIAL_ADS,
  INITIAL_BRANDS,
  INITIAL_CATEGORIES,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_LAB_RESOURCES,
  INITIAL_OFFERS,
  INITIAL_PRODUCTS,
  INITIAL_PROJECT_PACKAGES,
  INITIAL_REWARD_OFFERS,
  INITIAL_STORE_SETTINGS,
} from '../data/seedData.ts';
import {
  addFavorite,
  removeFavorite,
  seedInitialStoreDataIfEmpty,
  subscribeAcademyCourses,
  subscribeAds,
  subscribeBrands,
  subscribeCategories,
  subscribeHomepageSections,
  subscribeLabResources,
  subscribeNotifications,
  subscribeOffers,
  subscribeProjectPackages,
  subscribePublicProducts,
  subscribeRewardOffers,
  subscribeStoreSettings,
  subscribeUserAlertSubscriptions,
  subscribeUserFavorites,
  subscribeUserRewards,
  syncUserProfileOnLogin,
} from '../services/firestoreService.ts';
import type {
  AcademyCourse,
  Advertisement,
  AlertSubscription,
  AppNotification,
  Brand,
  CartItem,
  Category,
  FavoriteItem,
  HomepageSection,
  LabResource,
  Language,
  Offer,
  Product,
  ProjectPackage,
  RewardOffer,
  StoreSettings,
  UserProfile,
  UserRewards,
} from '../types/index.ts';

export type ThemeMode = 'light' | 'dark';

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  route: string;
  navigate: (to: string) => void;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  isAdminOrStaff: boolean;
  isTrainerOrStaff: boolean;
  isSuperAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  offers: Offer[];
  ads: Advertisement[];
  homepageSections: HomepageSection[];
  projectPackages: ProjectPackage[];
  academyCourses: AcademyCourse[];
  labResources: LabResource[];
  rewardOffers: RewardOffer[];
  storeSettings: StoreSettings;
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (id: string) => void;
  selectedBrandFilter: string;
  setSelectedBrandFilter: (id: string) => void;
  isUsingSeedFallback: boolean;
  favorites: FavoriteItem[];
  favoriteIds: Set<string>;
  isFavorite: (productId: string) => boolean;
  isFavoriteBusy: (productId: string) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
  removeFromFavorites: (productId: string) => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (productId: string, quantity?: number, sourceLabel?: string) => void;
  addManyToCart: (items: CartItem[], openDrawer?: boolean) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  userRewards: UserRewards | null;
  alertSubscriptions: AlertSubscription[];
  userNotifications: AppNotification[];
  unreadNotificationsCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('asema_lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('asema_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('asema_cart');
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const [route, setRoute] = useState<string>(() => `${window.location.pathname || '/'}${window.location.search || ''}`);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [dbProducts, setDbProducts] = useState<Product[] | null>(null);
  const [dbCategories, setDbCategories] = useState<Category[] | null>(null);
  const [dbBrands, setDbBrands] = useState<Brand[] | null>(null);
  const [dbOffers, setDbOffers] = useState<Offer[] | null>(null);
  const [dbAds, setDbAds] = useState<Advertisement[] | null>(null);
  const [dbSections, setDbSections] = useState<HomepageSection[] | null>(null);
  const [dbSettings, setDbSettings] = useState<StoreSettings | null>(null);
  const [dbPackages, setDbPackages] = useState<ProjectPackage[] | null>(null);
  const [dbCourses, setDbCourses] = useState<AcademyCourse[] | null>(null);
  const [dbLabResources, setDbLabResources] = useState<LabResource[] | null>(null);
  const [dbRewardOffers, setDbRewardOffers] = useState<RewardOffer[] | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('all');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<Set<string>>(new Set());
  const pendingFavoriteRef = useRef<Product | null>(null);

  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [alertSubscriptions, setAlertSubscriptions] = useState<AlertSubscription[]>([]);
  const [userNotifications, setUserNotifications] = useState<AppNotification[]>([]);

  const setLang = (next: Language) => {
    setLangState(next);
    localStorage.setItem('asema_lang', next);
  };

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('asema_theme', mode);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('asema_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handlePop = () =>
      setRoute(`${window.location.pathname || '/'}${window.location.search || ''}`);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const navigate = (to: string) => {
    if (to.startsWith('#')) {
      if (route !== '/') {
        window.history.pushState({}, '', '/');
        setRoute('/');
        setTimeout(() => {
          document.getElementById(to.slice(1))?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      } else {
        document.getElementById(to.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    if (to !== route) {
      window.history.pushState({}, '', to);
      setRoute(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setAuthError(null);
      }
      if (user && user.email) {
        try {
          const prof = await syncUserProfileOnLogin({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
          });
          setUserProfile(prof);
          if (prof.role === 'super_admin' || prof.role === 'manager') {
            await seedInitialStoreDataIfEmpty();
          }
        } catch (err) {
          console.error('Profile sync error:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (!firebaseUser) return false;
    if (
      firebaseUser.email?.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase() &&
      firebaseUser.emailVerified
    ) {
      return true;
    }
    return userProfile?.role === 'super_admin' && userProfile?.status === 'active';
  }, [firebaseUser, userProfile]);

  const isAdminOrStaff = useMemo(() => {
    if (isSuperAdmin) return true;
    return (
      (userProfile?.role === 'super_admin' || userProfile?.role === 'manager') &&
      userProfile?.status === 'active'
    );
  }, [isSuperAdmin, userProfile]);

  const isTrainerOrStaff = useMemo(() => {
    if (isAdminOrStaff) return true;
    return userProfile?.role === 'trainer' && userProfile?.status === 'active';
  }, [isAdminOrStaff, userProfile]);

  const isAdminRoute = route.startsWith('/admin') && isTrainerOrStaff;

  useEffect(() => {
    const u1 = subscribePublicProducts(isAdminRoute && isAdminOrStaff, (items) => setDbProducts(items));
    const u2 = subscribeCategories(isAdminRoute && isAdminOrStaff, (items) => setDbCategories(items));
    const u3 = subscribeBrands(isAdminRoute && isAdminOrStaff, (items) => setDbBrands(items));
    const u4 = subscribeOffers(isAdminRoute && isAdminOrStaff, (items) => setDbOffers(items));
    const u5 = subscribeAds(isAdminRoute && isAdminOrStaff, (items) => setDbAds(items));
    const u6 = subscribeHomepageSections(isAdminRoute && isAdminOrStaff, (items) => setDbSections(items));
    const u7 = subscribeStoreSettings((s) => setDbSettings(s));
    const u8 = subscribeProjectPackages(isAdminRoute && isAdminOrStaff, (items) => setDbPackages(items));
    const u9 = subscribeAcademyCourses(isAdminRoute && isTrainerOrStaff, (items) => setDbCourses(items));
    const u10 = subscribeLabResources(isAdminRoute && isAdminOrStaff, firebaseUser?.uid, (items) =>
      setDbLabResources(items)
    );
    const u11 = subscribeRewardOffers(isAdminRoute && isAdminOrStaff, (items) => setDbRewardOffers(items));
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
      u9();
      u10();
      u11();
    };
  }, [isAdminRoute, isAdminOrStaff, isTrainerOrStaff, firebaseUser?.uid]);

  useEffect(() => {
    if (!authReady || !firebaseUser || !userProfile) {
      setFavorites([]);
      setUserRewards(null);
      setAlertSubscriptions([]);
      setUserNotifications([]);
      return;
    }
    const unsubFav = subscribeUserFavorites(firebaseUser.uid, setFavorites);
    const unsubRew = subscribeUserRewards(firebaseUser.uid, setUserRewards);
    const unsubAlerts = subscribeUserAlertSubscriptions(firebaseUser.uid, setAlertSubscriptions);
    const unsubNotifs = subscribeNotifications(false, firebaseUser.uid, setUserNotifications);
    if (pendingFavoriteRef.current) {
      const pending = pendingFavoriteRef.current;
      pendingFavoriteRef.current = null;
      void addFavorite(firebaseUser.uid, pending).catch((err) => {
        console.error('Failed to save pending favorite:', err);
      });
    }
    return () => {
      unsubFav();
      unsubRew();
      unsubAlerts();
      unsubNotifs();
    };
  }, [authReady, firebaseUser, userProfile]);

  const clearAuthError = () => setAuthError(null);

  const signInWithGoogle = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled'
      ) {
        setAuthError(
          lang === 'ar'
            ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يمكنك المحاولة مرة أخرى.'
            : 'The sign-in popup was closed before completing. Please try again.'
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          lang === 'ar'
            ? 'قام المتصفح بحظر نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجدداً.'
            : 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          lang === 'ar'
            ? 'هذا النطاق غير مصرح به لتسجيل الدخول في إعدادات Firebase.'
            : 'This domain is not authorized for Firebase sign-in.'
        );
      } else if (code === 'auth/network-request-failed') {
        setAuthError(
          lang === 'ar'
            ? 'تعذر الاتصال بخادم المصادقة. تحقق من اتصال الإنترنت وحاول مرة أخرى.'
            : 'Network error while connecting to Google sign-in. Check your connection and try again.'
        );
      } else {
        console.warn('Google sign-in failed:', err);
        setAuthError(
          lang === 'ar'
            ? 'تعذر إتمام تسجيل الدخول عبر Google حالياً. يرجى المحاولة مرة أخرى.'
            : 'Unable to complete Google sign-in right now. Please try again.'
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setFavorites([]);
      setUserRewards(null);
      setAlertSubscriptions([]);
      setUserNotifications([]);
      setAuthError(null);
      if (route.startsWith('/admin')) {
        navigate('/');
      }
    } catch (err) {
      console.warn('Sign out failed:', err);
    }
  };

  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => item.productId)),
    [favorites]
  );

  const isFavorite = (productId: string) => favoriteIds.has(productId);
  const isFavoriteBusy = (productId: string) => favoriteBusyIds.has(productId);

  const setProductBusy = (productId: string, busy: boolean) => {
    setFavoriteBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const toggleFavorite = async (product: Product) => {
    if (!firebaseUser || !userProfile) {
      pendingFavoriteRef.current = product;
      await signInWithGoogle();
      return;
    }
    if (favoriteBusyIds.has(product.id)) return;
    setProductBusy(product.id, true);
    try {
      if (favoriteIds.has(product.id)) {
        await removeFavorite(firebaseUser.uid, product.id);
      } else {
        await addFavorite(firebaseUser.uid, product);
      }
    } finally {
      setProductBusy(product.id, false);
    }
  };

  const removeFromFavorites = async (productId: string) => {
    if (!firebaseUser || !userProfile) return;
    if (favoriteBusyIds.has(productId)) return;
    setProductBusy(productId, true);
    try {
      await removeFavorite(firebaseUser.uid, productId);
    } finally {
      setProductBusy(productId, false);
    }
  };

  // Cart Actions
  const addToCart = (productId: string, quantity = 1, sourceLabel?: string) => {
    const cleanQty = Math.max(1, Math.min(200, Math.round(quantity)));
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(200, i.quantity + cleanQty), sourceLabel: sourceLabel || i.sourceLabel }
            : i
        );
      }
      return [...prev, { productId, quantity: cleanQty, sourceLabel }];
    });
  };

  const addManyToCart = (items: CartItem[], openDrawer = true) => {
    setCart((prev) => {
      const next = [...prev];
      for (const incoming of items) {
        const cleanQty = Math.max(1, Math.min(200, Math.round(incoming.quantity)));
        const idx = next.findIndex((i) => i.productId === incoming.productId);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: Math.min(200, next[idx].quantity + cleanQty),
            sourceLabel: incoming.sourceLabel || next[idx].sourceLabel,
          };
        } else {
          next.push({ ...incoming, quantity: cleanQty });
        }
      }
      return next;
    });
    if (openDrawer) setCartOpen(true);
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(200, quantity) } : i))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const unreadNotificationsCount = useMemo(
    () => userNotifications.filter((n) => !n.isRead).length,
    [userNotifications]
  );

  const isUsingSeedFallback = !dbSettings && (!dbProducts || dbProducts.length === 0);

  const products = dbProducts && dbProducts.length > 0 ? dbProducts : isUsingSeedFallback ? INITIAL_PRODUCTS : dbProducts || [];
  const categories = dbCategories && dbCategories.length > 0 ? dbCategories : isUsingSeedFallback ? INITIAL_CATEGORIES : dbCategories || [];
  const brands = dbBrands && dbBrands.length > 0 ? dbBrands : isUsingSeedFallback ? INITIAL_BRANDS : dbBrands || [];
  const offers = dbOffers && dbOffers.length > 0 ? dbOffers : isUsingSeedFallback ? INITIAL_OFFERS : dbOffers || [];
  const ads = dbAds && dbAds.length > 0 ? dbAds : isUsingSeedFallback ? INITIAL_ADS : dbAds || [];
  const homepageSections =
    dbSections && dbSections.length > 0
      ? dbSections
      : isUsingSeedFallback
      ? INITIAL_HOMEPAGE_SECTIONS
      : dbSections || [];
  const projectPackages =
    dbPackages && dbPackages.length > 0 ? dbPackages : INITIAL_PROJECT_PACKAGES;
  const academyCourses =
    dbCourses && dbCourses.length > 0 ? dbCourses : INITIAL_ACADEMY_COURSES;
  const labResources =
    dbLabResources && dbLabResources.length > 0 ? dbLabResources : INITIAL_LAB_RESOURCES;
  const rewardOffers =
    dbRewardOffers && dbRewardOffers.length > 0 ? dbRewardOffers : INITIAL_REWARD_OFFERS;

  const storeSettings: StoreSettings = {
    ...INITIAL_STORE_SETTINGS,
    ...(dbSettings || {}),
    whatsappNumber: dbSettings?.whatsappNumber || INITIAL_STORE_SETTINGS.whatsappNumber || '967770581056',
    paymentAccounts:
      dbSettings?.paymentAccounts && dbSettings.paymentAccounts.length > 0
        ? dbSettings.paymentAccounts
        : DEFAULT_PAYMENT_ACCOUNTS,
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        theme,
        setTheme,
        toggleTheme,
        route,
        navigate,
        authReady,
        authLoading,
        authError,
        clearAuthError,
        firebaseUser,
        userProfile,
        isAdminOrStaff,
        isTrainerOrStaff,
        isSuperAdmin,
        signInWithGoogle,
        logout,
        products,
        categories,
        brands,
        offers,
        ads,
        homepageSections,
        projectPackages,
        academyCourses,
        labResources,
        rewardOffers,
        storeSettings,
        selectedProduct,
        setSelectedProduct,
        searchQuery,
        setSearchQuery,
        selectedCategoryFilter,
        setSelectedCategoryFilter,
        selectedBrandFilter,
        setSelectedBrandFilter,
        isUsingSeedFallback,
        favorites,
        favoriteIds,
        isFavorite,
        isFavoriteBusy,
        toggleFavorite,
        removeFromFavorites,
        cart,
        cartCount,
        cartOpen,
        setCartOpen,
        addToCart,
        addManyToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        userRewards,
        alertSubscriptions,
        userNotifications,
        unreadNotificationsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  BOOTSTRAP_OWNER_EMAIL,
  OperationType,
  db,
  handleFirestoreError,
} from '../lib/firebase.ts';
import {
  INITIAL_ACADEMY_COURSES,
  INITIAL_ADS,
  INITIAL_BRANDS,
  INITIAL_CATEGORIES,
  INITIAL_HOMEPAGE_SECTIONS,
  INITIAL_LAB_RESOURCES,
  INITIAL_OFFERS,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCT_PRIVATE,
  INITIAL_PROJECT_PACKAGES,
  INITIAL_REWARD_OFFERS,
  INITIAL_STORE_SETTINGS,
} from '../data/seedData.ts';
import type {
  AcademyCertificate,
  AcademyCourse,
  AcademyEnrollment,
  ActivityLog,
  AdminPermission,
  AdminSettings,
  Advertisement,
  AlertSubscription,
  AppNotification,
  Brand,
  Category,
  CommunityComment,
  CommunityPost,
  CommunityReport,
  EngineerProfile,
  FavoriteItem,
  HomepageSection,
  Invoice,
  InvoiceCounter,
  InvoiceItem,
  InvoicePaymentStatus,
  InvoiceSource,
  LabResource,
  Offer,
  PriceHistoryEntry,
  Product,
  ProductPrivate,
  ProjectPackage,
  Reservation,
  ReservationStatus,
  ReservationTracking,
  RewardOffer,
  StoreBackup,
  StoreSettings,
  UserProfile,
  UserRewards,
} from '../types/index.ts';
import { normalizePhoneDigits } from '../i18n/translations.ts';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'dashboard',
  'products',
  'categories',
  'offers',
  'packages',
  'reservations',
  'invoices',
  'academy',
  'community',
  'lab',
  'engineers',
  'rewards',
  'ads',
  'customers',
  'brands',
  'homepage',
  'chat',
  'notifications',
  'reports',
  'settings',
  'users',
  'backup',
  'logs',
];

// Clean helper to omit undefined fields before writing to Firestore
function stripUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function isOfferCurrentlyActive(offer: Offer): boolean {
  if (!offer.isActive) return false;
  const now = Date.now();
  const start = Date.parse(offer.startDate);
  const end = Date.parse(offer.endDate);
  if (offer.autoActivate && !Number.isNaN(start) && now < start) return false;
  if (offer.autoExpire && !Number.isNaN(end) && now > end) return false;
  return true;
}

export function isAdCurrentlyActive(ad: Advertisement): boolean {
  if (!ad.isActive) return false;
  const now = Date.now();
  const start = Date.parse(ad.startDate);
  const end = Date.parse(ad.endDate);
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now > end) return false;
  return true;
}

// Subscribe to public storefront data cleanly (with error callbacks)
export function subscribePublicProducts(
  isAdminMode: boolean,
  cb: (items: Product[]) => void
): Unsubscribe {
  const path = 'products';
  const q = isAdminMode
    ? query(collection(db, path), orderBy('createdAt', 'desc'))
    : query(collection(db, path), where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Product);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (error) => {
      console.error('Products listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeCategories(
  isAdminMode: boolean,
  cb: (items: Category[]) => void
): Unsubscribe {
  const path = 'categories';
  const q = isAdminMode
    ? query(collection(db, path), orderBy('order', 'asc'))
    : query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Category);
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      cb(list);
    },
    (error) => {
      console.error('Categories listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeBrands(
  isAdminMode: boolean,
  cb: (items: Brand[]) => void
): Unsubscribe {
  const path = 'brands';
  const q = isAdminMode
    ? collection(db, path)
    : query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Brand)),
    (error) => {
      console.error('Brands listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeOffers(
  isAdminMode: boolean,
  cb: (items: Offer[]) => void
): Unsubscribe {
  const path = 'offers';
  const q = isAdminMode
    ? collection(db, path)
    : query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Offer);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (error) => {
      console.error('Offers listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeAds(
  isAdminMode: boolean,
  cb: (items: Advertisement[]) => void
): Unsubscribe {
  const path = 'advertisements';
  const q = isAdminMode
    ? collection(db, path)
    : query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Advertisement);
      list.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      cb(list);
    },
    (error) => {
      console.error('Ads listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeHomepageSections(
  isAdminMode: boolean,
  cb: (items: HomepageSection[]) => void
): Unsubscribe {
  const path = 'homepage_sections';
  const q = isAdminMode
    ? collection(db, path)
    : query(collection(db, path), where('isEnabled', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as HomepageSection);
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      cb(list);
    },
    (error) => {
      console.error('Homepage sections listener warning:', error);
      cb([]);
    }
  );
}

export function subscribeStoreSettings(cb: (settings: StoreSettings | null) => void): Unsubscribe {
  const ref = doc(db, 'store_settings', 'main');
  return onSnapshot(
    ref,
    (snap) => cb(snap.exists() ? (snap.data() as StoreSettings) : null),
    (error) => {
      console.error('Store settings listener warning:', error);
      cb(null);
    }
  );
}

// Admin-only listeners
export function subscribeAdminWholesale(cb: (map: Record<string, ProductPrivate>) => void): Unsubscribe {
  const path = 'product_private';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const map: Record<string, ProductPrivate> = {};
      snap.docs.forEach((d) => {
        const item = d.data() as ProductPrivate;
        map[item.productId] = item;
      });
      cb(map);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeAllReservations(cb: (items: Reservation[]) => void): Unsubscribe {
  const path = 'reservations';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Reservation)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeCustomerReservations(uid: string, cb: (items: Reservation[]) => void): Unsubscribe {
  const path = 'reservations';
  const q = query(collection(db, path), where('customerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Reservation);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeUserFavorites(
  uid: string,
  cb: (items: FavoriteItem[]) => void
): Unsubscribe {
  const path = `users/${uid}/favorites`;
  const q = query(collection(db, 'users', uid, 'favorites'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as FavoriteItem);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function addFavorite(uid: string, product: Product): Promise<FavoriteItem> {
  const path = `users/${uid}/favorites/${product.id}`;
  const ref = doc(db, 'users', uid, 'favorites', product.id);
  const rawImg = (product.images?.[0] || '').trim();
  const safeImageUrl = rawImg.length <= 500 ? rawImg : '';

  const item: FavoriteItem = {
    id: product.id.slice(0, 128),
    uid: uid.slice(0, 128),
    productId: product.id.slice(0, 128),
    productNameAr: (product.nameAr || product.nameEn || 'Product').trim().slice(0, 160),
    productNameEn: (product.nameEn || product.nameAr || 'Product').trim().slice(0, 160),
    brandName: (product.brandName || '').trim().slice(0, 100),
    modelNumber: (product.modelNumber || '').trim().slice(0, 100),
    retailPrice: Math.max(0, Number(product.retailPrice || 0)),
    imageUrl: safeImageUrl,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return existing.data() as FavoriteItem;
    }
    await setDoc(ref, stripUndefined(item));
    return item;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeFavorite(uid: string, productId: string): Promise<void> {
  const path = `users/${uid}/favorites/${productId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'favorites', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeUsers(cb: (items: UserProfile[]) => void): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snap) => cb(snap.docs.map((d) => d.data() as UserProfile)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeNotifications(
  isAdmin: boolean,
  uid: string | undefined,
  cb: (items: AppNotification[]) => void
): Unsubscribe {
  const path = 'notifications';
  if (isAdmin) {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(60));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => d.data() as AppNotification)),
      (error) => handleFirestoreError(error, OperationType.LIST, path)
    );
  }
  if (!uid) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, path), where('recipientUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as AppNotification);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeActivityLogs(cb: (items: ActivityLog[]) => void): Unsubscribe {
  const path = 'activity_logs';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as ActivityLog)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeBackups(cb: (items: StoreBackup[]) => void): Unsubscribe {
  const path = 'store_backups';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as StoreBackup)),
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

// Ensure user profile exists on sign in
export async function syncUserProfileOnLogin(params: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<UserProfile> {
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  const cleanEmail = (params.email || '').trim().slice(0, 160);
  const fallbackName = cleanEmail.split('@')[0] || 'User';
  const cleanDisplayName = ((params.displayName || '').trim() || fallbackName).slice(0, 120);

  try {
    const snap = await getDoc(ref);
    const isBootstrap = cleanEmail.toLowerCase() === BOOTSTRAP_OWNER_EMAIL.toLowerCase();
    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      if (isBootstrap && (existing.role !== 'super_admin' || (existing.permissions?.length || 0) < ALL_ADMIN_PERMISSIONS.length)) {
        const updated: UserProfile = {
          ...existing,
          role: 'super_admin',
          permissions: ALL_ADMIN_PERMISSIONS,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, stripUndefined(updated));
        return updated;
      }
      return existing;
    }
    const now = new Date().toISOString();
    const profile: UserProfile = {
      uid: params.uid,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role: isBootstrap ? 'super_admin' : 'customer',
      permissions: isBootstrap ? ALL_ADMIN_PERMISSIONS : [],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, stripUndefined(profile));

    if (!isBootstrap) {
      await createNotification({
        recipientType: 'admin',
        type: 'new_customer',
        titleAr: 'تسجيل عميل جديد',
        titleEn: 'New Customer Registered',
        messageAr: `انضم العميل ${profile.displayName} (${profile.email}) إلى المنصة.`.slice(0, 500),
        messageEn: `Customer ${profile.displayName} (${profile.email}) registered.`.slice(0, 500),
        relatedId: profile.uid,
      });
    }

    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Seed initial catalog into Firestore (called automatically when Admin opens dashboard)
export async function seedInitialStoreDataIfEmpty(): Promise<boolean> {
  const settingsRef = doc(db, 'store_settings', 'main');
  try {
    const existing = await getDoc(settingsRef);
    if (!existing.exists()) {
      const batch = writeBatch(db);
      batch.set(settingsRef, stripUndefined(INITIAL_STORE_SETTINGS));
      for (const c of INITIAL_CATEGORIES) {
        batch.set(doc(db, 'categories', c.id), stripUndefined(c));
      }
      for (const b of INITIAL_BRANDS) {
        batch.set(doc(db, 'brands', b.id), stripUndefined(b));
      }
      for (const p of INITIAL_PRODUCTS) {
        batch.set(doc(db, 'products', p.id), stripUndefined(p));
      }
      for (const pp of INITIAL_PRODUCT_PRIVATE) {
        batch.set(doc(db, 'product_private', pp.productId), stripUndefined(pp));
      }
      for (const o of INITIAL_OFFERS) {
        batch.set(doc(db, 'offers', o.id), stripUndefined(o));
      }
      for (const a of INITIAL_ADS) {
        batch.set(doc(db, 'advertisements', a.id), stripUndefined(a));
      }
      for (const s of INITIAL_HOMEPAGE_SECTIONS) {
        batch.set(doc(db, 'homepage_sections', s.id), stripUndefined(s));
      }
      await batch.commit();
    }

    await seedNewPlatformCollectionsIfEmpty();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'store_settings/main');
  }
}

export async function seedNewPlatformCollectionsIfEmpty(): Promise<void> {
  try {
    const pkgSnap = await getDocs(query(collection(db, 'project_packages'), limit(1)));
    if (pkgSnap.empty) {
      const batch = writeBatch(db);
      for (const pkg of INITIAL_PROJECT_PACKAGES) {
        batch.set(doc(db, 'project_packages', pkg.id), stripUndefined(pkg));
      }
      await batch.commit();
    }

    const courseSnap = await getDocs(query(collection(db, 'academy_courses'), limit(1)));
    if (courseSnap.empty) {
      const batch = writeBatch(db);
      for (const c of INITIAL_ACADEMY_COURSES) {
        batch.set(doc(db, 'academy_courses', c.id), stripUndefined(c));
      }
      await batch.commit();
    }

    const labSnap = await getDocs(query(collection(db, 'lab_resources'), limit(1)));
    if (labSnap.empty) {
      const batch = writeBatch(db);
      for (const l of INITIAL_LAB_RESOURCES) {
        batch.set(doc(db, 'lab_resources', l.id), stripUndefined(l));
      }
      await batch.commit();
    }

    const rewSnap = await getDocs(query(collection(db, 'reward_offers'), limit(1)));
    if (rewSnap.empty) {
      const batch = writeBatch(db);
      for (const r of INITIAL_REWARD_OFFERS) {
        batch.set(doc(db, 'reward_offers', r.id), stripUndefined(r));
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('Platform collection seed skipped:', err);
  }
}

// Logging helper
export async function logAdminActivity(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  summaryAr: string;
  summaryEn: string;
}) {
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const logDoc: ActivityLog = {
    id,
    actorUid: params.actorUid,
    actorEmail: params.actorEmail,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    summaryAr: params.summaryAr,
    summaryEn: params.summaryEn,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'activity_logs', id), stripUndefined(logDoc));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `activity_logs/${id}`);
  }
}

// Notifications helper
export async function createNotification(params: {
  recipientType: 'admin' | 'customer';
  recipientUid?: string;
  targetPhone?: string;
  type: AppNotification['type'];
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  relatedId?: string;
}) {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: AppNotification = {
    id,
    recipientType: params.recipientType,
    recipientUid: params.recipientUid,
    targetPhone: params.targetPhone,
    type: params.type,
    titleAr: params.titleAr,
    titleEn: params.titleEn,
    messageAr: params.messageAr,
    messageEn: params.messageEn,
    relatedId: params.relatedId,
    whatsappReady: true,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'notifications', id), stripUndefined(item));
  } catch (error) {
    console.warn('Notification creation skipped:', error);
  }
}

export async function markNotificationRead(id: string) {
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

// Product CRUD (public + private wholesale + real Price History + Smart Alerts)
export async function saveProduct(
  product: Product,
  wholesalePrice: number,
  supplierNotes?: string,
  actorUid?: string
) {
  const now = new Date().toISOString();
  const cleanProduct: Product = {
    ...product,
    updatedAt: now,
    createdAt: product.createdAt || now,
  };
  const priv: ProductPrivate = {
    productId: product.id,
    wholesalePrice: Number(wholesalePrice || 0),
    supplierNotes: supplierNotes || '',
    updatedAt: now,
  };
  try {
    const prevSnap = await getDoc(doc(db, 'products', product.id));
    const prev = prevSnap.exists() ? (prevSnap.data() as Product) : null;

    const batch = writeBatch(db);
    batch.set(doc(db, 'products', product.id), stripUndefined(cleanProduct));
    batch.set(doc(db, 'product_private', product.id), stripUndefined(priv));

    // Record real Price History entry whenever retailPrice changes
    if (prev && prev.retailPrice !== cleanProduct.retailPrice && prev.retailPrice > 0) {
      const changePercent = Number(
        (((cleanProduct.retailPrice - prev.retailPrice) / prev.retailPrice) * 100).toFixed(1)
      );
      const historyId = `ph_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const historyEntry: PriceHistoryEntry = {
        id: historyId,
        productId: cleanProduct.id,
        productNameAr: cleanProduct.nameAr.slice(0, 160),
        productNameEn: cleanProduct.nameEn.slice(0, 160),
        brandName: (cleanProduct.brandName || '').slice(0, 100),
        oldPrice: prev.retailPrice,
        newPrice: cleanProduct.retailPrice,
        changePercent,
        changedByUid: (actorUid || 'asema_staff').slice(0, 128),
        changedAt: now,
      };
      batch.set(doc(db, 'price_history', historyId), stripUndefined(historyEntry));
    }

    await batch.commit();

    // Dispatch Smart Alerts for back-in-stock or price drop
    if (prev) {
      const cameBackInStock =
        ((prev.availableQuantity ?? 0) === 0 || prev.status === 'out_of_stock') &&
        cleanProduct.availableQuantity > 0 &&
        cleanProduct.status !== 'out_of_stock';
      const priceDropped = cleanProduct.retailPrice < prev.retailPrice;

      if (cameBackInStock || priceDropped) {
        try {
          const subsSnap = await getDocs(
            query(collection(db, 'alert_subscriptions'), where('productId', '==', cleanProduct.id))
          );
          for (const subDoc of subsSnap.docs) {
            const sub = subDoc.data() as AlertSubscription;
            if (!sub.isActive) continue;
            if (cameBackInStock && sub.alertType === 'back_in_stock') {
              await createNotification({
                recipientType: 'customer',
                recipientUid: sub.uid,
                type: 'back_in_stock',
                titleAr: `توفر المنتج: ${cleanProduct.nameAr}`,
                titleEn: `Back in Stock: ${cleanProduct.nameEn}`,
                messageAr: `أصبح المنتج ${cleanProduct.nameAr} متوفراً الآن في عاصمة الشبكات (${cleanProduct.availableQuantity} قطعة) بسعر $${cleanProduct.retailPrice}.`,
                messageEn: `${cleanProduct.nameEn} is back in stock (${cleanProduct.availableQuantity} units) at $${cleanProduct.retailPrice}.`,
                relatedId: cleanProduct.id,
              });
            }
            if (priceDropped && sub.alertType === 'price_drop') {
              await createNotification({
                recipientType: 'customer',
                recipientUid: sub.uid,
                type: 'price_drop',
                titleAr: `انخفاض سعر: ${cleanProduct.nameAr}`,
                titleEn: `Price Drop: ${cleanProduct.nameEn}`,
                messageAr: `انخفض سعر ${cleanProduct.nameAr} من $${prev.retailPrice} إلى $${cleanProduct.retailPrice}.`,
                messageEn: `${cleanProduct.nameEn} dropped from $${prev.retailPrice} to $${cleanProduct.retailPrice}.`,
                relatedId: cleanProduct.id,
              });
            }
          }
        } catch {
          // Only owner can list cross-user alert subscriptions; gracefully skip for restricted staff
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProduct(productId: string) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'products', productId));
    batch.delete(doc(db, 'product_private', productId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

export async function incrementProductView(product: Product) {
  try {
    await updateDoc(doc(db, 'products', product.id), {
      viewCount: (product.viewCount || 0) + 1,
    });
  } catch {
    // Non-critical metric update
  }
}

// Generic saves for Categories, Brands, Offers, Ads, HomepageSections, StoreSettings
export async function saveCategory(cat: Category) {
  try {
    await setDoc(doc(db, 'categories', cat.id), stripUndefined(cat));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `categories/${cat.id}`);
  }
}

export async function removeCategory(id: string) {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
}

export async function saveBrand(brand: Brand) {
  try {
    await setDoc(doc(db, 'brands', brand.id), stripUndefined(brand));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `brands/${brand.id}`);
  }
}

export async function removeBrand(id: string) {
  try {
    await deleteDoc(doc(db, 'brands', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `brands/${id}`);
  }
}

export async function saveOffer(offer: Offer) {
  try {
    await setDoc(doc(db, 'offers', offer.id), stripUndefined(offer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `offers/${offer.id}`);
  }
}

export async function removeOffer(id: string) {
  try {
    await deleteDoc(doc(db, 'offers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `offers/${id}`);
  }
}

export async function saveAd(ad: Advertisement) {
  try {
    await setDoc(doc(db, 'advertisements', ad.id), stripUndefined(ad));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `advertisements/${ad.id}`);
  }
}

export async function removeAd(id: string) {
  try {
    await deleteDoc(doc(db, 'advertisements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `advertisements/${id}`);
  }
}

export async function saveHomepageSectionsBatch(sections: HomepageSection[]) {
  try {
    const batch = writeBatch(db);
    for (const sec of sections) {
      batch.set(doc(db, 'homepage_sections', sec.id), stripUndefined(sec));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'homepage_sections');
  }
}

export async function removeHomepageSection(id: string) {
  try {
    await deleteDoc(doc(db, 'homepage_sections', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `homepage_sections/${id}`);
  }
}

export async function saveStoreSettings(settings: StoreSettings) {
  try {
    await setDoc(doc(db, 'store_settings', 'main'), stripUndefined(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'store_settings/main');
  }
}

export async function getAdminSettings(): Promise<AdminSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'admin_settings', 'main'));
    return snap.exists() ? (snap.data() as AdminSettings) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'admin_settings/main');
  }
}

export async function saveAdminSettings(settings: AdminSettings) {
  try {
    await setDoc(doc(db, 'admin_settings', 'main'), stripUndefined(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'admin_settings/main');
  }
}

// Reservations: Submit + Track + Update Status
export async function submitReservation(params: {
  customerUid?: string;
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  product: Product;
  unitPrice: number;
  quantity: number;
  paymentMethod?: string;
}): Promise<Reservation> {
  const digits = normalizePhoneDigits(params.phone);
  const rand6 = Math.floor(100000 + Math.random() * 900000);
  const referenceNumber = `ASM-${rand6}`;
  const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const trackingId = `${referenceNumber}_${digits}`;
  const now = new Date().toISOString();
  const totalPrice = Number((params.unitPrice * params.quantity).toFixed(2));

  const reservation: Reservation = {
    id: reservationId,
    referenceNumber,
    customerUid: params.customerUid || '',
    customerName: params.customerName.trim(),
    phone: digits,
    governorate: params.governorate,
    address: params.address.trim(),
    notes: params.notes?.trim() || '',
    productId: params.product.id,
    productNameAr: params.product.nameAr,
    productNameEn: params.product.nameEn,
    unitPrice: params.unitPrice,
    quantity: params.quantity,
    totalPrice,
    status: 'pending',
    paymentMethod: params.paymentMethod || 'pay_on_pickup_or_delivery',
    createdAt: now,
    updatedAt: now,
  };

  const tracking: ReservationTracking = {
    trackingId,
    reservationId,
    referenceNumber,
    productNameAr: params.product.nameAr,
    productNameEn: params.product.nameEn,
    quantity: params.quantity,
    totalPrice,
    governorate: params.governorate,
    status: 'pending',
    updatedAt: now,
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'reservations', reservationId), stripUndefined(reservation));
    batch.set(doc(db, 'reservation_tracking', trackingId), stripUndefined(tracking));
    await batch.commit();

    await createNotification({
      recipientType: 'admin',
      type: 'new_reservation',
      titleAr: `حجز جديد رقم ${referenceNumber}`,
      titleEn: `New Reservation ${referenceNumber}`,
      messageAr: `قام ${reservation.customerName} بحجز (${reservation.quantity}) من ${reservation.productNameAr} في ${reservation.governorate}.`,
      messageEn: `${reservation.customerName} reserved ${reservation.quantity}x ${reservation.productNameEn} (${reservation.governorate}).`,
      relatedId: reservationId,
      targetPhone: digits,
    });

    return reservation;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reservations/${reservationId}`);
  }
}

export async function lookupReservationTracking(
  referenceNumber: string,
  phone: string
): Promise<ReservationTracking | null> {
  const cleanRef = referenceNumber.trim().toUpperCase();
  const digits = normalizePhoneDigits(phone);
  if (!/^ASM-[0-9]{6}$/.test(cleanRef) || digits.length < 7) {
    return null;
  }
  const trackingId = `${cleanRef}_${digits}`;
  try {
    const snap = await getDoc(doc(db, 'reservation_tracking', trackingId));
    return snap.exists() ? (snap.data() as ReservationTracking) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `reservation_tracking/${trackingId}`);
  }
}

export function resolvePaymentMethodLabel(
  paymentMethod: string | undefined,
  storeSettings: StoreSettings
): string {
  if (!paymentMethod || paymentMethod === 'pay_on_pickup_or_delivery') {
    return 'الدفع عند الاستلام / الاستقبال (نقداً) | Cash on Delivery / Pickup';
  }
  const acc = storeSettings.paymentAccounts?.find((a) => a.id === paymentMethod);
  if (acc) {
    return `${acc.labelAr} (${acc.accountNumber})`;
  }
  return paymentMethod.slice(0, 160);
}

export function subscribeInvoices(
  mode: 'owner' | 'manager' | 'customer',
  uid: string | undefined,
  cb: (items: Invoice[]) => void
): Unsubscribe {
  const path = 'invoices';
  if (!uid) {
    cb([]);
    return () => {};
  }
  const q =
    mode === 'owner'
      ? query(collection(db, path), orderBy('issuedAt', 'desc'))
      : mode === 'manager'
      ? query(collection(db, path), where('issuedByUid', '==', uid))
      : query(collection(db, path), where('customerUid', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as Invoice);
      list.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
      cb(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const path = `invoices/${invoiceId}`;
  try {
    const snap = await getDoc(doc(db, 'invoices', invoiceId));
    return snap.exists() ? (snap.data() as Invoice) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateReservationDetails(
  reservation: Reservation,
  patch: {
    customerName: string;
    phone: string;
    governorate: string;
    address: string;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
    shippingCost: number;
    paymentMethod: string;
    notes?: string;
  }
): Promise<Reservation> {
  if (reservation.invoiceId) {
    throw new Error('Cannot edit financial order lines after an invoice has been issued.');
  }
  const now = new Date().toISOString();
  const cleanQty = Math.max(1, Math.min(500, Math.round(Number(patch.quantity || 1))));
  const cleanUnit = Math.max(0, Number(patch.unitPrice || 0));
  const cleanDiscount = Math.max(0, Number(patch.discountAmount || 0));
  const cleanShipping = Math.max(0, Number(patch.shippingCost || 0));
  const subtotal = Number((cleanUnit * cleanQty).toFixed(2));
  const totalPrice = Number(Math.max(0, subtotal - cleanDiscount + cleanShipping).toFixed(2));
  const oldDigits = normalizePhoneDigits(reservation.phone);
  const newDigits = normalizePhoneDigits(patch.phone) || oldDigits;
  const oldTrackingId = `${reservation.referenceNumber}_${oldDigits}`;
  const newTrackingId = `${reservation.referenceNumber}_${newDigits}`;

  const updated: Reservation = {
    ...reservation,
    customerName: patch.customerName.trim().slice(0, 120) || reservation.customerName,
    phone: newDigits.slice(0, 30),
    governorate: patch.governorate.trim().slice(0, 60) || reservation.governorate,
    address: patch.address.trim().slice(0, 300) || reservation.address,
    unitPrice: cleanUnit,
    quantity: cleanQty,
    discountAmount: cleanDiscount,
    shippingCost: cleanShipping,
    totalPrice,
    paymentMethod: (patch.paymentMethod || 'pay_on_pickup_or_delivery').slice(0, 60),
    notes: (patch.notes || '').trim().slice(0, 600),
    updatedAt: now,
  };

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'reservations', reservation.id), stripUndefined({
      customerName: updated.customerName,
      phone: updated.phone,
      governorate: updated.governorate,
      address: updated.address,
      unitPrice: updated.unitPrice,
      quantity: updated.quantity,
      discountAmount: updated.discountAmount,
      shippingCost: updated.shippingCost,
      totalPrice: updated.totalPrice,
      paymentMethod: updated.paymentMethod,
      notes: updated.notes,
      updatedAt: now,
    }));

    if (oldTrackingId === newTrackingId) {
      batch.update(doc(db, 'reservation_tracking', oldTrackingId), {
        quantity: updated.quantity,
        totalPrice: updated.totalPrice,
        governorate: updated.governorate,
        updatedAt: now,
      });
    } else if (reservation.status === 'pending') {
      const trackingDoc: ReservationTracking = {
        trackingId: newTrackingId,
        reservationId: reservation.id,
        referenceNumber: reservation.referenceNumber,
        productNameAr: (reservation.productNameAr || 'Product').slice(0, 160),
        productNameEn: (reservation.productNameEn || 'Product').slice(0, 160),
        quantity: updated.quantity,
        totalPrice: updated.totalPrice,
        governorate: updated.governorate,
        status: reservation.status,
        updatedAt: now,
      };
      batch.set(doc(db, 'reservation_tracking', newTrackingId), stripUndefined(trackingDoc));
    }

    await batch.commit();
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reservations/${reservation.id}`);
  }
}

function buildSanitizedInvoiceItems(items: InvoiceItem[]): InvoiceItem[] {
  return items.slice(0, 50).map((it) => {
    const quantity = Math.max(1, Math.min(500, Math.round(Number(it.quantity || 1))));
    const unitPrice = Math.max(0, Number(it.unitPrice || 0));
    const lineTotal = Number((quantity * unitPrice).toFixed(2));
    return stripUndefined({
      productId: it.productId ? it.productId.slice(0, 128) : undefined,
      nameAr: (it.nameAr || it.nameEn || 'منتج').trim().slice(0, 160),
      nameEn: (it.nameEn || it.nameAr || 'Product').trim().slice(0, 160),
      modelNumber: it.modelNumber ? it.modelNumber.trim().slice(0, 100) : undefined,
      quantity,
      unitPrice,
      lineTotal,
    });
  });
}

function computeInvoicePaymentFields(totalAmount: number, paidAmountRaw: number): {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: InvoicePaymentStatus;
} {
  const paidAmount = Number(Math.max(0, Math.min(totalAmount, paidAmountRaw)).toFixed(2));
  const remainingAmount = Number(Math.max(0, totalAmount - paidAmount).toFixed(2));
  const paymentStatus: InvoicePaymentStatus =
    remainingAmount <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
  return { paidAmount, remainingAmount, paymentStatus };
}

export async function issueInvoiceFromReservation(params: {
  reservation: Reservation;
  actor: UserProfile;
  storeSettings: StoreSettings;
  source?: Extract<InvoiceSource, 'auto_reservation' | 'manual_reservation'>;
  paidAmount?: number;
  products?: Product[];
}): Promise<Invoice> {
  const resRef = doc(db, 'reservations', params.reservation.id);
  const counterRef = doc(db, 'invoice_counters', 'main');

  try {
    const existingId = params.reservation.invoiceId;
    if (existingId) {
      const existingSnap = await getDoc(doc(db, 'invoices', existingId));
      if (existingSnap.exists()) {
        return existingSnap.data() as Invoice;
      }
    }

    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();

    const issuedInvoice = await runTransaction(db, async (tx) => {
      const freshResSnap = await tx.get(resRef);
      const freshRes = freshResSnap.exists()
        ? (freshResSnap.data() as Reservation)
        : params.reservation;

      if (freshRes.invoiceId) {
        const invSnap = await tx.get(doc(db, 'invoices', freshRes.invoiceId));
        if (invSnap.exists()) {
          return invSnap.data() as Invoice;
        }
      }

      const counterSnap = await tx.get(counterRef);
      const prevCounter = counterSnap.exists()
        ? (counterSnap.data() as InvoiceCounter)
        : null;
      const nextSequence =
        prevCounter && prevCounter.year === currentYear
          ? prevCounter.lastSequence + 1
          : 1;

      const invoiceNumber = `INV-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
      const invoiceId = `inv_${currentYear}_${String(nextSequence).padStart(4, '0')}_${Math.random().toString(36).slice(2, 6)}`;

      const matchedProd = params.products?.find((p) => p.id === freshRes.productId);
      const unitPrice = Math.max(
        0,
        Number(
          freshRes.unitPrice ??
            (freshRes.quantity > 0 ? freshRes.totalPrice / freshRes.quantity : 0)
        )
      );
      const quantity = Math.max(1, Math.round(Number(freshRes.quantity || 1)));
      const items = buildSanitizedInvoiceItems([
        {
          productId: freshRes.productId,
          nameAr: freshRes.productNameAr || matchedProd?.nameAr || 'منتج شبكات',
          nameEn: freshRes.productNameEn || matchedProd?.nameEn || 'Networking Product',
          modelNumber: matchedProd?.modelNumber || '',
          quantity,
          unitPrice,
          lineTotal: Number((unitPrice * quantity).toFixed(2)),
        },
      ]);

      const subtotal = Number(
        items.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
      );
      const discountAmount = Math.max(0, Number(freshRes.discountAmount || 0));
      const shippingCost = Math.max(0, Number(freshRes.shippingCost || 0));
      const totalAmount = Number(
        Math.max(0, subtotal - discountAmount + shippingCost).toFixed(2)
      );
      const paymentFields = computeInvoicePaymentFields(
        totalAmount,
        params.paidAmount ?? 0
      );
      const paymentMethod = (
        freshRes.paymentMethod || 'pay_on_pickup_or_delivery'
      ).slice(0, 80);

      const invoice: Invoice = stripUndefined({
        id: invoiceId,
        invoiceNumber,
        reservationId: freshRes.id.slice(0, 128),
        referenceNumber: freshRes.referenceNumber.slice(0, 40),
        customerUid: freshRes.customerUid ? freshRes.customerUid.slice(0, 128) : '',
        customerName: freshRes.customerName.trim().slice(0, 120),
        customerPhone: freshRes.phone.trim().slice(0, 30),
        governorate: freshRes.governorate ? freshRes.governorate.slice(0, 60) : '',
        address: freshRes.address ? freshRes.address.slice(0, 300) : '',
        items,
        subtotal,
        discountAmount,
        shippingCost,
        totalAmount,
        paidAmount: paymentFields.paidAmount,
        remainingAmount: paymentFields.remainingAmount,
        paymentStatus: paymentFields.paymentStatus,
        paymentMethod,
        paymentMethodLabel: resolvePaymentMethodLabel(
          paymentMethod,
          params.storeSettings
        ).slice(0, 160),
        notes: freshRes.notes ? freshRes.notes.slice(0, 800) : '',
        issuedByUid: params.actor.uid.slice(0, 128),
        issuedByName: (params.actor.displayName || params.actor.email).slice(0, 120),
        source: params.source || 'manual_reservation',
        isLocked: true,
        issuedAt: now,
        updatedAt: now,
      });

      const nextCounter: InvoiceCounter = {
        id: 'main',
        year: currentYear,
        lastSequence: nextSequence,
        updatedAt: now,
      };

      tx.set(counterRef, nextCounter);
      tx.set(doc(db, 'invoices', invoiceId), invoice);
      if (freshResSnap.exists()) {
        tx.update(resRef, {
          invoiceId,
          updatedAt: now,
        });
      }

      return invoice;
    });

    if (issuedInvoice.customerUid) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: issuedInvoice.customerUid,
        targetPhone: issuedInvoice.customerPhone,
        type: 'invoice_issued',
        titleAr: `إصدار فاتورة مبيعات رقم ${issuedInvoice.invoiceNumber}`,
        titleEn: `Sales Invoice ${issuedInvoice.invoiceNumber} Issued`,
        messageAr: `تم إصدار فاتورتك الإلكترونية للطلب ${issuedInvoice.referenceNumber || ''} بقيمة $${issuedInvoice.totalAmount}. يمكنك معاينتها وتحميلها بصيغة PDF من حسابك.`,
        messageEn: `Your electronic invoice ${issuedInvoice.invoiceNumber} ($${issuedInvoice.totalAmount}) is now available in your account.`,
        relatedId: issuedInvoice.id,
      });
    }

    return issuedInvoice;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'invoices');
  }
}

export async function createManualInvoice(params: {
  actor: UserProfile;
  storeSettings: StoreSettings;
  customerUid?: string;
  customerName: string;
  customerPhone: string;
  governorate?: string;
  address?: string;
  items: InvoiceItem[];
  discountAmount: number;
  shippingCost: number;
  paidAmount: number;
  paymentMethod: string;
  notes?: string;
  reservationId?: string;
  referenceNumber?: string;
}): Promise<Invoice> {
  const counterRef = doc(db, 'invoice_counters', 'main');
  const now = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  const sanitizedItems = buildSanitizedInvoiceItems(params.items);
  if (sanitizedItems.length === 0) {
    throw new Error('Invoice requires at least one line item.');
  }

  const subtotal = Number(
    sanitizedItems.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2)
  );
  const discountAmount = Math.max(0, Number(params.discountAmount || 0));
  const shippingCost = Math.max(0, Number(params.shippingCost || 0));
  const totalAmount = Number(
    Math.max(0, subtotal - discountAmount + shippingCost).toFixed(2)
  );
  const paymentFields = computeInvoicePaymentFields(totalAmount, params.paidAmount);
  const cleanMethod = (
    params.paymentMethod || 'pay_on_pickup_or_delivery'
  ).slice(0, 80);

  try {
    const invoice = await runTransaction(db, async (tx) => {
      let resSnapExists = false;
      if (params.reservationId) {
        const resSnap = await tx.get(doc(db, 'reservations', params.reservationId));
        if (resSnap.exists()) {
          resSnapExists = true;
          const existingRes = resSnap.data() as Reservation;
          if (existingRes.invoiceId) {
            const existingInv = await tx.get(doc(db, 'invoices', existingRes.invoiceId));
            if (existingInv.exists()) {
              return existingInv.data() as Invoice;
            }
          }
        }
      }

      const counterSnap = await tx.get(counterRef);
      const prevCounter = counterSnap.exists()
        ? (counterSnap.data() as InvoiceCounter)
        : null;
      const nextSequence =
        prevCounter && prevCounter.year === currentYear
          ? prevCounter.lastSequence + 1
          : 1;

      const invoiceNumber = `INV-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
      const invoiceId = `inv_${currentYear}_${String(nextSequence).padStart(4, '0')}_${Math.random().toString(36).slice(2, 6)}`;

      const created: Invoice = stripUndefined({
        id: invoiceId,
        invoiceNumber,
        reservationId: params.reservationId ? params.reservationId.slice(0, 128) : undefined,
        referenceNumber: params.referenceNumber ? params.referenceNumber.slice(0, 40) : undefined,
        customerUid: params.customerUid ? params.customerUid.slice(0, 128) : undefined,
        customerName: params.customerName.trim().slice(0, 120),
        customerPhone: params.customerPhone.trim().slice(0, 30),
        governorate: params.governorate ? params.governorate.trim().slice(0, 60) : undefined,
        address: params.address ? params.address.trim().slice(0, 300) : undefined,
        items: sanitizedItems,
        subtotal,
        discountAmount,
        shippingCost,
        totalAmount,
        paidAmount: paymentFields.paidAmount,
        remainingAmount: paymentFields.remainingAmount,
        paymentStatus: paymentFields.paymentStatus,
        paymentMethod: cleanMethod,
        paymentMethodLabel: resolvePaymentMethodLabel(
          cleanMethod,
          params.storeSettings
        ).slice(0, 160),
        notes: params.notes ? params.notes.trim().slice(0, 800) : undefined,
        issuedByUid: params.actor.uid.slice(0, 128),
        issuedByName: (params.actor.displayName || params.actor.email).slice(0, 120),
        source: params.reservationId ? 'manual_reservation' : 'manual_standalone',
        isLocked: true,
        issuedAt: now,
        updatedAt: now,
      });

      tx.set(counterRef, {
        id: 'main',
        year: currentYear,
        lastSequence: nextSequence,
        updatedAt: now,
      });
      tx.set(doc(db, 'invoices', invoiceId), created);

      if (params.reservationId && resSnapExists) {
        tx.update(doc(db, 'reservations', params.reservationId), {
          invoiceId,
          updatedAt: now,
        });
      }

      return created;
    });

    if (invoice.customerUid) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: invoice.customerUid,
        targetPhone: invoice.customerPhone,
        type: 'invoice_issued',
        titleAr: `فاتورة مبيعات إلكترونية ${invoice.invoiceNumber}`,
        titleEn: `Electronic Invoice ${invoice.invoiceNumber}`,
        messageAr: `تم إصدار فاتورة مبيعات جديدة رقم ${invoice.invoiceNumber} بمبلغ $${invoice.totalAmount}.`,
        messageEn: `New sales invoice ${invoice.invoiceNumber} for $${invoice.totalAmount} has been issued.`,
        relatedId: invoice.id,
      });
    }

    return invoice;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'invoices');
  }
}

export async function updateInvoicePayment(
  invoice: Invoice,
  paidAmountRaw: number
): Promise<Invoice> {
  const now = new Date().toISOString();
  const paymentFields = computeInvoicePaymentFields(invoice.totalAmount, paidAmountRaw);
  try {
    await updateDoc(doc(db, 'invoices', invoice.id), {
      paidAmount: paymentFields.paidAmount,
      remainingAmount: paymentFields.remainingAmount,
      paymentStatus: paymentFields.paymentStatus,
      updatedAt: now,
    });
    return {
      ...invoice,
      ...paymentFields,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoice.id}`);
  }
}

export async function markInvoiceSentToCustomer(invoice: Invoice): Promise<Invoice> {
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'invoices', invoice.id), {
      sentToCustomerAt: now,
      updatedAt: now,
    });

    if (invoice.customerUid) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: invoice.customerUid,
        targetPhone: invoice.customerPhone,
        type: 'invoice_issued',
        titleAr: `إرسال الفاتورة ${invoice.invoiceNumber}`,
        titleEn: `Invoice ${invoice.invoiceNumber} Sent`,
        messageAr: `تمت مشاركة فاتورتك رقم ${invoice.invoiceNumber} (الإجمالي: $${invoice.totalAmount} | المدفوع: $${invoice.paidAmount}). يمكنك تحميل نسخة PDF من حسابك.`,
        messageEn: `Your invoice ${invoice.invoiceNumber} (Total: $${invoice.totalAmount}) has been sent to your account.`,
        relatedId: invoice.id,
      });
    }

    return {
      ...invoice,
      sentToCustomerAt: now,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoice.id}`);
  }
}

export async function updateReservationStatus(
  reservation: Reservation,
  newStatus: ReservationStatus,
  actor?: UserProfile,
  storeSettings?: StoreSettings,
  products?: Product[]
): Promise<{ issuedInvoice?: Invoice }> {
  const now = new Date().toISOString();
  const digits = normalizePhoneDigits(reservation.phone);
  const trackingId = `${reservation.referenceNumber}_${digits}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'reservations', reservation.id), {
      status: newStatus,
      updatedAt: now,
    });
    batch.update(doc(db, 'reservation_tracking', trackingId), {
      status: newStatus,
      updatedAt: now,
    });
    await batch.commit();

    if (reservation.customerUid) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: reservation.customerUid,
        targetPhone: digits,
        type: 'reservation_updated',
        titleAr: `تحديث حالة الحجز ${reservation.referenceNumber}`,
        titleEn: `Reservation ${reservation.referenceNumber} Updated`,
        messageAr: `تم تحديث حالة طلبك للمنتج (${reservation.productNameAr}) إلى: ${newStatus}`,
        messageEn: `Your booking for ${reservation.productNameEn} is now: ${newStatus}`,
        relatedId: reservation.id,
      });
    }

    let issuedInvoice: Invoice | undefined;
    if (
      newStatus === 'confirmed' &&
      !reservation.invoiceId &&
      actor &&
      storeSettings
    ) {
      issuedInvoice = await issueInvoiceFromReservation({
        reservation: { ...reservation, status: 'confirmed' },
        actor,
        storeSettings,
        source: 'auto_reservation',
        products,
      });
    }

    if (newStatus === 'completed' && reservation.status !== 'completed' && reservation.customerUid) {
      const earned = Math.max(10, Math.round(Number(reservation.totalPrice || 0) * 0.5));
      await awardLoyaltyPoints({
        uid: reservation.customerUid,
        points: earned,
        source: 'purchase',
        titleAr: `نقاط إتمام طلب ${reservation.referenceNumber}`,
        badgeId: reservation.totalPrice >= 400 ? 'enterprise_buyer' : 'verified_buyer',
      });
    }

    return { issuedInvoice };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reservations/${reservation.id}`);
  }
}

export async function cancelCustomerReservation(reservation: Reservation) {
  const now = new Date().toISOString();
  const digits = normalizePhoneDigits(reservation.phone);
  const trackingId = `${reservation.referenceNumber}_${digits}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'reservations', reservation.id), {
      status: 'cancelled',
      updatedAt: now,
    });
    batch.update(doc(db, 'reservation_tracking', trackingId), {
      status: 'cancelled',
      updatedAt: now,
    });
    await batch.commit();

    await createNotification({
      recipientType: 'admin',
      type: 'reservation_cancelled',
      titleAr: `إلغاء حجز ${reservation.referenceNumber}`,
      titleEn: `Reservation Cancelled ${reservation.referenceNumber}`,
      messageAr: `قام العميل ${reservation.customerName} بإلغاء الحجز رقم ${reservation.referenceNumber}.`,
      messageEn: `Customer ${reservation.customerName} cancelled booking ${reservation.referenceNumber}.`,
      relatedId: reservation.id,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reservations/${reservation.id}`);
  }
}

export async function updateUserRoleAndPermissions(user: UserProfile) {
  try {
    await setDoc(doc(db, 'users', user.uid), stripUndefined({
      ...user,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
  }
}

// Full Backup Export & Restore
export async function exportFullStoreSnapshot(actor: UserProfile): Promise<{
  exportedAt: string;
  data: Record<string, unknown[]>;
}> {
  const collectionsToBackup = [
    'products',
    'product_private',
    'categories',
    'brands',
    'offers',
    'advertisements',
    'homepage_sections',
    'store_settings',
    'reservations',
    'invoices',
  ];
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const col of collectionsToBackup) {
    const snap = await getDocs(collection(db, col));
    data[col] = snap.docs.map((d) => d.data());
    counts[col] = snap.size;
  }

  const backupId = `bkp_${Date.now()}`;
  const backupMeta: StoreBackup = {
    id: backupId,
    label: `Snapshot ${new Date().toLocaleDateString('en-GB')}`,
    createdByUid: actor.uid,
    createdByEmail: actor.email,
    recordCounts: counts,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'store_backups', backupId), stripUndefined(backupMeta));
  return { exportedAt: backupMeta.createdAt, data };
}

export async function restoreFullStoreSnapshot(snapshotData: Record<string, Record<string, unknown>[]>) {
  const allowedCollections = [
    'products',
    'product_private',
    'categories',
    'brands',
    'offers',
    'advertisements',
    'homepage_sections',
    'store_settings',
  ];
  for (const col of allowedCollections) {
    const records = snapshotData[col];
    if (!Array.isArray(records)) continue;
    for (const item of records) {
      const docId = String(item.id || item.productId || 'main');
      await setDoc(doc(db, col, docId), stripUndefined(item));
    }
  }
}

// =========================================================================
// PHASE 2 SMART TECH PLATFORM SERVICES
// =========================================================================

export async function submitBatchReservations(params: {
  customerUid?: string;
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  items: { product: Product; quantity: number; unitPrice: number }[];
  paymentMethod?: string;
}): Promise<Reservation[]> {
  const digits = normalizePhoneDigits(params.phone);
  const batchId = `batch_${Date.now()}`;
  const now = new Date().toISOString();
  const created: Reservation[] = [];

  try {
    const batch = writeBatch(db);
    for (const item of params.items) {
      const rand6 = Math.floor(100000 + Math.random() * 900000);
      const referenceNumber = `ASM-${rand6}`;
      const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const trackingId = `${referenceNumber}_${digits}`;
      const totalPrice = Number((item.unitPrice * item.quantity).toFixed(2));

      const reservation: Reservation = {
        id: reservationId,
        referenceNumber,
        batchId,
        customerUid: params.customerUid || '',
        customerName: params.customerName.trim().slice(0, 120),
        phone: digits,
        governorate: params.governorate,
        address: params.address.trim().slice(0, 300),
        notes: (params.notes || '').trim().slice(0, 600),
        productId: item.product.id,
        productNameAr: item.product.nameAr.slice(0, 160),
        productNameEn: item.product.nameEn.slice(0, 160),
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice,
        status: 'pending',
        paymentMethod: params.paymentMethod || 'pay_on_pickup_or_delivery',
        createdAt: now,
        updatedAt: now,
      };
      const tracking: ReservationTracking = {
        trackingId,
        reservationId,
        referenceNumber,
        productNameAr: item.product.nameAr.slice(0, 160),
        productNameEn: item.product.nameEn.slice(0, 160),
        quantity: item.quantity,
        totalPrice,
        governorate: params.governorate,
        status: 'pending',
        updatedAt: now,
      };
      batch.set(doc(db, 'reservations', reservationId), stripUndefined(reservation));
      batch.set(doc(db, 'reservation_tracking', trackingId), stripUndefined(tracking));
      created.push(reservation);
    }

    await batch.commit();

    await createNotification({
      recipientType: 'admin',
      type: 'new_reservation',
      titleAr: `طلب سلة مشروع (${created.length} منتجات)`,
      titleEn: `New Project Cart Order (${created.length} items)`,
      messageAr: `قام ${params.customerName} بإرسال طلب مجمّع من ${created.length} منتجات بقيمة إجمالية $${created.reduce((s, r) => s + r.totalPrice, 0).toFixed(2)}.`,
      messageEn: `${params.customerName} submitted a ${created.length}-item cart order.`,
      relatedId: created[0]?.id,
      targetPhone: digits,
    });

    return created;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'reservations');
  }
}

// Project Packages
export function subscribeProjectPackages(isAdmin: boolean, cb: (items: ProjectPackage[]) => void): Unsubscribe {
  const path = 'project_packages';
  const q = isAdmin
    ? collection(db, path)
    : query(collection(db, path), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ProjectPackage);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (err) => {
      console.error('Packages listener warning:', err);
      cb([]);
    }
  );
}

export async function saveProjectPackage(pkg: ProjectPackage) {
  try {
    await setDoc(doc(db, 'project_packages', pkg.id), stripUndefined(pkg));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `project_packages/${pkg.id}`);
  }
}

export async function removeProjectPackage(id: string) {
  try {
    await deleteDoc(doc(db, 'project_packages', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `project_packages/${id}`);
  }
}

// Community Posts, Comments & Reports
export function subscribeCommunityPosts(isAdmin: boolean, cb: (items: CommunityPost[]) => void): Unsubscribe {
  const path = 'community_posts';
  const q = isAdmin
    ? collection(db, path)
    : query(collection(db, path), where('status', '==', 'active'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as CommunityPost);
      list.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      cb(list);
    },
    (err) => {
      console.error('Community listener warning:', err);
      cb([]);
    }
  );
}

export async function createCommunityPost(post: CommunityPost) {
  try {
    await setDoc(doc(db, 'community_posts', post.id), stripUndefined(post));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `community_posts/${post.id}`);
  }
}

export async function updateCommunityPost(postId: string, patch: Partial<CommunityPost>) {
  try {
    await updateDoc(doc(db, 'community_posts', postId), stripUndefined({
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `community_posts/${postId}`);
  }
}

export async function deleteCommunityPost(postId: string) {
  try {
    await deleteDoc(doc(db, 'community_posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `community_posts/${postId}`);
  }
}

export async function toggleHelpfulPost(post: CommunityPost) {
  try {
    await updateDoc(doc(db, 'community_posts', post.id), {
      helpfulCount: (post.helpfulCount || 0) + 1,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `community_posts/${post.id}`);
  }
}

export function subscribePostComments(postId: string, cb: (items: CommunityComment[]) => void): Unsubscribe {
  const q = query(collection(db, 'community_posts', postId, 'comments'), where('postId', '==', postId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as CommunityComment);
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      cb(list);
    },
    () => cb([])
  );
}

export async function addPostComment(post: CommunityPost, comment: CommunityComment) {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'community_posts', post.id, 'comments', comment.id), stripUndefined(comment));
    batch.update(doc(db, 'community_posts', post.id), {
      commentCount: (post.commentCount || 0) + 1,
    });
    await batch.commit();

    if (post.authorUid && post.authorUid !== comment.authorUid) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: post.authorUid,
        type: 'community_reply',
        titleAr: `رد جديد على مشاركتك في المجتمع`,
        titleEn: `New reply on your community post`,
        messageAr: `أضاف ${comment.authorName} رداً على: "${post.title.slice(0, 60)}"`,
        messageEn: `${comment.authorName} replied to "${post.title.slice(0, 60)}"`,
        relatedId: post.id,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `community_posts/${post.id}/comments/${comment.id}`);
  }
}

export async function markCommentAsSolution(postId: string, commentId: string, isSolution: boolean) {
  try {
    await updateDoc(doc(db, 'community_posts', postId, 'comments', commentId), { isSolution });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `community_posts/${postId}/comments/${commentId}`);
  }
}

export async function submitCommunityReport(report: CommunityReport) {
  try {
    await setDoc(doc(db, 'community_reports', report.id), stripUndefined(report));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `community_reports/${report.id}`);
  }
}

export function subscribeCommunityReports(cb: (items: CommunityReport[]) => void): Unsubscribe {
  const path = 'community_reports';
  return onSnapshot(
    query(collection(db, path), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => d.data() as CommunityReport)),
    (err) => {
      console.warn('Reports listener warning:', err);
      cb([]);
    }
  );
}

export async function updateCommunityReportStatus(reportId: string, status: CommunityReport['status']) {
  try {
    await updateDoc(doc(db, 'community_reports', reportId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `community_reports/${reportId}`);
  }
}

// Academy Courses, Enrollments & Verifiable Certificates
export function subscribeAcademyCourses(isTrainerOrAdmin: boolean, cb: (items: AcademyCourse[]) => void): Unsubscribe {
  const path = 'academy_courses';
  const q = isTrainerOrAdmin
    ? collection(db, path)
    : query(collection(db, path), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as AcademyCourse);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    (err) => {
      console.error('Academy courses listener warning:', err);
      cb([]);
    }
  );
}

export async function saveAcademyCourse(course: AcademyCourse) {
  try {
    await setDoc(doc(db, 'academy_courses', course.id), stripUndefined(course));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `academy_courses/${course.id}`);
  }
}

export async function removeAcademyCourse(courseId: string) {
  try {
    await deleteDoc(doc(db, 'academy_courses', courseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `academy_courses/${courseId}`);
  }
}

export function subscribeUserEnrollments(uid: string, cb: (items: AcademyEnrollment[]) => void): Unsubscribe {
  const q = query(collection(db, 'academy_enrollments'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as AcademyEnrollment)),
    () => cb([])
  );
}

export function subscribeAllEnrollments(cb: (items: AcademyEnrollment[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'academy_enrollments'),
    (snap) => cb(snap.docs.map((d) => d.data() as AcademyEnrollment)),
    () => cb([])
  );
}

export async function saveAcademyEnrollment(enrollment: AcademyEnrollment) {
  try {
    await setDoc(doc(db, 'academy_enrollments', enrollment.id), stripUndefined(enrollment));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `academy_enrollments/${enrollment.id}`);
  }
}

export function subscribeUserCertificates(uid: string, cb: (items: AcademyCertificate[]) => void): Unsubscribe {
  const q = query(collection(db, 'academy_certificates'), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as AcademyCertificate);
      list.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
      cb(list);
    },
    () => cb([])
  );
}

export function subscribeAllCertificates(cb: (items: AcademyCertificate[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'academy_certificates'),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as AcademyCertificate);
      list.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || ''));
      cb(list);
    },
    () => cb([])
  );
}

export async function issueAcademyCertificate(params: {
  uid: string;
  studentName: string;
  course: AcademyCourse;
  scorePercent: number;
}): Promise<AcademyCertificate> {
  const year = new Date().getFullYear();
  const suffix = String(Math.floor(10000 + Math.random() * 89999));
  const certificateCode = `ASEMA-CERT-${year}-${suffix}`;
  const now = new Date().toISOString();

  const cert: AcademyCertificate = {
    id: certificateCode,
    certificateCode,
    uid: params.uid.slice(0, 128),
    studentName: params.studentName.trim().slice(0, 120) || 'ASEMA Graduate',
    courseId: params.course.id,
    courseTitleAr: params.course.titleAr.slice(0, 180),
    courseTitleEn: params.course.titleEn.slice(0, 180),
    track: params.course.track,
    level: params.course.level,
    scorePercent: Math.max(0, Math.min(100, Math.round(params.scorePercent))),
    instructorName: params.course.instructorName.slice(0, 120),
    isValid: true,
    issuedAt: now,
  };

  try {
    await setDoc(doc(db, 'academy_certificates', certificateCode), stripUndefined(cert));
    await awardLoyaltyPoints({
      uid: params.uid,
      points: Math.min(500, Math.max(25, params.course.pointsReward || 100)),
      source: 'academy',
      titleAr: `إتمام دورة: ${params.course.titleAr.slice(0, 60)}`,
      badgeId: 'academy_certified',
    });
    return cert;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `academy_certificates/${certificateCode}`);
  }
}

export async function verifyCertificateByCode(code: string): Promise<AcademyCertificate | null> {
  const clean = code.trim().toUpperCase();
  if (!/^ASEMA-CERT-[0-9]{4}-[0-9]{4,8}$/.test(clean)) return null;
  try {
    const snap = await getDoc(doc(db, 'academy_certificates', clean));
    return snap.exists() ? (snap.data() as AcademyCertificate) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `academy_certificates/${clean}`);
  }
}

export async function toggleCertificateValidity(certId: string, isValid: boolean) {
  try {
    await updateDoc(doc(db, 'academy_certificates', certId), { isValid });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `academy_certificates/${certId}`);
  }
}

// Engineer Profiles & Opt-In Public Directory
export function subscribePublicEngineers(isAdmin: boolean, cb: (items: EngineerProfile[]) => void): Unsubscribe {
  const q = isAdmin
    ? collection(db, 'engineer_profiles')
    : query(collection(db, 'engineer_profiles'), where('showInDirectory', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as EngineerProfile);
      list.sort((a, b) => {
        if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
        return (b.yearsExperience || 0) - (a.yearsExperience || 0);
      });
      cb(list);
    },
    () => cb([])
  );
}

export async function getEngineerProfile(uid: string): Promise<EngineerProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'engineer_profiles', uid));
    return snap.exists() ? (snap.data() as EngineerProfile) : null;
  } catch {
    return null;
  }
}

export async function saveEngineerProfile(profile: EngineerProfile) {
  try {
    await setDoc(doc(db, 'engineer_profiles', profile.uid), stripUndefined(profile));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `engineer_profiles/${profile.uid}`);
  }
}

export async function adminVerifyEngineerBadge(
  profile: EngineerProfile,
  approved: boolean,
  badgeText: string
) {
  const now = new Date().toISOString();
  const updated: EngineerProfile = {
    ...profile,
    isVerified: approved,
    verificationBadge: approved ? badgeText.slice(0, 80) || 'مهندس شبكات معتمد' : '',
    verificationStatus: approved ? 'approved' : 'rejected',
    updatedAt: now,
  };
  try {
    await setDoc(doc(db, 'engineer_profiles', profile.uid), stripUndefined(updated));
    if (approved) {
      await createNotification({
        recipientType: 'customer',
        recipientUid: profile.uid,
        type: 'badge_verified',
        titleAr: 'تم توثيق هويتك المهنية في عاصمة الشبكات',
        titleEn: 'Your ASEMA Engineer Card is Verified',
        messageAr: `تهانينا! تم منح بطاقتك المهنية (${profile.membershipId}) شارة الاعتماد: ${updated.verificationBadge}.`,
        messageEn: `Your Engineer ID ${profile.membershipId} has been verified.`,
        relatedId: profile.uid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `engineer_profiles/${profile.uid}`);
  }
}

// Rewards, Points & Exclusive Offers
export function subscribeUserRewards(uid: string, cb: (data: UserRewards | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'user_rewards', uid),
    (snap) => cb(snap.exists() ? (snap.data() as UserRewards) : null),
    () => cb(null)
  );
}

export function subscribeRewardOffers(isAdmin: boolean, cb: (items: RewardOffer[]) => void): Unsubscribe {
  const q = isAdmin
    ? collection(db, 'reward_offers')
    : query(collection(db, 'reward_offers'), where('isActive', '==', true));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as RewardOffer)),
    () => cb([])
  );
}

export async function saveRewardOffer(offer: RewardOffer) {
  try {
    await setDoc(doc(db, 'reward_offers', offer.id), stripUndefined(offer));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reward_offers/${offer.id}`);
  }
}

export async function removeRewardOffer(id: string) {
  try {
    await deleteDoc(doc(db, 'reward_offers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `reward_offers/${id}`);
  }
}

export async function awardLoyaltyPoints(params: {
  uid: string;
  points: number;
  source: 'purchase' | 'academy' | 'bonus';
  titleAr: string;
  badgeId?: string;
}) {
  const ref = doc(db, 'user_rewards', params.uid);
  const now = new Date().toISOString();
  const safePts = Math.max(0, Math.round(params.points));
  try {
    const snap = await getDoc(ref);
    const prev: UserRewards = snap.exists()
      ? (snap.data() as UserRewards)
      : {
          uid: params.uid,
          totalPoints: 0,
          lifetimePoints: 0,
          academyPoints: 0,
          purchasePoints: 0,
          badges: [],
          redeemedOffers: [],
          recentEvents: [],
          createdAt: now,
          updatedAt: now,
        };

    const nextBadges = Array.from(
      new Set([...(prev.badges || []), ...(params.badgeId ? [params.badgeId] : [])])
    ).slice(0, 20);
    const nextEvents = [
      {
        id: `ev_${Date.now()}`,
        titleAr: params.titleAr.slice(0, 120),
        points: safePts,
        source: params.source,
        createdAt: now,
      },
      ...(prev.recentEvents || []),
    ].slice(0, 20);

    const next: UserRewards = {
      ...prev,
      totalPoints: prev.totalPoints + safePts,
      lifetimePoints: prev.lifetimePoints + safePts,
      academyPoints: prev.academyPoints + (params.source === 'academy' ? safePts : 0),
      purchasePoints: prev.purchasePoints + (params.source === 'purchase' ? safePts : 0),
      badges: nextBadges,
      recentEvents: nextEvents,
      updatedAt: now,
    };
    await setDoc(ref, stripUndefined(next));
  } catch (err) {
    console.warn('Reward point update skipped:', err);
  }
}

export async function redeemRewardOffer(uid: string, offer: RewardOffer): Promise<UserRewards> {
  const ref = doc(db, 'user_rewards', uid);
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('لا توجد نقاط كافية بعد للاستبدال.');
    }
    const prev = snap.data() as UserRewards;
    if (prev.totalPoints < offer.pointsCost) {
      throw new Error('رصيد نقاطك غير كافٍ لاستبدال هذا العرض.');
    }
    if (prev.redeemedOffers.includes(offer.id)) {
      throw new Error('تم استبدال هذا العرض مسبقاً.');
    }
    const next: UserRewards = {
      ...prev,
      totalPoints: prev.totalPoints - offer.pointsCost,
      redeemedOffers: [...prev.redeemedOffers, offer.id].slice(0, 30),
      recentEvents: [
        {
          id: `ev_${Date.now()}`,
          titleAr: `استبدال: ${offer.titleAr.slice(0, 80)}`,
          points: -offer.pointsCost,
          source: 'redeem' as const,
          createdAt: now,
        },
        ...(prev.recentEvents || []),
      ].slice(0, 20),
      updatedAt: now,
    };
    await setDoc(ref, stripUndefined(next));
    return next;
  } catch (err) {
    if (err instanceof Error && !('code' in err)) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `user_rewards/${uid}`);
  }
}

// Technical Lab Resources (with moderation)
export function subscribeLabResources(isAdmin: boolean, currentUid: string | undefined, cb: (items: LabResource[]) => void): Unsubscribe {
  const q = isAdmin
    ? collection(db, 'lab_resources')
    : query(collection(db, 'lab_resources'), where('status', '==', 'approved'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as LabResource);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    () => cb([])
  );
  void currentUid;
}

export async function submitLabResource(resource: LabResource) {
  try {
    await setDoc(doc(db, 'lab_resources', resource.id), stripUndefined(resource));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `lab_resources/${resource.id}`);
  }
}

export async function reviewLabResource(
  resourceId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string,
  authorUid?: string,
  title?: string
) {
  try {
    await updateDoc(doc(db, 'lab_resources', resourceId), stripUndefined({
      status,
      reviewNote: reviewNote ? reviewNote.slice(0, 400) : '',
      updatedAt: new Date().toISOString(),
    }));
    if (status === 'approved' && authorUid && authorUid !== 'asema_system') {
      await createNotification({
        recipientType: 'customer',
        recipientUid: authorUid,
        type: 'lab_approved',
        titleAr: 'تمت الموافقة على مساهمتك في مختبر عاصمة الشبكات',
        titleEn: 'Your Technical Lab Resource Was Approved',
        messageAr: `تمت مراجعة ونشر "${(title || '').slice(0, 80)}" في مكتبة المختبر.`,
        messageEn: `"${(title || '').slice(0, 80)}" is now published in the ASEMA Technical Lab.`,
        relatedId: resourceId,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `lab_resources/${resourceId}`);
  }
}

export async function incrementLabCopyCount(resource: LabResource) {
  try {
    await updateDoc(doc(db, 'lab_resources', resource.id), {
      copyCount: (resource.copyCount || 0) + 1,
    });
  } catch {
    // non-critical counter
  }
}

export async function removeLabResource(id: string) {
  try {
    await deleteDoc(doc(db, 'lab_resources', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `lab_resources/${id}`);
  }
}

// Market Index Price History
export function subscribePriceHistory(cb: (items: PriceHistoryEntry[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'price_history'), where('newPrice', '>=', 0), limit(60)),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as PriceHistoryEntry);
      list.sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || ''));
      cb(list);
    },
    () => cb([])
  );
}

// Smart Alert Subscriptions
export function subscribeUserAlertSubscriptions(uid: string, cb: (items: AlertSubscription[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'alert_subscriptions'), where('uid', '==', uid)),
    (snap) => {
      const list = snap.docs.map((d) => d.data() as AlertSubscription);
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      cb(list);
    },
    () => cb([])
  );
}

export async function saveAlertSubscription(sub: AlertSubscription) {
  try {
    await setDoc(doc(db, 'alert_subscriptions', sub.id), stripUndefined(sub));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `alert_subscriptions/${sub.id}`);
  }
}

export async function removeAlertSubscription(id: string) {
  try {
    await deleteDoc(doc(db, 'alert_subscriptions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `alert_subscriptions/${id}`);
  }
}


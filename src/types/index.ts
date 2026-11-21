export type Language = 'ar' | 'en';

export type UserRole = 'super_admin' | 'manager' | 'trainer' | 'customer';

export type AdminPermission =
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  governorate?: string;
  address?: string;
  role: UserRole;
  permissions?: AdminPermission[];
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt?: string;
}

export type ProductStatus =
  | 'available'
  | 'limited_stock'
  | 'out_of_stock'
  | 'coming_soon'
  | 'discontinued';

export interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  specsAr?: string;
  specsEn?: string;
  brandId: string;
  brandName?: string;
  modelNumber?: string;
  categoryId: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  retailPrice: number;
  previousPrice?: number;
  discountPercentage?: number;
  availableQuantity: number;
  status: ProductStatus;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isExclusive?: boolean;
  isBestSeller?: boolean;
  isPublished: boolean;
  tags?: string[];
  images?: string[];
  documentationUrl?: string;
  warrantyAr?: string;
  warrantyEn?: string;
  viewCount?: number;
  reservationCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductPrivate {
  productId: string;
  wholesalePrice: number;
  supplierNotes?: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descriptionAr?: string;
  descriptionEn?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface Brand {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  country?: string;
  logoText?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
}

export type OfferSectionType =
  | 'today_deals'
  | 'weekly_offers'
  | 'exclusive_offers'
  | 'limited_time'
  | 'wholesale_offers'
  | 'new_promotions';

export interface Offer {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  sectionType: OfferSectionType;
  productId: string;
  productNameAr?: string;
  productNameEn?: string;
  imageUrl?: string;
  originalPrice: number;
  discountedPrice: number;
  availableQuantity?: number;
  startDate: string;
  endDate: string;
  isFeatured?: boolean;
  isActive: boolean;
  autoActivate?: boolean;
  autoExpire?: boolean;
  clickCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type AdType =
  | 'homepage_banner'
  | 'promotional_poster'
  | 'product_ad'
  | 'special_campaign'
  | 'brand_ad'
  | 'seasonal_offer'
  | 'announcement_banner'
  | 'popup_ad';

export interface Advertisement {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr?: string;
  textEn?: string;
  imageUrl?: string;
  adType: AdType;
  displayLocation: string;
  targetPage?: string;
  destinationUrl?: string;
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
  impressions?: number;
  clicks?: number;
  createdAt: string;
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export interface Reservation {
  id: string;
  referenceNumber: string;
  batchId?: string;
  customerUid?: string;
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  productId: string;
  productNameAr?: string;
  productNameEn?: string;
  unitPrice?: number;
  quantity: number;
  discountAmount?: number;
  shippingCost?: number;
  totalPrice: number;
  status: ReservationStatus;
  paymentMethod?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReservationTracking {
  trackingId: string;
  reservationId: string;
  referenceNumber: string;
  productNameAr: string;
  productNameEn?: string;
  quantity: number;
  totalPrice: number;
  governorate?: string;
  status: ReservationStatus;
  updatedAt: string;
}

export type HomepageSectionType =
  | 'hero'
  | 'featured_products'
  | 'latest_offers'
  | 'exclusive_products'
  | 'new_arrivals'
  | 'best_sellers'
  | 'categories'
  | 'brands'
  | 'advertisements'
  | 'announcements'
  | 'custom_banner'
  | 'contact_support';

export interface HomepageSection {
  id: string;
  sectionType: HomepageSectionType;
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl?: string;
  ctaTextAr?: string;
  ctaTextEn?: string;
  ctaLink?: string;
  selectedProductIds?: string[];
  selectedOfferIds?: string[];
  order: number;
  isEnabled: boolean;
  updatedAt: string;
}

export interface PaymentAccount {
  id: string;
  labelAr: string;
  labelEn: string;
  holderAr: string;
  holderEn: string;
  accountNumber: string;
  currencyOrTypeAr: string;
  currencyOrTypeEn: string;
  isActive: boolean;
}

export interface StoreSettings {
  id: string;
  storeNameAr: string;
  storeNameEn: string;
  sloganAr?: string;
  sloganEn?: string;
  locationAr: string;
  locationEn: string;
  phones: string[];
  announcementAr?: string;
  announcementEn?: string;
  showAnnouncement?: boolean;
  currencyCode: string;
  requireOnlinePayment?: boolean;
  enabledPaymentMethods?: string[];
  paymentAccounts?: PaymentAccount[];
  whatsappNumber?: string;
  whatsappIntegrationStatus?: 'ready_for_api' | 'connected' | 'disabled';
  updatedAt: string;
}

export interface AdminSettings {
  id: string;
  whatsappBusinessPhoneId?: string;
  whatsappWebhookVerifyToken?: string;
  whatsappAutoNotifyBookings?: boolean;
  lowStockThreshold: number;
  paymentGatewayProvider?: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientType: 'admin' | 'customer';
  recipientUid?: string;
  targetPhone?: string;
  type:
    | 'new_reservation'
    | 'reservation_cancelled'
    | 'reservation_updated'
    | 'low_stock'
    | 'offer_expiring'
    | 'new_customer'
    | 'invoice_issued'
    | 'back_in_stock'
    | 'price_drop'
    | 'new_course'
    | 'community_reply'
    | 'quiz_reminder'
    | 'reward_earned'
    | 'lab_approved'
    | 'badge_verified';
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  relatedId?: string;
  whatsappReady?: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summaryAr: string;
  summaryEn?: string;
  createdAt: string;
}

export interface StoreBackup {
  id: string;
  label: string;
  createdByUid: string;
  createdByEmail?: string;
  recordCounts?: Record<string, number>;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  text: string;
  channel: 'web' | 'whatsapp';
  createdAt: string;
  readByAgent: boolean;
}

export interface ChatSession {
  sessionId: string;
  customerName: string;
  customerPhone: string;
  customerUid?: string;
  channel: 'web' | 'whatsapp';
  status: 'open' | 'pending_whatsapp' | 'resolved';
  assignedAgent?: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface FavoriteItem {
  id: string;
  uid: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  brandName?: string;
  modelNumber?: string;
  retailPrice: number;
  imageUrl?: string;
  createdAt: string;
}

export type InvoicePaymentStatus = 'paid' | 'partial' | 'unpaid';

export type InvoiceSource =
  | 'auto_reservation'
  | 'manual_reservation'
  | 'manual_standalone';

export interface InvoiceItem {
  productId?: string;
  nameAr: string;
  nameEn: string;
  modelNumber?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  reservationId?: string;
  referenceNumber?: string;
  customerUid?: string;
  customerName: string;
  customerPhone: string;
  governorate?: string;
  address?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: InvoicePaymentStatus;
  paymentMethod: string;
  paymentMethodLabel?: string;
  notes?: string;
  issuedByUid: string;
  issuedByName?: string;
  source: InvoiceSource;
  isLocked: true;
  sentToCustomerAt?: string;
  issuedAt: string;
  updatedAt: string;
}

export interface InvoiceCounter {
  id: string;
  year: number;
  lastSequence: number;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  sourceLabel?: string;
}

export type ProjectPackageCategoryType =
  | 'internet_setup'
  | 'isp'
  | 'cctv'
  | 'wireless_link'
  | 'server_room'
  | 'smb';

export interface ProjectPackageItem {
  productId: string;
  quantity: number;
  optional?: boolean;
  roleAr?: string;
  roleEn?: string;
}

export interface ProjectPackage {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categoryType: ProjectPackageCategoryType;
  targetSubscribers?: string;
  coverageArea?: string;
  items: ProjectPackageItem[];
  packageDiscountPercent?: number;
  imageUrl?: string;
  isFeatured?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CommunityCategory =
  | 'mikrotik'
  | 'ubiquiti'
  | 'wireless'
  | 'fiber'
  | 'cctv'
  | 'servers'
  | 'general';

export interface CommunityPost {
  id: string;
  authorUid: string;
  authorName: string;
  authorSpecialty?: string;
  authorVerified?: boolean;
  category: CommunityCategory;
  title: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
  helpfulCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked?: boolean;
  status: 'active' | 'hidden';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorSpecialty?: string;
  content: string;
  isSolution: boolean;
  createdAt: string;
}

export interface CommunityReport {
  id: string;
  targetType: 'post' | 'comment' | 'lab_resource';
  targetId: string;
  postId?: string;
  reporterUid: string;
  reporterName: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export type AcademyTrack =
  | 'mikrotik'
  | 'ubiquiti'
  | 'fundamentals'
  | 'wireless'
  | 'fiber'
  | 'cctv'
  | 'servers_linux'
  | 'troubleshooting';

export type AcademyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface AcademyLesson {
  id: string;
  titleAr: string;
  titleEn: string;
  durationMinutes: number;
  videoUrl?: string;
  contentAr: string;
  contentEn?: string;
  order: number;
}

export interface AcademyQuizQuestion {
  id: string;
  questionAr: string;
  questionEn?: string;
  options: string[];
  correctIndex: number;
  explanationAr?: string;
}

export interface AcademyCourse {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  track: AcademyTrack;
  level: AcademyLevel;
  instructorUid?: string;
  instructorName: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  pointsReward: number;
  lessons: AcademyLesson[];
  quizQuestions: AcademyQuizQuestion[];
  passingScorePercent: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyEnrollment {
  id: string;
  uid: string;
  studentName: string;
  courseId: string;
  courseTitleAr: string;
  instructorUid?: string;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  lastLessonId?: string;
  progressPercent: number;
  quizAttempts: number;
  bestQuizScore: number;
  passedQuiz: boolean;
  certificateCode?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyCertificate {
  id: string;
  certificateCode: string;
  uid: string;
  studentName: string;
  courseId: string;
  courseTitleAr: string;
  courseTitleEn?: string;
  track: string;
  level: string;
  scorePercent: number;
  instructorName: string;
  isValid: boolean;
  issuedAt: string;
}

export interface EngineerProfile {
  uid: string;
  membershipId: string;
  fullName: string;
  photoUrl?: string;
  specialty: string;
  yearsExperience: number;
  skills: string[];
  certificates?: string[];
  projectsSummary?: string;
  governorate?: string;
  contactPhone?: string;
  contactEmail?: string;
  showInDirectory: boolean;
  isVerified: boolean;
  verificationBadge?: string;
  verificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface RewardEvent {
  id: string;
  titleAr: string;
  points: number;
  source: 'purchase' | 'academy' | 'redeem' | 'bonus';
  createdAt: string;
}

export interface UserRewards {
  uid: string;
  totalPoints: number;
  lifetimePoints: number;
  academyPoints: number;
  purchasePoints: number;
  badges: string[];
  redeemedOffers: string[];
  recentEvents: RewardEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RewardOffer {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  pointsCost: number;
  discountCode?: string;
  discountValueText: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type LabResourceType =
  | 'mikrotik_script'
  | 'config_file'
  | 'routeros_guide'
  | 'fault_solution'
  | 'manual'
  | 'tool_driver';

export interface LabResource {
  id: string;
  title: string;
  summary: string;
  resourceType: LabResourceType;
  category: string;
  deviceModels?: string;
  contentBody: string;
  downloadUrl?: string;
  authorUid: string;
  authorName: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewNote?: string;
  copyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryEntry {
  id: string;
  productId: string;
  productNameAr: string;
  productNameEn: string;
  brandName?: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changedByUid: string;
  changedAt: string;
}

export type AlertType =
  | 'back_in_stock'
  | 'price_drop'
  | 'new_course'
  | 'offers'
  | 'community';

export interface AlertSubscription {
  id: string;
  uid: string;
  alertType: AlertType;
  productId?: string;
  productNameAr?: string;
  targetPrice?: number;
  isActive: boolean;
  createdAt: string;
}




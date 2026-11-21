# ASEMA NETWORKS Security Specification

## 1. Data Invariants
1. **Admin Authority & Bootstrapped Owner**: Only `mrwanalhamd66@gmail.com` (verified email) or an explicitly promoted staff document in `/users/{uid}` with `role in ['super_admin', 'manager']` and `status == 'active'` may manage catalog, offers, packages, advertisements, homepage sections, store settings, lab moderation, community moderation, and customer reservations.
2. **Trainer Authority Scope**: Users with `role == 'trainer'` and `status == 'active'` may create and manage courses/lessons/quizzes in `/academy_courses`, review course enrollments for their courses, and update certificates, without gaining access to product wholesale pricing or financial invoicing.
3. **Self-Role Escalation Prevention**: A customer creating or updating their own `/users/{uid}` profile can never set `role` to `super_admin`, `manager`, or `trainer`, nor modify `permissions` or `status`. Only Super Admins can assign roles or permissions.
4. **Wholesale Price Isolation**: `wholesalePrice` and `supplierNotes` live in `/product_private/{productId}` and are strictly inaccessible to customers, trainers, and unauthenticated visitors.
5. **PII Isolation on Reservations & Engineer Directory**: Customer PII (`customerName`, `phone`, `address`, `notes`) in `/reservations/{reservationId}` can only be read by admins/managers or the owning authenticated customer (`customerUid == request.auth.uid`). Public tracking uses `/reservation_tracking/{referenceNumber_phone}` with `allow list: if false` and zero street address/name PII. Engineer profiles in `/engineer_profiles/{uid}` are only publicly readable/listable when the engineer explicitly opts in (`showInDirectory == true`); otherwise only the owner and staff may read them.
6. **Self-Verification & Points Forgery Prevention**: Engineers cannot self-set `isVerified == true`, non-empty `verificationBadge`, or `verificationStatus == 'approved'` in `/engineer_profiles/{uid}`; only staff may grant verification badges. Customers cannot arbitrarily inflate `purchasePoints` or mint >500 points per write on `/user_rewards/{uid}`.
7. **Strict Schema & Bounds**: Every string field has explicit `.size()` bounds; every array has explicit `.size()` bounds; all IDs match `^[a-zA-Z0-9_\-]+$`.
8. **Temporal & State Integrity**: Newly created reservations must start in `status == 'pending'`. User-submitted technical lab resources must start in `status == 'pending_review'` and are only publicly visible once `status == 'approved'` by staff.
9. **Wishlist / Favorites Ownership**: Documents under `/users/{uid}/favorites/{favoriteId}` are strictly owned by the authenticated verified user (`request.auth.uid == uid`) and disallow updates.
10. **Electronic Invoice Integrity & Immutability**: Invoices in `/invoices/{invoiceId}` may only be created by active staff (`super_admin` or `manager`), must be locked (`isLocked == true`) with a sequential `INV-YYYY-NNNN` number, and cannot have their line items, customer details, subtotal, discount, shipping, total amount, or `issuedAt` altered after issuance.

## 2. Adversarial Payloads ("Dirty Dozen+")
1. **Self-Admin Escalation**: Customer sends `{ uid, email, displayName, role: 'super_admin', permissions: ['all'], status: 'active' }` on `/users/{uid}` create -> MUST be denied.
2. **Shadow Field Injection on User Profile**: Customer updates `/users/{uid}` with `{ displayName: 'Ali', isVerified: true }` -> MUST be denied by `affectedKeys().hasOnly(...)`.
3. **Spoofed Unverified Admin Email**: Auth token with `email: 'mrwanalhamd66@gmail.com', email_verified: false` -> MUST be denied.
4. **Wholesale Price Read by Customer**: Authenticated customer attempts `get /product_private/prod_1` -> MUST be denied.
5. **Reservation List Scraping**: Unauthenticated user or customer attempts `list /reservations` -> MUST be denied.
6. **Tracking Collection Enumeration**: Attacker attempts `list /reservation_tracking` -> MUST be denied (`allow list: if false`).
7. **Status Shortcutting on Create**: Customer submits reservation with `status: 'confirmed'` -> MUST be denied.
8. **Oversized Payload / ID Poisoning**: Attacker writes `/products/aaaa...200chars` or 50KB description -> MUST be denied by `isValidId` and `.size()` checks.
9. **Unauthorized Product Creation**: Customer attempts `create /products/p_fake` -> MUST be denied.
10. **Cross-User Reservation Read**: Customer A attempts `get /reservations/res_customer_B` -> MUST be denied.
11. **Manager Modifying Super Admin Settings**: Manager attempts `write /admin_settings/main` -> MUST be denied.
12. **Customer Modifying Activity Logs**: Customer attempts `create /activity_logs/log_1` -> MUST be denied.
13. **Cross-User Wishlist Access / Spoofing**: Customer A attempts access on `/users/customer_B/favorites/prod_1` -> MUST be denied.
14. **Wishlist Shadow Field or Update Tampering**: Customer attempts to `update` `/users/{uid}/favorites/{favoriteId}` -> MUST be denied.
15. **Unauthorized Invoice Creation or Cross-Customer Read**: Customer attempts `create /invoices/inv_1` -> MUST be denied.
16. **Post-Issuance Invoice Amount Tampering**: Staff attempts to alter `totalAmount` on an existing `/invoices/{invoiceId}` -> MUST be denied.
17. **Engineer Self-Verification Spoof**: User writes `isVerified: true, verificationStatus: 'approved'` to `/engineer_profiles/{uid}` -> MUST be denied.
18. **Unapproved Lab Resource Publishing**: Non-staff user submits `/lab_resources/{id}` with `status: 'approved'` -> MUST be denied.
19. **Non-Opted-In Engineer Directory Scraping**: User tries to read `/engineer_profiles/{uid}` where `showInDirectory == false` -> MUST be denied.
20. **Community Post Author Spoofing / Force Pin**: User creates `/community_posts/{id}` with `authorUid != request.auth.uid` or `isPinned: true` -> MUST be denied.
21. **Orphan Comment Injection**: User attempts `create /community_posts/nonexistent/comments/c1` -> MUST be denied by `exists(...)` Master Gate.
22. **Trainer Accessing Wholesale or Invoices**: Trainer attempts `get /product_private/prod_1` or `create /invoices/inv_9` -> MUST be denied.

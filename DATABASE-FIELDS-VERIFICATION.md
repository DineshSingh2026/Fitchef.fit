# Database fields & sections verification

This document confirms that **all application fields and sections are stored in the database** and where any gaps or optional columns exist.

---

## 1. Site users (`site_users`)

| Source | Fields | Stored? |
|--------|--------|--------|
| **Signup** | email, password_hash, full_name, phone, city, status | ✅ `User.create()` → INSERT |
| **ensureDb** | phone, city, status (columns added) | ✅ Schema |
| **User profile (init-user-dashboard)** | gender, date_of_birth, address_line1, address_line2, state, pincode, delivery_instructions, height, weight, target_weight, fitness_goal, dietary_preference, allergies, protein_target, updated_at | ✅ Schema + `User.updateProfile()` writes all |
| **Profile GET** | All profile columns | ✅ `User.getProfileById()` |
| **Pending signups (admin)** | status → approved/rejected | ✅ `User.updateStatus()` |

**Verdict:** All user and profile data is stored. Signup and profile update use the same columns as the schema.

---

## 2. User orders (`user_orders`)

| Field | Set when | Stored? |
|-------|----------|--------|
| user_id, total_amount, status, payment_status, created_at | Order create | ✅ |
| requested_delivery_date | Order create (user picks date) | ✅ `ensureDb` column + INSERT in `user/ordersController.js` |
| chef_id, admin_approved, delivery_address, delivery_instructions, completed_at | Admin confirm / assign chef | ✅ From user profile on confirm |
| assigned_agent_id | Logistics assign agent | ✅ |
| delivery_time_slot, kitchen_location | Schema only | ⚠️ Columns exist; not set by current UI (optional for future use) |
| dispatch_time, delivered_time | Logistics “Out for delivery” / “Delivered” | ✅ |

**Verdict:** All critical order fields are stored. `delivery_time_slot` and `kitchen_location` exist in DB but are not set by the current app (reserved for future use).

---

## 3. User order items (`user_order_items`)

| Field | Stored? |
|-------|--------|
| order_id, dish_id, quantity, price | ✅ On order create |

**Verdict:** All item data is stored.

---

## 4. Consultations (`consultations`)

| Field | Stored? |
|-------|--------|
| full_name, email, phone, city, delivery_frequency, goals (array), age, gender, height, weight, activity_level, diet_type, allergies, spice_preference, start_timeline, created_at | ✅ `consultationModel.create()` – all fields mapped |

**Verdict:** All consultation form fields are stored in `consultations`.

---

## 5. Dishes (`dishes`)

| Field | Stored? |
|-------|--------|
| name, description, category, tags, image_url, calories, protein, carbs, fats, fiber, sugar, sodium, ingredients, allergens, benefits, base_price, discount_price, portion_size, subscription_eligible, available, featured, chef_id, created_at, updated_at | ✅ Admin dish create/update use `buildDishFromBody()` and INSERT/UPDATE all these |

**Verdict:** All dish fields are stored.

---

## 6. User feedback (`user_feedback`)

| Field | Stored? |
|-------|--------|
| user_id, order_id, overall_rating, food_rating, delivery_rating, recommend, comments, created_at | ✅ `feedbackController.create()` INSERT |

**Verdict:** All feedback fields are stored.

---

## 7. User support tickets (`user_support_tickets`)

| Field | Stored? |
|-------|--------|
| user_id, subject, message, priority, status | ✅ `supportController.create()` |
| attachment_url | ⚠️ Column exists; not set by current API (optional) |

**Verdict:** Core ticket data is stored. `attachment_url` is available for future use.

---

## 8. User notifications (`user_notifications`)

| Field | Stored? |
|-------|--------|
| user_id, order_id, message, read_at, created_at | ✅ Inserted by admin/chef/logistics; `read_at` set by `notificationsController.markRead()` |

**Verdict:** All notification data is stored.

---

## 9. Order notifications (`order_notifications`)

| Field | Stored? |
|-------|--------|
| user_id, admin_id, order_id, message, read_status, created_at | ✅ Inserted when chef marks ready and when logistics dispatches/delivers |

**Verdict:** All fields used and stored.

---

## 10. Early access (`early_access`)

| Field | Stored? |
|-------|--------|
| email, created_at | ✅ `earlyAccessModel.createEarlyAccess()` |

**Verdict:** Stored. Synced to `admin_leads` and `admin_customers` for admin dashboard.

---

## 11. Admin tables

| Table | Purpose | Stored? |
|-------|---------|--------|
| **admin_users** | Admin login | ✅ Seeded by ensureDb |
| **admin_customers** | Customers (early access, consultation, manual) | ✅ earlyAccess, consultation, admin CRUD |
| **admin_leads** | Leads (early access, consultation, manual) | ✅ Same sources + admin CRUD |
| **admin_chefs** | Chef directory (admin side) | ✅ Admin CRUD |
| **admin_orders** | Admin-created orders (separate from user_orders) | ✅ Admin create/update |
| **admin_deliveries** | Deliveries for admin_orders | ✅ Admin CRUD |
| **admin_payments** | Payments for admin_orders | ✅ Finance controller |

**Verdict:** All admin section data is stored. Note: **user_orders** (user dashboard flow) is separate from **admin_orders**; logistics in the main app use `user_orders` + `delivery_agents`.

---

## 12. Chefs & logistics (login tables)

| Table | Stored? |
|-------|--------|
| **chefs** | ✅ Seeded; used for chef login and assignment to user_orders |
| **logistics_users** | ✅ Seeded; used for logistics login |
| **delivery_agents** | ✅ Seeded; listed by logistics for assignment. No admin CRUD in code (add/edit would require new routes). |

**Verdict:** All data is stored. Delivery agents are read-only from the app; management would need new endpoints.

---

## 13. Payment status on user orders

| Field | Notes |
|-------|--------|
| user_orders.payment_status | Set to `'pending'` on order create. No UPDATE found in code; remains pending unless you add a payment flow. |

**Verdict:** Stored; not updated by current flow. Safe to add a payment webhook or admin action later.

---

## Summary

- **User:** Signup, profile, orders (with `requested_delivery_date`), order items, feedback, support tickets, notifications – all stored.
- **Admin:** Open orders (user_orders), confirm/assign chef, delivery address/instructions from profile, orders list, logistics list (user_orders with delivery date), dishes, consultations, pending signups, leads, customers, chefs, finance (admin_orders/payments) – all stored.
- **Chef:** Orders (with `requested_delivery_date`), mark ready – stored.
- **Logistics:** Orders (with `requested_delivery_date`), assign agent, dispatch, delivered – stored.

**Optional / future:**  
`user_orders.delivery_time_slot`, `user_orders.kitchen_location`, `user_support_tickets.attachment_url` exist in the schema but are not set by the current UI.  
`delivery_agents` have no create/update API (seed-only).  
`user_orders.payment_status` is never updated (remains `pending`).

No application form or section was found that sends data **without** a corresponding database column; the integration is consistent.

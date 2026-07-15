# Trust-First Checkout & Project Setup: Product Requirement Document (PRD)

## 1. Purpose & Goals

Replace the existing fixed-price cart checkout with a **trust-first, requirements-driven purchase flow**:

1. Customer selects a base package.
2. Customer adds optional add-ons.
3. Customer submits project requirements through a **package-aware form**.
4. System creates an order and immediately presents a payment method.
5. After successful payment, admin fulfills the order based on the submitted requirements.

Business goals:
- Increase conversion by building trust before payment.
- Reduce scope ambiguity by collecting requirements upfront.
- Allow dynamic pricing based on actual needs, not fixed catalog items.

---

## 2. User Flow

### 2.1 Public Customer Flow

1. **Browse Packages** (`/shop` or `/products`)
   - View base packages: Landing Page, Company Profile, Business Website, E-Commerce, Restaurant, Retail POS, Custom.
   - Toggle optional add-ons: AI Copywriter, Booking Calendar, CRM, Developer Webhooks.
   - See live calculated total.

2. **Start Project** (`/project-setup?package=<key>`)
   - Pre-selected package from previous step.
   - Add-ons selected previously carry forward when possible.
   - Package-specific requirements form:
     - Landing Page → design preferences, timeline
     - E-Commerce → product count, payment gateways, shipping needs
     - Restaurant → menu items, table count, kitchen display needs
     - etc.
   - Contact email and project description are always required.
   - Validation: at minimum, contact email and package selection are mandatory.

3. **Submit & Pay**
   - Customer clicks **Continue to Payment**.
   - Server creates `tenant_order` with status `pending`.
   - Order `notes` stores:
     ```json
     {
       "packageKey": "ecommerce",
       "packageName": "E-Commerce Platform",
       "addons": [{"key":"ai","name":"AI Copywriter Suite","price":250000}],
       "requirements": {
         "companyName": "PT Contoh",
         "contactEmail": "customer@example.com",
         "productCount": "100-500",
         "paymentGateways": "Xendit, Midtrans"
       },
       "source": "project_setup"
     }
     ```
   - Customer is redirected to the selected payment gateway (Xendit / Midtrans / DOKU) based on tenant configuration.
   - Upon successful payment, order status becomes `paid`.

4. **Confirmation** (`/orders/<orderId>`)
   - Shows order summary: package, add-ons, requirements snapshot, total paid.
   - Displays next steps: "Our team will review your requirements and contact you within 24 hours."
   - Shows receipt / payment reference if available.

### 2.2 Admin Flow

1. **Order List** (`/admin/orders`)
   - Filter by status: `pending`, `paid`, `pending_fulfillment`, etc.
   - For `paid` orders, admin sees the full requirements snapshot.

2. **Fulfillment**
   - Admin reviews requirements.
   - Updates order status to `pending_fulfillment` when work begins.
   - Updates to `completed` when delivered.

---

## 3. Functional Requirements

### FR-8.1 Package-Aware Dynamic Form
- Form fields must adapt to the selected package.
- Irrelevant fields must not be shown (e.g., restaurant fields must not appear for Landing Page).
- Each package defines its own `requirementsFields` array.

### FR-8.2 Live Price Calculation
- Base package price + sum of selected add-on prices = total.
- Total updates instantly when package or add-ons change.
- Display currency: IDR by default, configurable per tenant.

### FR-8.3 Order Creation
- `POST /api/project-setup` creates a `tenant_order`.
- Required payload:
  - `tenantId` (string, UUID)
  - `packageKey` (string)
  - `addons` (string[])
  - `total` (number)
  - `currency` (string, default `IDR`)
  - `requirements` (object with dynamic keys)
- Response:
  - `201 Created`: `{ success: true, orderId: "<uuid>" }`
  - `400 Bad Request`: validation error
  - `500 Internal Server Error`: server error

### FR-8.4 Payment Integration
- After order creation, tenant selects payment method.
- Payment flow uses existing `tenant_payments` and configured gateway settings (`xendit_enabled`, `midtrans_enabled`, `doku_enabled`).
- On successful payment, order status transitions to `paid`.

### FR-8.5 Admin Visibility
- Admin dashboard shows project-setup orders with full requirements in the order notes.
- Admin can filter orders by `source: project_setup`.

---

## 4. Database Changes

### 4.1 Order Status Enum

Add new values to `OrderStatus` enum:

```prisma
enum OrderStatus {
  pending_requirements   // reserved for future quote-confirmation flow
  quoted                 // reserved for future quote-confirmation flow
  awaiting_payment       // reserved for future quote-confirmation flow
  pending
  paid
  pending_fulfillment
  processing
  shipped
  completed
  cancelled
}
```

Migration: `ALTER TYPE orderstatus ADD VALUE 'pending_requirements';` etc.

### 4.2 Order Notes Schema

`tenant_order.notes` JSON now supports:

```json
{
  "source": "project_setup",
  "packageKey": "ecommerce",
  "packageName": "E-Commerce Platform",
  "addons": [...],
  "requirements": {
    "companyName": "...",
    "contactEmail": "...",
    "productCount": "...",
    "paymentGateways": "..."
  }
}
```

No new tables required. Existing `tenant_orders` and `tenant_order_items` are sufficient.

---

## 5. API Specification

### 5.1 Create Project Order

**Endpoint:** `POST /api/project-setup`

**Request:**
```json
{
  "tenantId": "uuid",
  "packageKey": "ecommerce",
  "addons": ["ai", "booking"],
  "total": 16250000,
  "currency": "IDR",
  "requirements": {
    "companyName": "PT Contoh",
    "contactEmail": "customer@example.com",
    "productCount": "100-500",
    "paymentGateways": "Xendit, Midtrans"
  }
}
```

**Response `201`:**
```json
{
  "success": true,
  "orderId": "uuid"
}
```

**Response `400`:**
```json
{
  "success": false,
  "error": "Valid contact email is required"
}
```

---

## 6. UI/UX Requirements

### 6.1 `/project-setup` Page

- **Header:** "Start Your Project" + subtitle.
- **Layout:** Two-column on desktop:
  - Left: Package selector + Add-ons toggles.
  - Right: Dynamic requirements form + sticky price summary.
- **Package Selector:** List of all packages with name, description, price. Selected state highlighted.
- **Add-ons Toggles:** Checkbox-style cards with name, description, price.
- **Requirements Form:**
  - Fields change based on selected package.
  - Always include: Contact Email, Company/Personal Name.
  - Package-specific fields from `requirementFieldLabels`.
- **Price Summary Bar:**
  - Selected package name + price.
  - Number of add-ons selected.
  - Total price in large bold text.
  - **Continue to Payment** CTA button.
- **Validation:** Inline error messages. Button disabled until valid.

### 6.2 `/orders/[id]` Confirmation Page

- Order ID + status badge.
- Package breakdown.
- Add-ons list with prices.
- Requirements snapshot.
- Total paid.
- Next steps message.

### 6.3 `/shop` Page Adjustments

- Package cards **CTA button** must link to `/project-setup?package=<key>` instead of `/checkout`.
- Add-ons cards **CTA link** must also link to `/project-setup?package=<key>`.

---

## 7. Technical Implementation Notes

### 7.1 Shared Definitions

Create `lib/constants/packages.ts`:
- `packages`: Record of package keys → name, price, description, `requirementsFields[]`.
- `addonsList`: Array of add-on definitions.
- `requirementFieldLabels`: Map of field key → label, placeholder, input type.

### 7.2 Server Actions / API

- Create `app/api/project-setup/route.ts`:
  - Validates payload.
  - Looks up tenant by `tenantId`.
  - Creates `tenant_order` with `orderStatus: 'pending'` and requirements in `notes`.
  - Returns `orderId`.
- Payment initiation uses existing `lib/actions/payments.ts` after order creation.

### 7.3 Client Component

- `app/[locale]/project-setup/project-setup-client.tsx`:
  - Reads `package` query param.
  - Renders package selector, add-ons, dynamic form.
  - Validates and calls `/api/project-setup`.
  - Redirects to `/orders/<orderId>` on success.

### 7.4 Admin Integration

- Admin order list should display `source: project_setup` orders with expanded requirements view.
- No new admin pages required for MVP; existing order management suffices.

---

## 8. Acceptance Criteria

- [ ] Customer can select a package and see live total update when add-ons are toggled.
- [ ] Requirements form shows only fields relevant to the selected package.
- [ ] Validation fails gracefully with inline errors when required fields are missing.
- [ ] `POST /api/project-setup` returns `201` with a valid `orderId` for valid payload.
- [ ] `tenant_order` is created with `orderStatus = 'pending'` and requirements stored in `notes`.
- [ ] Customer is redirected to payment gateway after order creation.
- [ ] After payment, order status becomes `paid`.
- [ ] Confirmation page shows accurate order summary and requirements snapshot.
- [ ] Admin can view project-setup orders with full requirements in the order notes.
- [ ] `/shop` and `/products` package/add-on CTAs link to `/project-setup?package=<key>`.

---

## 9. Out of Scope (Phase 2)

- Automated quote generation with price negotiation.
- `pending_requirements`, `quoted`, `awaiting_payment` status flows.
- Saved project drafts for returning customers.
- Multi-currency support beyond IDR.
- Admin quote editor with custom pricing overrides.

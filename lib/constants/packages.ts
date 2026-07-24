export interface Addon {
  key: string
  name: string
  /** One-time implementation price in IDR. */
  price: number
  desc: string
  priceNote?: string
}

export interface PackageOption {
  key: string
  name: string
  price: number
  desc: string
  includedCapabilities: string[]
  requirementsFields: string[]
}

export const packages: Record<string, PackageOption> = {
  landing_page: {
    key: 'landing_page',
    name: 'Launch Website',
    price: 3500000,
    desc: 'One-time conversion-focused website deployment',
    includedCapabilities: ['Responsive landing page', 'Contact form', 'Basic SEO setup', 'Content management access'],
    requirementsFields: ['companyName', 'contactEmail', 'projectDescription', 'timeline', 'designPreferences'],
  },
  company_profile: {
    key: 'company_profile',
    name: 'Company Profile',
    price: 6000000,
    desc: 'One-time professional corporate web presence',
    includedCapabilities: ['Multi-page company website', 'Content management system', 'Contact form integration', 'SEO-ready page structure'],
    requirementsFields: ['companyName', 'contactEmail', 'companyInfo', 'teamSize', 'pagesNeeded', 'brandAssets', 'timeline'],
  },
  business_website: {
    key: 'business_website',
    name: 'Business Website + Admin',
    price: 12000000,
    desc: 'One-time business website and admin workspace deployment',
    includedCapabilities: ['Company website and content management', 'Admin dashboard', 'User access and role controls', 'Analytics and notifications'],
    requirementsFields: ['companyName', 'contactEmail', 'projectDescription', 'adminUsers', 'contentTypes', 'integrations', 'timeline'],
  },
  ecommerce: {
    key: 'ecommerce',
    name: 'E-Commerce Platform',
    price: 22000000,
    desc: 'One-time commerce platform deployment with storefront and payments',
    includedCapabilities: ['Business website and admin workspace', 'Product catalog and storefront', 'Checkout and payment gateway setup', 'Orders and inventory management'],
    requirementsFields: ['companyName', 'contactEmail', 'productCount', 'paymentGateways', 'shippingNeeds', 'inventorySystem', 'timeline'],
  },
  restaurant: {
    key: 'restaurant',
    name: 'Restaurant System',
    price: 28000000,
    desc: 'One-time restaurant system deployment for menus, bookings, and operations',
    includedCapabilities: ['Restaurant website and admin workspace', 'Menu catalog', 'Booking and scheduling', 'Staff access and operational analytics'],
    requirementsFields: ['companyName', 'contactEmail', 'menuItems', 'tableCount', 'reservationNeeds', 'kitchenDisplay', 'timeline'],
  },
  retail_pos: {
    key: 'retail_pos',
    name: 'Retail POS + Website',
    price: 35000000,
    desc: 'One-time online store and browser POS deployment',
    includedCapabilities: ['E-commerce storefront and checkout', 'Browser-based POS terminal', 'Payment gateway setup', 'Inventory tracking and synchronization'],
    requirementsFields: ['companyName', 'contactEmail', 'storeLocations', 'productTypes', 'paymentMethods', 'staffCount', 'timeline'],
  },
  custom: {
    key: 'custom',
    name: 'Custom Platform',
    price: 45000000,
    desc: 'Starting price for a bespoke self-hosted business platform',
    includedCapabilities: ['Website, admin, commerce, POS, and inventory modules', 'CRM and booking modules', 'AI assistant integration', 'Analytics, notifications, and developer API portal'],
    requirementsFields: ['companyName', 'contactEmail', 'detailedRequirements', 'budget', 'timeline'],
  },
}

export const addonsList: Addon[] = [
  { key: 'ai', name: 'AI Copywriter Integration (BYOK)', price: 1500000, desc: 'Bring your own provider API key. No DagangOS AI markup or lock-in.' },
  { key: 'booking', name: 'Booking & Scheduling Module', price: 3000000, desc: 'Appointments, reservations, and operational scheduling.' },
  { key: 'crm', name: 'CRM & Customer Timeline', price: 3500000, desc: 'Customer history, relationship management, and follow-up context.' },
  { key: 'api', name: 'Developer API & Webhook Portal', price: 4000000, desc: 'Developer keys and controlled external-system integration.' },
  { key: 'whatsapp', name: 'WhatsApp Business Integration', price: 1500000, desc: 'Tenant-owned Meta WhatsApp Business integration and templates.' },
  { key: 'payment_gateway', name: 'Payment Gateway Setup', price: 1000000, desc: 'Setup and verification for one payment gateway.', priceNote: 'per gateway' },
  { key: 'data_migration', name: 'Initial Product/Data Migration', price: 1000000, desc: 'Structured import and validation of the first product batch.', priceNote: 'per 100 products' },
  { key: 'admin_workflow', name: 'Extra Admin/User Workflow', price: 1500000, desc: 'One additional approval, staff, or operational workflow.' },
  { key: 'custom_report', name: 'Custom Report/Dashboard', price: 2500000, desc: 'A tailored operational report or dashboard.', priceNote: 'starting at' },
]

export const addonModuleMap: Record<string, string> = {
  ai: 'ai_module',
  booking: 'booking_module',
  crm: 'crm_module',
  api: 'api_module',
  whatsapp: 'whatsapp_module',
}

export const packageModuleMap: Record<string, string[]> = {
  landing_page: ['website_module', 'admin_module', 'user_management', 'rbac_module'],
  company_profile: ['website_module', 'admin_module', 'user_management', 'rbac_module'],
  business_website: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'notification_module', 'analytics_module'],
  ecommerce: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'inventory_module', 'notification_module', 'analytics_module'],
  restaurant: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'booking_module', 'notification_module', 'analytics_module'],
  retail_pos: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module', 'inventory_module', 'notification_module', 'analytics_module'],
  custom: ['website_module', 'admin_module', 'user_management', 'rbac_module', 'catalog_module', 'ecommerce_module', 'payment_module', 'pos_module', 'inventory_module', 'crm_module', 'booking_module', 'ai_module', 'notification_module', 'analytics_module', 'api_module'],
}

/**
 * Implementation services that are explicitly covered by a package even
 * though they do not map one-to-one to a provisioned platform module.
 */
const packageIncludedServiceAddons: Record<string, string[]> = {
  ecommerce: ['payment_gateway'],
  retail_pos: ['payment_gateway'],
  custom: ['payment_gateway'],
}

export function getIncludedAddonKeys(packageKey: string): string[] {
  const includedModules = new Set(packageModuleMap[packageKey] || [])
  const includedServices = new Set(packageIncludedServiceAddons[packageKey] || [])

  return addonsList
    .filter(addon => includedServices.has(addon.key) || includedModules.has(addonModuleMap[addon.key]))
    .map(addon => addon.key)
}

export function getBillableAddonKeys(packageKey: string, addonKeys: string[]): string[] {
  const included = new Set(getIncludedAddonKeys(packageKey))
  return Array.from(new Set(addonKeys)).filter(key => !included.has(key))
}

export const requirementFieldLabels: Record<string, { label: string; placeholder?: string; type?: string }> = {
  companyName: { label: 'Company / Personal Name', placeholder: 'Your name or business name' },
  contactEmail: { label: 'Contact Email', placeholder: 'email@domain.com', type: 'email' },
  projectDescription: { label: 'Project Description', placeholder: 'Describe what you want to build...' },
  timeline: { label: 'Expected Timeline', placeholder: 'e.g. 2 weeks, 1 month' },
  designPreferences: { label: 'Design Preferences', placeholder: 'Colors, style, references...' },
  companyInfo: { label: 'Company Info', placeholder: 'Industry, size, location...' },
  teamSize: { label: 'Team Size', placeholder: 'e.g. 5-10 people' },
  pagesNeeded: { label: 'Estimated Pages Needed', placeholder: 'e.g. 10-15 pages' },
  brandAssets: { label: 'Brand Assets', placeholder: 'Logo, colors, guidelines...' },
  adminUsers: { label: 'Admin Users Needed', placeholder: 'e.g. 3 users' },
  contentTypes: { label: 'Content Types', placeholder: 'Blog, products, media...' },
  integrations: { label: 'Integrations Needed', placeholder: 'CRM, ERP, analytics...' },
  productCount: { label: 'Estimated Product Count', placeholder: 'e.g. 100-500 products' },
  paymentGateways: { label: 'Payment Gateways', placeholder: 'Xendit, Midtrans, DOKU...' },
  shippingNeeds: { label: 'Shipping Needs', placeholder: 'Local, international, courier...' },
  inventorySystem: { label: 'Inventory System', placeholder: 'Stock tracking, alerts...' },
  menuItems: { label: 'Estimated Menu Items', placeholder: 'e.g. 50-100 dishes' },
  tableCount: { label: 'Table Count', placeholder: 'e.g. 20 tables' },
  reservationNeeds: { label: 'Reservation Needs', placeholder: 'Online booking, walk-ins...' },
  kitchenDisplay: { label: 'Kitchen Display System', placeholder: 'Order routing, printer setup...' },
  storeLocations: { label: 'Store Locations', placeholder: 'How many branches?' },
  productTypes: { label: 'Product Types', placeholder: 'FMCG, electronics, fashion...' },
  paymentMethods: { label: 'Payment Methods', placeholder: 'Cash, card, e-wallet...' },
  staffCount: { label: 'Staff Count', placeholder: 'Cashiers, admins...' },
  detailedRequirements: { label: 'Detailed Requirements', placeholder: 'Describe all features, workflows, and business rules...' },
  budget: { label: 'Budget Range', placeholder: 'e.g. Rp 20-30 juta' },
}

export interface Addon {
  key: string
  name: string
  price: number
  desc: string
}

export interface PackageOption {
  key: string
  name: string
  price: number
  desc: string
  requirementsFields: string[]
}

export const packages: Record<string, PackageOption> = {
  landing_page: {
    key: 'landing_page',
    name: 'Landing Page',
    price: 2500000,
    desc: 'Single-page highly optimized for conversions',
    requirementsFields: ['companyName', 'contactEmail', 'projectDescription', 'timeline', 'designPreferences'],
  },
  company_profile: {
    key: 'company_profile',
    name: 'Company Profile',
    price: 4000000,
    desc: 'Professional corporate presence with dynamic pages',
    requirementsFields: ['companyName', 'contactEmail', 'companyInfo', 'teamSize', 'pagesNeeded', 'brandAssets', 'timeline'],
  },
  business_website: {
    key: 'business_website',
    name: 'Business Website + Admin',
    price: 8000000,
    desc: 'Full CMS with secure tenant dashboard',
    requirementsFields: ['companyName', 'contactEmail', 'projectDescription', 'adminUsers', 'contentTypes', 'integrations', 'timeline'],
  },
  ecommerce: {
    key: 'ecommerce',
    name: 'E-Commerce Platform',
    price: 15000000,
    desc: 'Complete storefront with cart and payment gateways',
    requirementsFields: ['companyName', 'contactEmail', 'productCount', 'paymentGateways', 'shippingNeeds', 'inventorySystem', 'timeline'],
  },
  restaurant: {
    key: 'restaurant',
    name: 'Restaurant System',
    price: 20000000,
    desc: 'Menu, tables, booking calendar, and staff queues',
    requirementsFields: ['companyName', 'contactEmail', 'menuItems', 'tableCount', 'reservationNeeds', 'kitchenDisplay', 'timeline'],
  },
  retail_pos: {
    key: 'retail_pos',
    name: 'Retail POS + Website',
    price: 25000000,
    desc: 'Unified online store and offline retail browser POS',
    requirementsFields: ['companyName', 'contactEmail', 'storeLocations', 'productTypes', 'paymentMethods', 'staffCount', 'timeline'],
  },
  custom: {
    key: 'custom',
    name: 'Custom Platform',
    price: 30000000,
    desc: 'Enterprise bespoke solutions',
    requirementsFields: ['companyName', 'contactEmail', 'detailedRequirements', 'budget', 'timeline'],
  },
}

export const addonsList: Addon[] = [
  { key: 'ai', name: 'AI Copywriter Suite', price: 250000, desc: 'LLM generated descriptions' },
  { key: 'booking', name: 'Booking Calendar Scheduler', price: 500000, desc: 'Appointments & rosters' },
  { key: 'crm', name: 'CRM & Customer Timelines', price: 400000, desc: 'Spend tracking log' },
  { key: 'api', name: 'Developer Webhooks Portal', price: 750000, desc: 'External sync keys' },
]

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

'use client'

import { useState } from 'react'
import { Settings, Globe, Palette, Shield, CreditCard, Building2, Save, Loader2, MessageSquare, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { saveAdminWebsiteConfig, saveTenantLogo, saveAiConfig } from '@/lib/actions/website'

export function SettingsClient({ initialWebsite, initialTenant, initialAiConfig, tenantId }: { initialWebsite: any, initialTenant: any, initialAiConfig?: any, tenantId: string }) {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'billing' | 'ai'>('general')
  const [logoPreview, setLogoPreview] = useState<string | null>(initialTenant?.logoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  
  const [websiteData, setWebsiteData] = useState({
    siteTitle: initialWebsite?.siteTitle || 'Website',
    isActive: initialWebsite?.isActive ?? true,
    themeConfig: initialWebsite?.themeConfig || {
      colors: { primary: '#4f46e5', secondary: '#10b981' },
      typography: { base_font: 'Inter' },
      baseCurrency: 'USD'
    },
    globalSeoMetadata: initialWebsite?.globalSeoMetadata || { description: '' }
  })

  const [aiData, setAiData] = useState({
    providerKey: initialAiConfig?.providerKey || 'platform_managed',
    apiSecret: '', // Don't show existing secret, only allow override
    selectedModelName: initialAiConfig?.selectedModelName || 'gpt-4o-mini'
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    const res = await saveAdminWebsiteConfig(tenantId, websiteData)
    
    let aiRes = { success: true, error: '' }
    if (activeTab === 'ai') {
      aiRes = await saveAiConfig(tenantId, aiData)
    }

    setIsSaving(false)

    if (res.success && aiRes.success) {
      toast.success('Settings saved successfully')
    } else {
      toast.error(res.error || aiRes.error || 'Failed to save settings')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('Logo file size must be less than 2MB')
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
      
      setIsUploading(true)
      const res = await saveTenantLogo(tenantId, base64)
      setIsUploading(false)

      if (res.success) {
        toast.success('Company logo uploaded successfully!')
      } else {
        toast.error('Failed to save logo in database')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleLogoRemove = async () => {
    setLogoPreview(null)
    setIsUploading(true)
    const res = await saveTenantLogo(tenantId, "")
    setIsUploading(false)

    if (res.success) {
      toast.success('Company logo removed successfully!')
    } else {
      toast.error('Failed to remove logo in database')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Workspace Settings</h2>
          <p className="section-desc">Manage tenant configuration, branding, and billing</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          {[
            { id: 'general', label: 'General', icon: Building2 },
            { id: 'theme', label: 'Brand & Theme', icon: Palette },
            { id: 'ai', label: 'AI & Automations', icon: Bot },
            { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              <tab.icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400')} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" /> Organization Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Company Name</label>
                    <input type="text" className="form-input" defaultValue={initialTenant?.companyName || ''} readOnly />
                    <p className="text-xs text-slate-400 mt-1">Managed via global admin.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" /> Domain Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Platform Subdomain</label>
                    <div className="flex">
                      <input type="text" className="form-input rounded-r-none border-r-0 bg-slate-50 text-slate-500 font-mono" defaultValue={initialTenant?.subdomain || ''} disabled />
                      <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-r-lg text-sm text-slate-500 font-mono">.{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'store.dagangos.com'}</div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Contact support to change your base subdomain.</p>
                  </div>
                  <div className="divider text-xs text-slate-400">OR</div>
                  <div>
                    <label className="form-label">Custom Domain</label>
                    <input type="text" className="form-input" defaultValue={initialTenant?.customDomain || ''} placeholder="e.g. www.yourcompany.com" readOnly />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" /> Regional & Payment Gateway
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Base Currency</label>
                    <select 
                      className="form-select max-w-sm"
                      value={websiteData.themeConfig.baseCurrency || 'USD'}
                      onChange={(e) => setWebsiteData({
                        ...websiteData,
                        themeConfig: { ...websiteData.themeConfig, baseCurrency: e.target.value }
                      })}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="IDR">IDR (Rp)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SGD">SGD (S$)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Default currency used across the catalog and checkout.</p>
                  </div>
                  <div>
                    <label className="form-label">Active Payment Gateway</label>
                    <select 
                      className="form-select max-w-sm"
                      value={websiteData.themeConfig.paymentGateway || 'mock'}
                      onChange={(e) => setWebsiteData({
                        ...websiteData,
                        themeConfig: { ...websiteData.themeConfig, paymentGateway: e.target.value }
                      })}
                    >
                      <option value="mock">Development Sandbox</option>
                      <option value="xendit">Xendit</option>
                      <option value="midtrans">Midtrans</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Select the payment processor for checkout. You must configure API keys for real providers.</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" /> WhatsApp API Integration (PA Handoff)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">PA WhatsApp Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 628999155182 (Include country code, no +)"
                      value={websiteData.themeConfig.whatsappPaNumber || ''}
                      onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, whatsappPaNumber: e.target.value }})}
                    />
                    <p className="text-xs text-slate-400 mt-1">Number to receive contact form submissions and AI escalations.</p>
                  </div>
                  <div>
                    <label className="form-label">Phone Number ID</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 1234567890"
                      value={websiteData.themeConfig.whatsappPhoneId || ''}
                      onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, whatsappPhoneId: e.target.value }})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Access Token</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="EAAL..."
                      value={websiteData.themeConfig.whatsappToken || ''}
                      onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, whatsappToken: e.target.value }})}
                    />
                  </div>
                  <div>
                    <label className="form-label">Template Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. dagangos_peringatan_dukungan"
                      value={websiteData.themeConfig.whatsappTemplate || ''}
                      onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, whatsappTemplate: e.target.value }})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-400" /> Visual Identity
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Company Logo (PNG/JPG)</label>
                    <div className="flex items-center gap-4 mt-2">
                      {logoPreview ? (
                        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1.5 overflow-hidden">
                          <img src={logoPreview} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 text-center p-1">
                          No Logo
                        </div>
                      )}
                      <div>
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg" 
                          onChange={handleLogoUpload} 
                          id="logo-file-upload" 
                          className="hidden" 
                        />
                        <div className="flex items-center gap-2">
                          <label 
                            htmlFor="logo-file-upload" 
                            className="btn btn-secondary text-xs cursor-pointer py-1.5 px-3 block w-fit"
                          >
                            {isUploading ? 'Uploading...' : 'Choose File'}
                          </label>
                          {logoPreview && (
                            <button
                              type="button"
                              onClick={handleLogoRemove}
                              className="btn btn-secondary text-xs py-1.5 px-3 text-red-600 hover:text-red-750"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Max file size: 2MB. Supports PNG, JPG, JPEG.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Site Title (SEO)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={websiteData.siteTitle} 
                      onChange={(e) => setWebsiteData({ ...websiteData, siteTitle: e.target.value })} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Primary Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-0.5 bg-white" 
                          value={websiteData.themeConfig.colors?.primary || '#000000'}
                          onChange={(e) => setWebsiteData({ 
                            ...websiteData, 
                            themeConfig: { ...websiteData.themeConfig, colors: { ...websiteData.themeConfig.colors, primary: e.target.value } } 
                          })}
                        />
                        <input 
                          type="text" 
                          className="form-input flex-1 font-mono uppercase" 
                          value={websiteData.themeConfig.colors?.primary || '#000000'}
                          onChange={(e) => setWebsiteData({ 
                            ...websiteData, 
                            themeConfig: { ...websiteData.themeConfig, colors: { ...websiteData.themeConfig.colors, primary: e.target.value } } 
                          })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Global SEO Description</label>
                    <textarea 
                      className="form-textarea" 
                      value={websiteData.globalSeoMetadata.description || ''} 
                      onChange={(e) => setWebsiteData({ ...websiteData, globalSeoMetadata: { ...websiteData.globalSeoMetadata, description: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-slate-400" /> AI Provider Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Provider</label>
                    <select 
                      className="form-select max-w-sm"
                      value={aiData.providerKey}
                      onChange={(e) => setAiData({ ...aiData, providerKey: e.target.value })}
                    >
                      <option value="platform_managed">Platform Managed (Default)</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="gemini">Google (Gemini)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">If using your own API key, select the provider above.</p>
                  </div>

                  {aiData.providerKey !== 'platform_managed' && (
                    <>
                      <div>
                        <label className="form-label">API Secret Key</label>
                        <input 
                          type="password" 
                          className="form-input max-w-md" 
                          placeholder="sk-..."
                          value={aiData.apiSecret}
                          onChange={(e) => setAiData({ ...aiData, apiSecret: e.target.value })}
                        />
                        <p className="text-xs text-slate-400 mt-1">Leave blank to keep existing key. Keys are securely encrypted at rest (AES-256).</p>
                      </div>
                      <div>
                        <label className="form-label">Language Model</label>
                        <select 
                          className="form-select max-w-sm"
                          value={aiData.selectedModelName}
                          onChange={(e) => setAiData({ ...aiData, selectedModelName: e.target.value })}
                        >
                          {aiData.providerKey === 'openai' && (
                            <>
                              <option value="gpt-4o-mini">gpt-4o-mini</option>
                              <option value="gpt-4o">gpt-4o</option>
                              <option value="gpt-4-turbo">gpt-4-turbo</option>
                            </>
                          )}
                          {aiData.providerKey === 'anthropic' && (
                            <>
                              <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
                              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                            </>
                          )}
                          {aiData.providerKey === 'gemini' && (
                            <>
                              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            </>
                          )}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" /> Current Plan
                  </h3>
                  <span className="badge badge-success uppercase tracking-wider">{initialTenant?.plan || 'core'}</span>
                </div>
                <div className="mt-6 flex gap-3">
                  <button className="btn btn-secondary">View Invoices</button>
                  <button className="btn btn-primary">Upgrade Plan</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

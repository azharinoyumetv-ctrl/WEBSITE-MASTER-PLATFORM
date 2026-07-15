'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, Palette, Save, Bot, Loader2, CreditCard, 
  MessageSquare, Globe, Lock, Shield, Database, FileText, Play, Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { saveAdminWebsiteConfig, saveTenantLogo, saveAiConfig, savePaymentConfig, getWebsiteConfigSnapshots, restoreWebsiteConfigSnapshot, createTempAiSecretToken } from '@/lib/actions/website'
import { getBillingInvoices } from '@/lib/actions/billing'
import { exportTenantData, importTenantData, getAuditLogsForExport, runTenantIsolationAudit } from '@/lib/actions/backup'

export function SettingsClient({ initialWebsite, initialTenant, initialAiConfig, tenantId }: { initialWebsite: any, initialTenant: any, initialAiConfig?: any, tenantId: string }) {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'billing' | 'ai' | 'history' | 'security'>('general')
  const [logoPreview, setLogoPreview] = useState<string | null>(initialTenant?.logoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false)
  const [diffSnapshot, setDiffSnapshot] = useState<any>(null)
  const [pendingTab, setPendingTab] = useState<'general' | 'theme' | 'billing' | 'ai' | 'history' | 'security' | null>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  // Security panel states
  const [isExportingData, setIsExportingData] = useState(false)
  const [isRestoringData, setIsRestoringData] = useState(false)
  const [isExportingLogs, setIsExportingLogs] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditReport, setAuditReport] = useState<any | null>(null)
  
  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoadingSnapshots(true)
      getWebsiteConfigSnapshots(tenantId).then(res => {
        if (res.success) setSnapshots(res.snapshots || [])
        setIsLoadingSnapshots(false)
      })
    } else if (activeTab === 'billing') {
      setIsLoadingInvoices(true)
      getBillingInvoices(tenantId).then(res => {
        if (res.success) setInvoices(res.invoices || [])
        setIsLoadingInvoices(false)
      })
    }
  }, [activeTab, tenantId])

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to restore this configuration snapshot? This will overwrite your current settings.')) return
    setIsSaving(true)
    const res = await restoreWebsiteConfigSnapshot(tenantId, snapshotId)
    setIsSaving(false)
    if (res.success) {
      toast.success('Configuration restored successfully')
      window.location.reload()
    } else {
      toast.error(res.error || 'Failed to restore snapshot')
    }
  }

  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(websiteData, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `config-backup-${tenantId}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        setWebsiteData(prev => ({ ...prev, ...json }))
        toast.success('Configuration imported. Click "Save Changes" to apply.')
      } catch (err) {
        toast.error('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadBackup = async () => {
    setIsExportingData(true)
    const res = await exportTenantData(tenantId)
    setIsExportingData(false)
    if (res.success && res.backupPayload) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.backupPayload, null, 2))
      const downloadAnchorNode = document.createElement('a')
      downloadAnchorNode.setAttribute("href", dataStr)
      downloadAnchorNode.setAttribute("download", `full-backup-${tenantId}-${Date.now()}.json`)
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click()
      downloadAnchorNode.remove()
      toast.success('Full database backup downloaded!')
    } else {
      toast.error(res.error || 'Failed to generate backup')
    }
  }

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('WARNING: Restoring this backup will completely clear your current catalog, orders, POS configurations, and settings, and replace them with the backup state. This action is irreversible. Do you want to proceed?')) {
      e.target.value = ''
      return
    }

    setIsRestoringData(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string)
        const res = await importTenantData(tenantId, backupData)
        setIsRestoringData(false)
        if (res.success) {
          toast.success('Database backup restored successfully!')
          window.location.reload()
        } else {
          toast.error(res.error || 'Failed to restore backup')
        }
      } catch (err) {
        setIsRestoringData(false)
        toast.error('Invalid backup JSON file format')
      }
    }
    reader.readAsText(file)
  }

  const handleExportAuditLogs = async (format: 'csv' | 'json') => {
    setIsExportingLogs(true)
    const res = await getAuditLogsForExport(tenantId)
    setIsExportingLogs(false)
    if (res.success && res.logs) {
      let content = ''
      let mimeType = ''
      let filename = ''

      if (format === 'json') {
        content = JSON.stringify(res.logs, null, 2)
        mimeType = 'application/json'
        filename = `audit-logs-${tenantId}-${Date.now()}.json`
      } else {
        const headers = ['Timestamp', 'User', 'Action', 'Target Resource', 'IP Address', 'Payload Changes']
        const csvRows = [
          headers.join(','),
          ...res.logs.map((log: any) => [
            new Date(log.createdAt).toISOString(),
            `"${log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''} (${log.user.email})` : 'System'}"`,
            `"${log.actionPerformed}"`,
            `"${log.targetResource}"`,
            `"${log.ipAddress}"`,
            `"${JSON.stringify(log.payloadChanges).replace(/"/g, '""')}"`
          ].join(','))
        ]
        content = csvRows.join('\n')
        mimeType = 'text/csv'
        filename = `audit-logs-${tenantId}-${Date.now()}.csv`
      }

      const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Audit logs downloaded!')
    } else {
      toast.error(res.error || 'Failed to export audit logs')
    }
  }

  const handleRunSecurityAudit = async () => {
    setIsAuditing(true)
    const res = await runTenantIsolationAudit(tenantId)
    setIsAuditing(false)
    if (res.success && res.report) {
      setAuditReport(res.report)
      toast.success('Security check completed!')
    } else {
      toast.error(res.error || 'Failed to complete security audit')
    }
  }
  
  const [websiteData, setWebsiteData] = useState({
    siteTitle: initialWebsite?.siteTitle || 'Website',
    isActive: initialWebsite?.isActive ?? true,
    themeConfig: initialWebsite?.themeConfig || {
      colors: { primary: '#4f46e5', secondary: '#10b981' },
      typography: { base_font: 'Inter' },
      baseCurrency: 'IDR'
    },
    globalSeoMetadata: initialWebsite?.globalSeoMetadata || { description: '' }
  })

  const [paymentConfig, setPaymentConfig] = useState({
    xenditEnabled: initialWebsite?.xenditEnabled || false,
    xenditSecret: initialWebsite?.isXenditSecretConfigured ? '••••••••' : '',
    xenditWebhookToken: initialWebsite?.isXenditWebhookTokenConfigured ? '••••••••' : '',
    midtransEnabled: initialWebsite?.midtransEnabled || false,
    midtransServerKey: initialWebsite?.isMidtransServerKeyConfigured ? '••••••••' : '',
    dokuEnabled: initialWebsite?.dokuEnabled || false,
    dokuEnvironment: initialWebsite?.dokuEnvironment || 'sandbox',
    dokuClientId: initialWebsite?.isDokuClientIdConfigured ? '••••••••' : '',
    dokuMerchantPublicKey: initialWebsite?.isDokuMerchantPublicKeyConfigured ? '••••••••' : '',
    dokuSnapTokenUrl: initialWebsite?.isDokuSnapTokenUrlConfigured ? '••••••••' : '',
    dokuSharedKey: initialWebsite?.isDokuSharedKeyConfigured ? '••••••••' : '',
    dokuPreferredChannel: initialWebsite?.dokuPreferredChannel || 'all'
  })

  const [hoveredField, setHoveredField] = useState<string | null>(null)

  const [activeChannels, setActiveChannels] = useState({
    va: initialWebsite?.dokuPreferredChannel === 'va' || initialWebsite?.dokuPreferredChannel === 'all' || !initialWebsite?.dokuPreferredChannel,
    ewallet: initialWebsite?.dokuPreferredChannel === 'ewallet' || initialWebsite?.dokuPreferredChannel === 'all' || !initialWebsite?.dokuPreferredChannel,
    minimart: initialWebsite?.dokuPreferredChannel === 'minimart' || initialWebsite?.dokuPreferredChannel === 'all' || !initialWebsite?.dokuPreferredChannel
  })

  const handleChannelChange = (channel: 'va' | 'ewallet' | 'minimart', checked: boolean) => {
    const updated = { ...activeChannels, [channel]: checked };
    setActiveChannels(updated);
    
    let pref = 'all';
    if (updated.va && !updated.ewallet && !updated.minimart) pref = 'va';
    else if (!updated.va && updated.ewallet && !updated.minimart) pref = 'ewallet';
    else if (!updated.va && !updated.ewallet && updated.minimart) pref = 'minimart';
    else if (!updated.va && !updated.ewallet && !updated.minimart) pref = 'none';
    
    setPaymentConfig(prev => ({ ...prev, dokuPreferredChannel: pref }));
  }

  const [aiData, setAiData] = useState({
    providerKey: initialAiConfig?.providerKey || 'platform_managed',
    apiSecret: initialAiConfig?.encryptedApiSecret ? '••••••••' : '',
    selectedModelName: initialAiConfig?.selectedModelName || 'gpt-4o-mini'
  })

  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)

  const isTabDirty = (tab: string) => {
    if (tab === 'general') {
      const xenditSecretInit = initialWebsite?.isXenditSecretConfigured ? '••••••••' : ''
      const xenditWebhookInit = initialWebsite?.isXenditWebhookTokenConfigured ? '••••••••' : ''
      const midtransServerKeyInit = initialWebsite?.isMidtransServerKeyConfigured ? '••••••••' : ''
      const dokuClientIdInit = initialWebsite?.isDokuClientIdConfigured ? '••••••••' : ''
      const dokuMerchantPublicKeyInit = initialWebsite?.isDokuMerchantPublicKeyConfigured ? '••••••••' : ''
      const dokuSnapTokenUrlInit = initialWebsite?.isDokuSnapTokenUrlConfigured ? '••••••••' : ''
      const dokuSharedKeyInit = initialWebsite?.isDokuSharedKeyConfigured ? '••••••••' : ''
      
      return paymentConfig.xenditEnabled !== (initialWebsite?.xenditEnabled || false) ||
        paymentConfig.xenditSecret !== xenditSecretInit ||
        paymentConfig.xenditWebhookToken !== xenditWebhookInit ||
        paymentConfig.midtransEnabled !== (initialWebsite?.midtransEnabled || false) ||
        paymentConfig.midtransServerKey !== midtransServerKeyInit ||
        paymentConfig.dokuEnabled !== (initialWebsite?.dokuEnabled || false) ||
        paymentConfig.dokuEnvironment !== (initialWebsite?.dokuEnvironment || 'sandbox') ||
        paymentConfig.dokuClientId !== dokuClientIdInit ||
        paymentConfig.dokuMerchantPublicKey !== dokuMerchantPublicKeyInit ||
        paymentConfig.dokuSnapTokenUrl !== dokuSnapTokenUrlInit ||
        paymentConfig.dokuSharedKey !== dokuSharedKeyInit ||
        paymentConfig.dokuPreferredChannel !== (initialWebsite?.dokuPreferredChannel || 'all') ||
        (websiteData.themeConfig.paymentGateway || 'unset') !== (initialWebsite?.themeConfig?.paymentGateway || 'unset');
    }
    if (tab === 'theme') {
      const siteTitleInit = initialWebsite?.siteTitle || 'Website'
      const themeConfigInit = initialWebsite?.themeConfig || {
        colors: { primary: '#4f46e5', secondary: '#10b981' },
        typography: { base_font: 'Inter' },
        baseCurrency: 'IDR'
      }
      const seoInit = initialWebsite?.globalSeoMetadata || { description: '' }
      
      return websiteData.siteTitle !== siteTitleInit ||
        websiteData.isActive !== (initialWebsite?.isActive ?? true) ||
        JSON.stringify(websiteData.themeConfig) !== JSON.stringify(themeConfigInit) ||
        JSON.stringify(websiteData.globalSeoMetadata) !== JSON.stringify(seoInit);
    }
    if (tab === 'ai') {
      const providerKeyInit = initialAiConfig?.providerKey || 'platform_managed'
      const apiSecretInit = initialAiConfig?.encryptedApiSecret ? '••••••••' : ''
      const modelInit = initialAiConfig?.selectedModelName || 'gpt-4o-mini'

      return aiData.providerKey !== providerKeyInit ||
        aiData.apiSecret !== apiSecretInit ||
        aiData.selectedModelName !== modelInit;
    }
    return false
  }

  const handleTabChange = (tabId: typeof activeTab) => {
    if (isTabDirty(activeTab)) {
      setPendingTab(tabId)
    } else {
      setActiveTab(tabId)
    }
  }

  useEffect(() => {
    const fetchModels = async () => {
      if (aiData.providerKey === 'platform_managed') {
        setAvailableModels([])
        return
      }
      setIsFetchingModels(true)
      try {
        const customUrlPart = aiData.selectedModelName.includes('|url:') ? aiData.selectedModelName.split('|url:')[1] : ''
        
        let secretToken = ''
        if (aiData.apiSecret && !aiData.apiSecret.includes('•')) {
          const tokenRes = await createTempAiSecretToken(tenantId, aiData.apiSecret)
          if (tokenRes.success && tokenRes.token) {
            secretToken = tokenRes.token
          }
        }

        const res = await fetch('/api/ai/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerKey: aiData.providerKey,
            secretToken,
            customBaseUrl: customUrlPart
          })
        })
        if (res.ok) {
          const data = await res.json()
          if (data.models && data.models.length > 0) {
            setAvailableModels(data.models)
          } else {
            setAvailableModels([])
          }
        } else {
          setAvailableModels([])
        }
      } catch (err) {
        setAvailableModels([])
      }
      setIsFetchingModels(false)
    }

    const t = setTimeout(() => {
      fetchModels()
    }, 800)

    return () => clearTimeout(t)
  }, [aiData.providerKey, aiData.apiSecret, aiData.selectedModelName.includes('|url:') ? aiData.selectedModelName.split('|url:')[1] : ''])

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    let res: any = { success: true }
    let paymentRes: any = { success: true }
    let aiRes: any = { success: true }

    if (activeTab === 'general') {
      res = await saveAdminWebsiteConfig(tenantId, websiteData)
      paymentRes = await savePaymentConfig(tenantId, paymentConfig)
    } else if (activeTab === 'theme') {
      res = await saveAdminWebsiteConfig(tenantId, websiteData)
    } else if (activeTab === 'ai') {
      aiRes = await saveAiConfig(tenantId, aiData)
    }

    setIsSaving(false)

    if (res.success && aiRes.success && paymentRes.success) {
      toast.success('Settings saved successfully')
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      const errMsg = res.error || aiRes.error || paymentRes.error || 'Failed to save settings'
      toast.error(errMsg.toString())
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
            { id: 'history', label: 'History & Backups', icon: Save },
            { id: 'security', label: 'Security & Hardening', icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as typeof activeTab)}
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
                    <label className="form-label flex items-center gap-1">Company Name <Lock className="w-3 h-3 text-slate-400" /></label>
                    <input type="text" className="form-input bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed" defaultValue={initialTenant?.companyName || ''} readOnly />
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
                    <label className="form-label flex items-center gap-1">Custom Domain <Lock className="w-3 h-3 text-slate-400" /></label>
                    <input type="text" className="form-input bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed" defaultValue={initialTenant?.customDomain || ''} placeholder="e.g. www.yourcompany.com" readOnly />
                    <p className="text-xs text-slate-400 mt-1">Managed via global admin. Contact support to update.</p>
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
                      value={websiteData.themeConfig.baseCurrency || 'IDR'}
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
                    <label className="form-label text-xs font-semibold text-slate-700">Primary Payment Gateway</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="paymentGateway"
                          value="doku"
                          checked={(websiteData.themeConfig.paymentGateway || 'unset') === 'doku'}
                          onChange={(e) => setWebsiteData({
                            ...websiteData,
                            themeConfig: { ...websiteData.themeConfig, paymentGateway: e.target.value }
                          })}
                          className="form-radio text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-350"
                        />
                        DOKU
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="paymentGateway"
                          value="xendit"
                          checked={websiteData.themeConfig.paymentGateway === 'xendit'}
                          onChange={(e) => setWebsiteData({
                            ...websiteData,
                            themeConfig: { ...websiteData.themeConfig, paymentGateway: e.target.value }
                          })}
                          className="form-radio text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-350"
                        />
                        Xendit
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="paymentGateway"
                          value="midtrans"
                          checked={websiteData.themeConfig.paymentGateway === 'midtrans'}
                          onChange={(e) => setWebsiteData({
                            ...websiteData,
                            themeConfig: { ...websiteData.themeConfig, paymentGateway: e.target.value }
                          })}
                          className="form-radio text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-350"
                        />
                        Midtrans
                      </label>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Select the payment processor for checkout. You must configure API keys for real providers.</p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">Provider Configurations</h4>
                    
                    <div className="space-y-4">
                      {/* DOKU Config */}
                      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-slate-800">DOKU</h5>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={paymentConfig.dokuEnabled} 
                              onChange={(e) => setPaymentConfig({...paymentConfig, dokuEnabled: e.target.checked})} 
                              className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                            />
                            <span className="text-sm text-slate-600">Enable</span>
                          </label>
                        </div>
                        {paymentConfig.dokuEnabled && (
                          <div className="space-y-4 animate-scale-in">
                            <div>
                              <label className="form-label text-xs font-semibold text-slate-700">Environment</label>
                              <div className="flex gap-4 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                  <input 
                                    type="radio" 
                                    name="dokuEnvironment" 
                                    value="sandbox"
                                    checked={paymentConfig.dokuEnvironment === 'sandbox'} 
                                    onChange={(e) => setPaymentConfig({...paymentConfig, dokuEnvironment: e.target.value})} 
                                    className="form-radio text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" 
                                  />
                                  Sandbox
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                  <input 
                                    type="radio" 
                                    name="dokuEnvironment" 
                                    value="production"
                                    checked={paymentConfig.dokuEnvironment === 'production'} 
                                    onChange={(e) => setPaymentConfig({...paymentConfig, dokuEnvironment: e.target.value})} 
                                    className="form-radio text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5" 
                                  />
                                  Production
                                </label>
                              </div>
                            </div>
                            
                            <div className="relative group/field">
                              <label className="form-label text-xs font-semibold text-slate-700">DOKU Client ID (Public Key)</label>
                              <input 
                                type={hoveredField === 'dokuClientId' ? 'text' : 'password'}
                                className="form-input text-sm pr-10" 
                                placeholder="e.g. MCH-..."
                                value={paymentConfig.dokuClientId}
                                onChange={(e) => setPaymentConfig({...paymentConfig, dokuClientId: e.target.value})}
                                onMouseEnter={() => setHoveredField('dokuClientId')}
                                onMouseLeave={() => setHoveredField(null)}
                              />
                            </div>
                            
                            <div className="relative group/field">
                              <label className="form-label text-xs font-semibold text-slate-700">Merchant Public Key</label>
                              <input 
                                type={hoveredField === 'dokuMerchantPublicKey' ? 'text' : 'password'}
                                className="form-input text-sm pr-10" 
                                placeholder="MC-PUB-..."
                                value={paymentConfig.dokuMerchantPublicKey}
                                onChange={(e) => setPaymentConfig({...paymentConfig, dokuMerchantPublicKey: e.target.value})}
                                onMouseEnter={() => setHoveredField('dokuMerchantPublicKey')}
                                onMouseLeave={() => setHoveredField(null)}
                              />
                            </div>
                            
                            <div className="relative group/field">
                              <label className="form-label text-xs font-semibold text-slate-700">SNAP Token URL</label>
                              <input 
                                type={hoveredField === 'dokuSnapTokenUrl' ? 'text' : 'password'}
                                className="form-input text-sm pr-10" 
                                placeholder="e.g. https://..."
                                value={paymentConfig.dokuSnapTokenUrl}
                                onChange={(e) => setPaymentConfig({...paymentConfig, dokuSnapTokenUrl: e.target.value})}
                                onMouseEnter={() => setHoveredField('dokuSnapTokenUrl')}
                                onMouseLeave={() => setHoveredField(null)}
                              />
                            </div>
                            
                            <div className="relative group/field">
                              <label className="form-label text-xs font-semibold text-slate-700">Shared Key (Secret Key)</label>
                              <input 
                                type={hoveredField === 'dokuSharedKey' ? 'text' : 'password'}
                                className="form-input text-sm pr-10" 
                                placeholder="Shared Key from DOKU Dashboard"
                                value={paymentConfig.dokuSharedKey}
                                onChange={(e) => setPaymentConfig({...paymentConfig, dokuSharedKey: e.target.value})}
                                onMouseEnter={() => setHoveredField('dokuSharedKey')}
                                onMouseLeave={() => setHoveredField(null)}
                              />
                            </div>
                            
                            <div>
                              <label className="form-label text-xs font-semibold text-slate-700">Active Channels</label>
                              <div className="flex flex-col gap-2 mt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                  <input 
                                    type="checkbox" 
                                    checked={activeChannels.va}
                                    onChange={(e) => handleChannelChange('va', e.target.checked)}
                                    className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                                  />
                                  Transfer Bank (BCA, Mandiri, BRI, BNI, Permata)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                  <input 
                                    type="checkbox" 
                                    checked={activeChannels.ewallet}
                                    onChange={(e) => handleChannelChange('ewallet', e.target.checked)}
                                    className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                                  />
                                  DOKU e-Wallet (ShopeePay, OVO, Dana)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                                  <input 
                                    type="checkbox" 
                                    checked={activeChannels.minimart}
                                    onChange={(e) => handleChannelChange('minimart', e.target.checked)}
                                    className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                                  />
                                  Minimart (Alfamart)
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Xendit Config */}
                      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-slate-800">Xendit</h5>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={paymentConfig.xenditEnabled} 
                              onChange={(e) => setPaymentConfig({...paymentConfig, xenditEnabled: e.target.checked})} 
                              className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                            />
                            <span className="text-sm text-slate-600">Enable</span>
                          </label>
                        </div>
                        {paymentConfig.xenditEnabled && (
                          <div className="space-y-4">
                            <div>
                              <label className="form-label text-xs font-semibold text-slate-700">Secret Key</label>
                              <input 
                                type="password" 
                                className="form-input text-sm" 
                                placeholder="xnd_..."
                                value={paymentConfig.xenditSecret}
                                onChange={(e) => setPaymentConfig({...paymentConfig, xenditSecret: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="form-label text-xs font-semibold text-slate-700">Webhook Verification Token</label>
                              <input 
                                type="password" 
                                className="form-input text-sm" 
                                placeholder="Token from Xendit Dashboard"
                                value={paymentConfig.xenditWebhookToken}
                                onChange={(e) => setPaymentConfig({...paymentConfig, xenditWebhookToken: e.target.value})}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Midtrans Config */}
                      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-slate-800">Midtrans</h5>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={paymentConfig.midtransEnabled} 
                              onChange={(e) => setPaymentConfig({...paymentConfig, midtransEnabled: e.target.checked})} 
                              className="form-checkbox text-indigo-600 rounded border-slate-350 h-4 w-4" 
                            />
                            <span className="text-sm text-slate-600">Enable</span>
                          </label>
                        </div>
                        {paymentConfig.midtransEnabled && (
                          <div className="space-y-4">
                            <div>
                              <label className="form-label text-xs font-semibold text-slate-700">Server Key</label>
                              <input 
                                type="password" 
                                className="form-input text-sm" 
                                placeholder="SB-Mid-server-... or Mid-server-..."
                                value={paymentConfig.midtransServerKey}
                                onChange={(e) => setPaymentConfig({...paymentConfig, midtransServerKey: e.target.value})}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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

              {/* Typography & Layout */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-slate-400" /> Typography & Layout
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Font Family</label>
                      <select 
                        className="form-select"
                        value={websiteData.themeConfig.fontFamily || 'inter'}
                        onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, fontFamily: e.target.value }})}
                      >
                        <option value="inter">Inter (Default)</option>
                        <option value="roboto">Roboto</option>
                        <option value="outfit">Outfit</option>
                        <option value="poppins">Poppins</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Base Font Size</label>
                      <select 
                        className="form-select"
                        value={websiteData.themeConfig.fontSize || '16px'}
                        onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, fontSize: e.target.value }})}
                      >
                        <option value="14px">Small (14px)</option>
                        <option value="16px">Medium (16px)</option>
                        <option value="18px">Large (18px)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Layout Density</label>
                    <select 
                      className="form-select max-w-sm"
                      value={websiteData.themeConfig.layoutDensity || 'comfortable'}
                      onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, layoutDensity: e.target.value }})}
                    >
                      <option value="compact">Compact (High Information Density)</option>
                      <option value="cozy">Cozy (Balanced)</option>
                      <option value="comfortable">Comfortable (Lots of Whitespace)</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mt-4">
                      <input 
                        type="checkbox" 
                        className="form-checkbox text-indigo-600 rounded"
                        checked={websiteData.themeConfig.allowPageOverrides || false}
                        onChange={(e) => setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, allowPageOverrides: e.target.checked }})}
                      />
                      <span className="text-sm font-medium text-slate-700">Allow Per-Page Theme Overrides</span>
                    </label>
                    <p className="text-xs text-slate-400 mt-1 ml-6">If enabled, individual pages can override the global theme colors and layout.</p>
                  </div>
                </div>
              </div>

              {/* Navigation & Footer Schema */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" /> Navigation & Footer Schema
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Navigation Schema (JSON)</label>
                    <textarea 
                      className="form-textarea font-mono text-xs" 
                      rows={5}
                      placeholder='[{"label": "Home", "href": "/"}, {"label": "Shop", "href": "/shop"}]'
                      value={typeof websiteData.themeConfig.navigationSchema === 'string' ? websiteData.themeConfig.navigationSchema : JSON.stringify(websiteData.themeConfig.navigationSchema || [], null, 2)}
                      onChange={(e) => {
                        let parsed = e.target.value;
                        try {
                          parsed = JSON.parse(e.target.value);
                        } catch (e) {
                          // allow invalid json string while typing
                        }
                        setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, navigationSchema: parsed }})
                      }}
                    />
                    <p className="text-xs text-slate-400 mt-1">Define header navigation links in JSON format.</p>
                  </div>
                  <div>
                    <label className="form-label">Footer Configuration (JSON)</label>
                    <textarea 
                      className="form-textarea font-mono text-xs" 
                      rows={5}
                      placeholder='{"columns": [{"title": "Company", "links": []}], "copyright": "© 2024"}'
                      value={typeof websiteData.themeConfig.footerConfig === 'string' ? websiteData.themeConfig.footerConfig : JSON.stringify(websiteData.themeConfig.footerConfig || {}, null, 2)}
                      onChange={(e) => {
                        let parsed = e.target.value;
                        try {
                          parsed = JSON.parse(e.target.value);
                        } catch (e) {
                          // allow invalid json string while typing
                        }
                        setWebsiteData({ ...websiteData, themeConfig: { ...websiteData.themeConfig, footerConfig: parsed }})
                      }}
                    />
                    <p className="text-xs text-slate-400 mt-1">Define footer columns, links, and copyright text.</p>
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
                      <option value="deepseek">DeepSeek</option>
                      <option value="grok">xAI (Grok)</option>
                      <option value="kimi">Moonshot (Kimi)</option>
                      <option value="custom">Custom (OpenAI Compatible)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Use a provider API key. ChatGPT subscriptions and browser logins cannot be used as API credentials.</p>
                  </div>

                  {aiData.providerKey === 'custom' && (
                    <div>
                      <label className="form-label">Custom Base URL</label>
                      <input 
                        type="url" 
                        className="form-input max-w-md" 
                        placeholder="https://api.example.com/v1"
                        value={aiData.selectedModelName.split('|url:')[1] || ''}
                        onChange={(e) => {
                          const model = aiData.selectedModelName.split('|url:')[0] || ''
                          setAiData({ ...aiData, selectedModelName: `${model}|url:${e.target.value}` })
                        }}
                      />
                      <p className="text-xs text-slate-400 mt-1">Enter the OpenAI-compatible base URL (omit /chat/completions).</p>
                    </div>
                  )}

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
                        {isFetchingModels ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Fetching available models...
                          </div>
                        ) : availableModels.length > 0 ? (
                          <select 
                            className="form-select max-w-sm"
                            value={aiData.selectedModelName.split('|url:')[0] || ''}
                            onChange={(e) => {
                              const urlPart = aiData.selectedModelName.includes('|url:') ? `|url:${aiData.selectedModelName.split('|url:')[1]}` : ''
                              setAiData({ ...aiData, selectedModelName: `${e.target.value}${urlPart}` })
                            }}
                          >
                            <option value="">Select a model...</option>
                            {availableModels.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            className="form-input max-w-sm"
                            placeholder="e.g. gpt-4o, claude-3-5-sonnet-latest"
                            value={aiData.selectedModelName.split('|url:')[0] || ''}
                            onChange={(e) => {
                              const urlPart = aiData.selectedModelName.includes('|url:') ? `|url:${aiData.selectedModelName.split('|url:')[1]}` : ''
                              setAiData({ ...aiData, selectedModelName: `${e.target.value}${urlPart}` })
                            }}
                          />
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {availableModels.length > 0 
                            ? "This list was fetched directly from the configured provider; select the model to use."
                            : "Enter an API key to fetch the live provider list, or type the exact model identifier."}
                        </p>
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
                    <CreditCard className="w-4 h-4 text-slate-400" /> DagangOS Freedom License
                  </h3>
                  <span className="badge badge-success uppercase tracking-wider">Perpetual</span>
                </div>
                
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <h4 className="text-base font-bold text-emerald-950">Your deployed platform is not a subscription tier.</h4>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900">DagangOS grants a perpetual, transferable self-hosted license for the deployed platform. Your business owns and controls its data, domain, VPS, and infrastructure. There is no mandatory platform renewal or transaction commission.</p>
                  <p className="mt-3 text-xs leading-relaxed text-emerald-800">Optional maintenance, managed VPS administration, backup management, and priority support are separate services. Source-code and IP transfer, when required, is quoted separately.</p>
                </div>
              </div>

              {/* Invoices List */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Save className="w-4 h-4 text-slate-400" /> Deployment & Service Invoice History
                </h3>
                {isLoadingInvoices ? (
                  <div className="py-4 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading invoice history...
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">No invoices found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice: any) => (
                          <tr key={invoice.id}>
                            <td><span className="text-sm font-semibold text-slate-800">{invoice.description}</span></td>
                            <td className="font-mono text-sm text-slate-600">{invoice.currency} {Number(invoice.amount).toFixed(2)}</td>
                            <td>
                              <span className={cn('badge text-[10px]', invoice.status === 'paid' ? 'badge-success' : 'badge-neutral')}>
                                {invoice.status}
                              </span>
                            </td>
                            <td className="text-xs text-slate-500">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                            <td className="text-right">
                              {invoice.invoiceUrl ? (
                                <a 
                                  href={invoice.invoiceUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="btn btn-ghost btn-sm text-indigo-600 underline"
                                >
                                  View Invoice
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Save className="w-4 h-4 text-slate-400" /> Export / Import Config
                </h3>
                <div className="flex gap-4">
                  <button onClick={handleExportConfig} className="btn btn-secondary">Export JSON</button>
                  <label className="btn btn-secondary cursor-pointer">
                    Import JSON
                    <input type="file" accept=".json" className="hidden" onChange={handleImportConfig} />
                  </label>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" /> Configuration Snapshots
                </h3>
                {isLoadingSnapshots ? (
                  <div className="py-4 text-sm text-slate-500">Loading snapshots...</div>
                ) : snapshots.length === 0 ? (
                  <div className="py-4 text-sm text-slate-500">No snapshots available.</div>
                ) : (
                  <div className="space-y-4">
                    {snapshots.map((snap, idx) => (
                      <div key={snap.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-900">Snapshot {snapshots.length - idx} ({snap.configType})</div>
                          <div className="text-sm text-slate-500">{new Date(snap.createdAt).toLocaleString()}</div>
                        </div>
                        <button onClick={() => setDiffSnapshot(snap)} className="btn btn-secondary text-sm">
                          Review & Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Backup & Restore Panel */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" /> Full Tenant Database Backup
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Export all tenant data (including category structures, catalog items, inventories, terminals, POS sessions, orders, and custom settings) into a single downloadable JSON backup file. You can restore this file at any time.
                </p>
                <div className="flex flex-wrap gap-4 items-center">
                  <button
                    onClick={handleDownloadBackup}
                    disabled={isExportingData}
                    className="btn btn-primary bg-indigo-650 hover:bg-indigo-700"
                  >
                    {isExportingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Download Full Backup (.json)
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <label className="btn btn-secondary cursor-pointer">
                      <Plus className="w-4 h-4 mr-2 inline" /> Upload & Restore
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        onChange={handleImportBackupFile}
                        disabled={isRestoringData}
                      />
                    </label>
                    {isRestoringData && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
                  </div>
                </div>
              </div>

              {/* Audit Log Export */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Administrative Audit Logs Export
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Download a chronological log of all administrative actions and security events performed by your tenant users in CSV or JSON formats.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleExportAuditLogs('csv')}
                    disabled={isExportingLogs}
                    className="btn btn-secondary border-slate-300 text-slate-700"
                  >
                    Export Logs to CSV
                  </button>
                  <button
                    onClick={() => handleExportAuditLogs('json')}
                    disabled={isExportingLogs}
                    className="btn btn-secondary border-slate-300 text-slate-700"
                  >
                    Export Logs to JSON
                  </button>
                </div>
              </div>

              {/* Tenant Data Isolation Verification Report Tool */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" /> Tenant RLS & Data Isolation Auditor
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Run a security scan to audit database boundaries, verify RLS (Row Level Security) settings, and ensure that cross-tenant data requests are strictly blocked.
                </p>
                <button
                  onClick={handleRunSecurityAudit}
                  disabled={isAuditing}
                  className="btn btn-secondary bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 flex items-center gap-2"
                >
                  {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Isolation Security Check
                </button>

                {auditReport && (
                  <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Isolation Security Audit Report</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                        auditReport.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      )}>
                        {auditReport.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-xs font-mono text-slate-700">
                      <div><strong>Active Tenant ID:</strong> {auditReport.tenantId}</div>
                      <div><strong>Timestamp:</strong> {auditReport.timestamp}</div>
                      <div className="pt-2"><strong>Checks Summary:</strong></div>
                      {Object.keys(auditReport.results).map(key => (
                        <div key={key} className="flex justify-between pl-4">
                          <span>{key}:</span>
                          <span className="font-bold text-emerald-600">{auditReport.results[key]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Diff Modal */}
      {diffSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold">Review Configuration Changes</h3>
              <button onClick={() => setDiffSnapshot(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
              <div className="mb-2 grid grid-cols-2 gap-4 px-2">
                <div className="text-sm font-semibold text-red-600 text-center">Current State (to be replaced)</div>
                <div className="text-sm font-semibold text-emerald-600 text-center">Snapshot State (to restore)</div>
              </div>
              <div className="space-y-3">
                {Array.from(new Set([...Object.keys(websiteData || {}), ...Object.keys(diffSnapshot.snapshot || {})])).map(key => {
                  const currVal = JSON.stringify((websiteData as any)?.[key], null, 2)
                  const snapVal = JSON.stringify(diffSnapshot.snapshot?.[key], null, 2)
                  if (currVal === snapVal) return null
                  return (
                    <div key={key} className="p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                      <div className="font-bold text-slate-700 mb-2 font-mono text-sm">{key}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-x-auto border border-red-100">{currVal || 'undefined'}</pre>
                        <pre className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded overflow-x-auto border border-emerald-100">{snapVal || 'undefined'}</pre>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setDiffSnapshot(null)} className="btn btn-secondary">Cancel</button>
              <button 
                onClick={() => {
                  handleRestoreSnapshot(diffSnapshot.id)
                  setDiffSnapshot(null)
                }} 
                className="btn btn-primary"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog Modal */}
      {pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-2">Unsaved Changes</h3>
            <p className="text-sm text-slate-600 mb-6">You have unsaved changes in the current tab. Switching tabs will discard your modifications.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setPendingTab(null)} 
                className="btn btn-secondary text-sm"
              >
                Stay on Tab
              </button>
              <button 
                onClick={() => {
                  setActiveTab(pendingTab)
                  setPendingTab(null)
                }} 
                className="btn bg-red-600 text-white hover:bg-red-700 text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

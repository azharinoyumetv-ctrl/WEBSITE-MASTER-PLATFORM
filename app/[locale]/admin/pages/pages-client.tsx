'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Globe, Eye, FileText, CheckCircle2, XCircle, LayoutTemplate, Save, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { saveAdminPage, deleteAdminPage } from '@/lib/actions/website'
import { z } from 'zod'

const layoutBlockSchema = z.array(z.object({
  type: z.enum(['hero', 'text', 'features', 'catalog_grid', 'contact_form']),
  config: z.any().optional(),
  data: z.any().optional()
}))

export function PagesClient({ initialPages, tenantId }: { initialPages: any[], tenantId: string }) {
  const [pages, setPages] = useState(initialPages)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPage, setEditingPage] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'published', 'draft'
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleDelete = async (pageId: string) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return
    const res = await deleteAdminPage(tenantId, pageId)
    if (res.success) {
      setPages(pages.filter((p: any) => p.id !== pageId))
      toast.success('Page deleted')
    } else {
      toast.error('Failed to delete page: ' + res.error)
    }
  }

  const handleEdit = (page?: any) => {
    const pageToEdit = page || {
      title: '',
      slug: '',
      isPublished: false,
      seoMetadata: { description: '' },
      layoutBlocks: []
    }
    setEditingPage(pageToEdit)
    setJsonText(JSON.stringify(pageToEdit.layoutBlocks, null, 2))
    setJsonError(null)
    setShowEditor(true)
  }

  const handleJsonChange = (val: string) => {
    setJsonText(val)
    try {
      const parsed = JSON.parse(val)
      const valid = layoutBlockSchema.safeParse(parsed)
      if (!valid.success) {
        setJsonError(valid.error.issues[0]?.message || 'Validation error')
      } else {
        setJsonError(null)
        setEditingPage({ ...editingPage, layoutBlocks: parsed })
      }
    } catch (err) {
      setJsonError('Invalid JSON format')
    }
  }

  const handleSave = async () => {
    if (!editingPage.title || !editingPage.slug) {
      return toast.error('Title and Slug are required')
    }
    if (jsonError) {
      return toast.error('Please fix JSON errors before saving')
    }

    setIsSaving(true)
    const res = await saveAdminPage(tenantId, editingPage.id, editingPage)
    setIsSaving(false)

    if (res.success && res.page) {
      toast.success('Page saved successfully')
      if (editingPage.id) {
        setPages(pages.map(p => p.id === res.page.id ? res.page : p))
      } else {
        setPages([res.page, ...pages])
      }
      setShowEditor(false)
    } else {
      toast.error(res.error || 'Failed to save page')
    }
  }

  if (showEditor && editingPage) {
    return (
      <div className="page-container animate-slide-up">
        <div className="section-header">
          <div>
            <h2 className="section-title">{editingPage.id ? 'Edit Page' : 'Create Page'}</h2>
            <p className="section-desc">Design your page content and configure SEO</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowEditor(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Page
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-4">
              <div>
                <label className="form-label">Page Title</label>
                <input 
                  type="text" 
                  value={editingPage.title}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  className="form-input" 
                  placeholder="e.g. About Us" 
                />
              </div>
              <div>
                <label className="form-label">URL Slug</label>
                <input 
                  type="text" 
                  value={editingPage.slug}
                  onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                  className="form-input font-mono text-sm" 
                  placeholder="e.g. about" 
                />
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" /> Layout Blocks (JSON Editor)
              </h3>
              <p className="text-xs text-slate-500 mb-2">In a real app, this would be a drag-and-drop page builder. For now, edit the JSON representation.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    className={cn("w-full h-96 font-mono text-xs p-4 bg-slate-50 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none", jsonError ? "border-red-300 focus:ring-red-500" : "")}
                  />
                  {jsonError && <p className="text-xs text-red-500 mt-1 font-medium">{jsonError}</p>}
                </div>
                <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 h-96 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Preview</h4>
                  <div className="space-y-4">
                    {editingPage.layoutBlocks?.map((block: any, i: number) => (
                      <div key={i} className="p-3 bg-white rounded border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase">{block.type}</span>
                        </div>
                        {block.type === 'hero' && <p className="text-sm font-medium">{block.data?.heading || 'No Heading'}</p>}
                        {block.type === 'text' && <p className="text-xs text-slate-600 line-clamp-2">{block.data?.html || 'No Text'}</p>}
                        {block.type === 'features' && <p className="text-xs text-slate-600">{block.data?.items?.length || 0} features configured</p>}
                        {block.type === 'catalog_grid' && <p className="text-xs text-slate-600">Shows up to {block.config?.limit || 4} items</p>}
                        {block.type === 'contact_form' && <p className="text-xs text-slate-600">Contact form block</p>}
                      </div>
                    ))}
                    {(!editingPage.layoutBlocks || editingPage.layoutBlocks.length === 0) && (
                      <div className="text-center text-slate-400 text-xs py-10">No valid layout blocks to preview</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold mb-4">Publishing</h3>
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingPage.isPublished}
                  onChange={(e) => setEditingPage({ ...editingPage, isPublished: e.target.checked })}
                  className="form-checkbox h-5 w-5 text-indigo-600 rounded" 
                />
                <div>
                  <p className="font-medium">Published</p>
                  <p className="text-xs text-slate-500">Make this page visible to visitors</p>
                </div>
              </label>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-semibold">SEO Metadata</h3>
              <div>
                <label className="form-label">Meta Description</label>
                <textarea 
                  value={editingPage.seoMetadata?.description || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, seoMetadata: { ...editingPage.seoMetadata, description: e.target.value } })}
                  className="form-textarea" 
                  rows={3} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filteredPages = pages.filter((p: any) => {
    if (statusFilter === 'published') return p.isPublished
    if (statusFilter === 'draft') return !p.isPublished
    return true
  })

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">CMS Pages</h2>
          <p className="section-desc">Manage your public website pages and content</p>
        </div>
        <button onClick={() => handleEdit()} className="btn btn-primary" id="create-page-btn">
          <Plus className="w-4 h-4" />
          Create Page
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="form-select max-w-[200px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Pages</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Page Title</th>
              <th>URL Path</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPages.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500">
                  No pages found. Create your first page!
                </td>
              </tr>
            ) : filteredPages.map((page: any) => (
              <tr key={page.id} className="group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">{page.title}</span>
                  </div>
                </td>
                <td className="font-mono text-sm text-slate-500">/{page.slug === 'home' ? '' : page.slug}</td>
                <td>
                  {page.isPublished ? (
                    <span className="badge badge-success"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</span>
                  ) : (
                    <span className="badge badge-neutral"><XCircle className="w-3 h-3 mr-1" /> Draft</span>
                  )}
                </td>
                <td className="text-sm text-slate-500">{formatDate(page.updatedAt)}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <a 
                      href={`/site/${page.slug === 'home' ? '' : page.slug}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleEdit(page)} className="btn btn-ghost btn-sm text-indigo-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {page.slug !== 'home' && (
                      <button onClick={() => handleDelete(page.id)} className="btn btn-ghost btn-sm text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

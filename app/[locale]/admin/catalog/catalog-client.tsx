'use client'

import { useState } from 'react'
import {
  Package, Plus, Search, Filter, FolderTree, Eye, Edit2,
  MoreHorizontal, Image, Tag, Layers, ChevronRight, ArrowLeft,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createCatalogItem } from '@/lib/actions/catalog'

function CategoryTree({ categories, level = 0, parentId = null }: {
  categories: any[]
  level?: number
  parentId?: string | null
}) {
  const items = categories.filter(c => c.parentId === parentId)
  if (!items.length) return null

  return (
    <div className={level > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''}>
      {items.map(cat => (
        <div key={cat.id}>
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 group cursor-pointer">
            <FolderTree className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-slate-700 flex-1">{cat.name}</span>
            <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100">{cat._count?.items || 0} items</span>
          </div>
          <CategoryTree categories={categories} level={level + 1} parentId={cat.id} />
        </div>
      ))}
    </div>
  )
}

export function CatalogClient({ initialItems, initialCategories, tenantId }: { initialItems: any[], initialCategories: any[], tenantId: string }) {
  const [items, setItems] = useState(initialItems)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newItem, setNewItem] = useState({
    title: '',
    sku: '',
    basePrice: '',
    categoryId: '',
    description: '',
    isVisible: true
  })

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const handleCreate = async () => {
    if (!newItem.title || !newItem.basePrice) {
      return toast.error('Title and Base Price are required')
    }
    
    setIsSaving(true)
    const res = await createCatalogItem(tenantId, {
      ...newItem,
      basePrice: parseFloat(newItem.basePrice) || 0
    })
    setIsSaving(false)

    if (res.success) {
      setItems([res.item, ...items])
      setShowAddModal(false)
      setNewItem({ title: '', sku: '', basePrice: '', categoryId: '', description: '', isVisible: true })
      toast.success('Product created successfully!')
    } else {
      toast.error(res.error || 'Failed to create product')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Catalog</h2>
          <p className="section-desc">Manage products, categories, and item attributes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => toast.success('Category manager opens here')}>
            <FolderTree className="w-4 h-4" />
            Categories
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary" id="add-product-btn">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Categories</h3>
            </div>
            {initialCategories.length > 0 ? (
              <CategoryTree categories={initialCategories} />
            ) : (
              <p className="text-xs text-slate-400">No categories found</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="catalog-search"
                className="form-input pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="card-hover p-4 group">
                <div className="w-full h-36 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                     // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                     <span className="text-white text-xs font-medium flex items-center gap-1"><Image className="w-3 h-3"/> View Gallery</span>
                  </div>
                </div>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{item.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{item.sku || 'No SKU'}</p>
                  </div>
                  <span className={cn(
                    'badge text-[10px] flex-shrink-0',
                    item.isVisible ? 'badge-success' : 'badge-neutral'
                  )}>
                    {item.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </div>

                <div className="mt-2">
                  <p className="text-lg font-bold text-indigo-700">{formatCurrency(Number(item.basePrice))}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toast.success(`Editing ${item.title}`)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No products found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Add New Product</h3>
              <p className="text-sm text-slate-500">Fill in the details to create a new catalog item</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Product Title *</label>
                  <input type="text" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="e.g. Pro Running Shoe" className="form-input" />
                </div>
                <div>
                  <label className="form-label">SKU</label>
                  <input type="text" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} placeholder="APX-001" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Base Price *</label>
                  <input type="number" value={newItem.basePrice} onChange={e => setNewItem({...newItem, basePrice: e.target.value})} placeholder="0.00" className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Category</label>
                  <select value={newItem.categoryId} onChange={e => setNewItem({...newItem, categoryId: e.target.value})} className="form-select">
                    <option value="">No Category</option>
                    {initialCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Detailed product description..." className="form-textarea" rows={3} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="new-product-visible" checked={newItem.isVisible} onChange={e => setNewItem({...newItem, isVisible: e.target.checked})} className="w-4 h-4 rounded text-indigo-600" />
                  <label htmlFor="new-product-visible" className="text-sm text-slate-700">Visible in catalog</label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={isSaving}
                className="btn btn-primary"
                id="save-product-btn"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

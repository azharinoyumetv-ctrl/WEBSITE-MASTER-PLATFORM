'use client'

import { useState } from 'react'
import {
  Package, Plus, Search, Filter, FolderTree, Eye, Edit2,
  MoreHorizontal, Image, Tag, Layers, ChevronRight, ArrowLeft,
  Loader2
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createCatalogItem, updateCatalogItem, deleteCatalogItem, createCategory, updateCategory, deleteCategory } from '@/lib/actions/catalog'
import { Trash2 } from 'lucide-react'

function CategoryTree({ categories, level = 0, parentId = null, onEdit, onDelete }: {
  categories: any[]
  level?: number
  parentId?: string | null
  onEdit?: (c: any) => void
  onDelete?: (id: string) => void
}) {
  const items = categories.filter(c => c.parentId === parentId)
  if (!items.length) return null

  return (
    <div className={level > 0 ? 'ml-4 border-l border-slate-200 pl-3' : ''}>
      {items.map(cat => (
        <div key={cat.id}>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 group">
            <div className="flex items-center gap-2 cursor-pointer flex-1">
              <FolderTree className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-slate-700">{cat.name}</span>
              <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100">{cat._count?.items || 0} items</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <button onClick={() => onEdit?.(cat)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Edit2 className="w-3 h-3" /></button>
            </div>
          </div>
          <CategoryTree categories={categories} level={level + 1} parentId={cat.id} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </div>
  )
}

export function CatalogClient({ initialItems, initialCategories, tenantId }: { initialItems: any[], initialCategories: any[], tenantId: string }) {
  const [items, setItems] = useState(initialItems)
  const [categories, setCategories] = useState(initialCategories)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Edit State
  const [editingItem, setEditingItem] = useState<any | null>(null)
  
  // Category State
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', parentId: '' })
  
  const [newItem, setNewItem] = useState<any>({
    title: '',
    sku: '',
    basePrice: '',
    categoryId: '',
    description: '',
    isVisible: true,
    imageUrls: [] as string[]
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
      setNewItem({ title: '', sku: '', basePrice: '', categoryId: '', description: '', isVisible: true, imageUrls: [] })
      toast.success('Product created successfully!')
    } else {
      toast.error(res.error || 'Failed to create product')
    }
  }

  const handleUpdate = async () => {
    if (!editingItem) return
    setIsSaving(true)
    const res = await updateCatalogItem(tenantId, editingItem.id, {
      ...editingItem,
      basePrice: parseFloat(editingItem.basePrice) || 0
    })
    setIsSaving(false)
    if (res.success) {
      setItems(items.map(i => i.id === editingItem.id ? res.item : i))
      setEditingItem(null)
      toast.success('Product updated')
    } else {
      toast.error(res.error || 'Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm('Are you sure you want to delete this product?')) return
    const res = await deleteCatalogItem(tenantId, id)
    if(res.success) {
      setItems(items.filter(i => i.id !== id))
      toast.success('Product deleted')
    } else {
      toast.error(res.error || 'Delete failed')
    }
  }

  const handleSaveCategory = async () => {
    if(!categoryForm.name || !categoryForm.slug) return toast.error('Name and slug are required')
    setIsSaving(true)
    if(editingCategory) {
      const res = await updateCategory(tenantId, editingCategory.id, categoryForm)
      if(res.success) {
        setCategories(categories.map(c => c.id === editingCategory.id ? res.category : c))
        setShowCategoryModal(false)
        toast.success('Category updated')
      } else toast.error(res.error)
    } else {
      const res = await createCategory(tenantId, categoryForm)
      if(res.success) {
        setCategories([...categories, res.category])
        setShowCategoryModal(false)
        toast.success('Category created')
      } else toast.error(res.error)
    }
    setIsSaving(false)
  }

  const handleDeleteCategory = async (id: string) => {
    if(!confirm('Delete this category?')) return
    const res = await deleteCategory(tenantId, id)
    if(res.success) {
      setCategories(categories.filter(c => c.id !== id))
      toast.success('Category deleted')
      setShowCategoryModal(false)
    } else {
      toast.error(res.error || 'Failed to delete category')
    }
  }

  const handleImageUpload = (e: any, isEdit: boolean) => {
    const file = e.target.files[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if(isEdit) {
        setEditingItem({...editingItem, imageUrls: [...(editingItem.imageUrls || []), result]})
      } else {
        setNewItem({...newItem, imageUrls: [...(newItem.imageUrls || []), result]})
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Catalog</h2>
          <p className="section-desc">Manage products, categories, and item attributes</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => { setEditingCategory(null); setCategoryForm({name: '', slug: '', parentId: ''}); setShowCategoryModal(true) }}>
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
            {categories.length > 0 ? (
              <CategoryTree 
                categories={categories} 
                onEdit={(c) => { setEditingCategory(c); setCategoryForm({ name: c.name, slug: c.slug, parentId: c.parentId || '' }); setShowCategoryModal(true) }}
              />
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
                    onClick={() => setEditingItem(item)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
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
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Detailed product description..." className="form-textarea" rows={3} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Product Images</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {newItem.imageUrls?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto mt-2">
                        {newItem.imageUrls.map((url: string, idx: number) => (
                          <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                            <button onClick={() => setNewItem({...newItem, imageUrls: newItem.imageUrls.filter((_: any, i: number) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Edit Product</h3>
              <p className="text-sm text-slate-500">{editingItem.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Product Title *</label>
                  <input type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">SKU</label>
                  <input type="text" value={editingItem.sku || ''} onChange={e => setEditingItem({...editingItem, sku: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Base Price *</label>
                  <input type="number" value={editingItem.basePrice} onChange={e => setEditingItem({...editingItem, basePrice: e.target.value})} className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Category</label>
                  <select value={editingItem.categoryId || ''} onChange={e => setEditingItem({...editingItem, categoryId: e.target.value})} className="form-select">
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="form-textarea" rows={3} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Product Images</label>
                  <div className="flex flex-col gap-2">
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {editingItem.imageUrls?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto mt-2">
                        {editingItem.imageUrls.map((url: string, idx: number) => (
                          <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                            <button onClick={() => setEditingItem({...editingItem, imageUrls: editingItem.imageUrls.filter((_: any, i: number) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="edit-product-visible" checked={editingItem.isVisible} onChange={e => setEditingItem({...editingItem, isVisible: e.target.checked})} className="w-4 h-4 rounded text-indigo-600" />
                  <label htmlFor="edit-product-visible" className="text-sm text-slate-700">Visible in catalog</label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditingItem(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleUpdate} disabled={isSaving} className="btn btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Name *</label>
                <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} className="form-input" />
              </div>
              <div>
                <label className="form-label">Slug *</label>
                <input type="text" value={categoryForm.slug} onChange={e => setCategoryForm({...categoryForm, slug: e.target.value})} className="form-input" />
              </div>
              <div>
                <label className="form-label">Parent Category</label>
                <select value={categoryForm.parentId} onChange={e => setCategoryForm({...categoryForm, parentId: e.target.value})} className="form-select">
                  <option value="">None (Top Level)</option>
                  {categories.filter(c => c.id !== editingCategory?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSaveCategory} disabled={isSaving} className="btn btn-primary">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

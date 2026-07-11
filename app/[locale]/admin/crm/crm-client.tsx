'use client'

import { useState } from 'react'
import { Users2, Search, Mail, Phone, Tag, Plus, ChevronRight, Clock, ShoppingCart, MessageSquare, TrendingUp, X, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate, getInitials, stringToColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createCrmContact, updateCrmContact, deleteCrmContact, addTimelineEvent, sendTimelineWhatsApp } from '@/lib/actions/crm'

export function CrmClient({ tenantId, initialContacts, initialTimeline }: { tenantId: string, initialContacts: any[], initialTimeline: any[] }) {
  const [contacts, setContacts] = useState(initialContacts)
  const [selected, setSelected] = useState<any | null>(initialContacts[0] || null)
  const [search, setSearch] = useState('')
  
  // New Contact Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newContact, setNewContact] = useState<{firstName: string, lastName: string, email: string, phoneNumber: string, tags: string[]}>({ firstName: '', lastName: '', email: '', phoneNumber: '', tags: [] })
  const [isCreating, setIsCreating] = useState(false)

  // Edit / Tags State
  const [editingContact, setEditingContact] = useState<any | null>(null)
  const [tagInput, setTagInput] = useState('')
  
  // Timeline Composer State
  const [composerType, setComposerType] = useState<'note'|'call'|'whatsapp'>('note')
  const [composerText, setComposerText] = useState('')
  const [isSendingEvent, setIsSendingEvent] = useState(false)


  const handleCreate = async () => {
    if (!newContact.firstName || !newContact.email) {
      toast.error('First Name and Email are required')
      return
    }
    setIsCreating(true)
    const res = await createCrmContact(tenantId, newContact)
    setIsCreating(false)
    if (res.success) {
      toast.success('Contact created successfully')
      setContacts([res.contact, ...contacts])
      setIsModalOpen(false)
      setNewContact({ firstName: '', lastName: '', email: '', phoneNumber: '', tags: [] })
      setTagInput('')
      if (!selected) setSelected(res.contact)
    } else {
      toast.error(res.error || 'Failed to create contact')
    }
  }

  const handleUpdate = async () => {
    if (!editingContact?.firstName || !editingContact?.email) return toast.error('First Name and Email required')
    setIsCreating(true)
    const res = await updateCrmContact(tenantId, editingContact.id, editingContact)
    setIsCreating(false)
    if (res.success) {
      toast.success('Contact updated')
      setContacts(contacts.map(c => c.id === editingContact.id ? res.contact : c))
      if (selected?.id === editingContact.id) setSelected(res.contact)
      setEditingContact(null)
    } else toast.error(res.error)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return
    const res = await deleteCrmContact(tenantId, id)
    if (res.success) {
      toast.success('Contact deleted')
      setContacts(contacts.filter(c => c.id !== id))
      if (selected?.id === id) setSelected(null)
    } else toast.error(res.error)
  }

  const handleAddTag = async () => {
    if(!tagInput || !selected) return
    const currentTags = selected.tags || []
    if (currentTags.includes(tagInput)) return setTagInput('')
    const newTags = [...currentTags, tagInput]
    const res = await updateCrmContact(tenantId, selected.id, { tags: newTags })
    if(res.success) {
      setContacts(contacts.map(c => c.id === selected.id ? res.contact : c))
      setSelected(res.contact)
      setTagInput('')
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    if(!selected) return
    const newTags = (selected.tags || []).filter((t: string) => t !== tagToRemove)
    const res = await updateCrmContact(tenantId, selected.id, { tags: newTags })
    if(res.success) {
      setContacts(contacts.map(c => c.id === selected.id ? res.contact : c))
      setSelected(res.contact)
    }
  }

  const handleTimelineSubmit = async () => {
    if(!composerText || !selected) return
    setIsSendingEvent(true)
    
    let res
    if (composerType === 'whatsapp') {
      res = await sendTimelineWhatsApp(tenantId, selected.id, composerText)
    } else {
      res = await addTimelineEvent(tenantId, selected.id, composerType === 'note' ? 'note_added' : 'call_logged', {
        text: composerText
      })
    }
    
    setIsSendingEvent(false)
    if (res.success) {
      toast.success('Action recorded')
      setComposerText('')
      // Need to append to timeline (since we rely on initial prop, we could just reload page or artificially inject it)
      // For now we rely on a full refresh or just add it to a local timeline state if we had one.
      // We'll reload the page gracefully to get fresh timeline data
      window.location.reload()
    } else toast.error(res.error)
  }

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const contactTimeline = selected ? initialTimeline.filter(t => t.contactId === selected.id) : []

  const EVENT_ICONS: Record<string, React.ElementType> = {
    order_placed: ShoppingCart,
    login: Clock,
    form_submission: MessageSquare,
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">CRM — Customer Relationships</h2>
          <p className="section-desc">Contact directory and interaction timeline</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact list */}
        <div className="lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-9" id="crm-search" />
          </div>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {filtered.map(contact => {
              const initials = getInitials(`${contact.firstName} ${contact.lastName}`)
              const color = stringToColor(contact.email)
              return (
                <button
                  key={contact.id}
                  onClick={() => setSelected(contact)}
                  className={cn('w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors', selected?.id === contact.id ? 'bg-indigo-50' : 'hover:bg-slate-50')}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                    <span className="text-white text-xs font-bold">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{contact.firstName} {contact.lastName}</p>
                    <p className="text-xs text-slate-400 truncate">{contact.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-emerald-600">{formatCurrency(Number(contact.totalSpend) || 0)}</p>
                    <div className="flex flex-wrap gap-1 justify-end mt-0.5">
                      {(contact.tags as string[] || []).slice(0, 1).map(tag => (
                        <span key={tag} className="badge badge-info text-[9px]">{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-slate-500">No contacts found.</div>
            )}
          </div>
        </div>

        {/* Contact detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Contact header */}
              <div className="card p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: stringToColor(selected.email) }}
                  >
                    <span className="text-white text-xl font-bold">{getInitials(`${selected.firstName} ${selected.lastName}`)}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{selected.firstName} {selected.lastName}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                      <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{selected.email}</div>
                      {selected.phoneNumber && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selected.phoneNumber}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(selected.tags as string[] || []).map((tag: string) => <span key={tag} className="badge badge-info">{tag}</span>)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-700">{formatCurrency(Number(selected.totalSpend) || 0)}</p>
                    <p className="text-xs text-slate-400">Total Spend</p>
                    <div className="mt-3 flex flex-col gap-2">
                      <button onClick={() => setEditingContact(selected)} className="text-xs text-indigo-600 hover:underline">Edit Contact</button>
                      <button onClick={() => handleDelete(selected.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Manage Tags</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      placeholder="Add tag (e.g. vip, lead)"
                      className="form-input text-sm flex-1"
                      onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    />
                    <button onClick={handleAddTag} className="btn btn-secondary btn-sm"><Plus className="w-4 h-4"/></button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(selected.tags as string[] || []).map((tag: string) => (
                      <span key={tag} className="badge badge-info flex items-center gap-1 pr-1">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3 text-blue-700" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  {Object.entries((selected.customMetadata as Record<string, any>) || {}).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-slate-400 capitalize">{k.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-medium text-slate-700 capitalize">{String(v).replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-slate-400">Member Since</p>
                    <p className="text-sm font-medium text-slate-700">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Timeline Composer */}
              <div className="card p-5">
                <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-3">
                  <button onClick={() => setComposerType('note')} className={cn('text-sm font-medium pb-3 -mb-3 border-b-2', composerType === 'note' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500')}>Note</button>
                  <button onClick={() => setComposerType('call')} className={cn('text-sm font-medium pb-3 -mb-3 border-b-2', composerType === 'call' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500')}>Call</button>
                  <button onClick={() => setComposerType('whatsapp')} className={cn('text-sm font-medium pb-3 -mb-3 border-b-2', composerType === 'whatsapp' ? 'border-green-600 text-green-700' : 'border-transparent text-slate-500')}>WhatsApp</button>
                </div>
                <textarea 
                  value={composerText} 
                  onChange={e => setComposerText(e.target.value)} 
                  placeholder={composerType === 'whatsapp' ? "Type WhatsApp message..." : `Log a ${composerType}...`} 
                  className="form-textarea w-full"
                  rows={3} 
                />
                <div className="flex justify-end mt-3">
                  <button onClick={handleTimelineSubmit} disabled={isSendingEvent || !composerText} className={cn('btn', composerType === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'btn-primary')}>
                    {isSendingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {composerType === 'whatsapp' ? 'Send Message' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Interaction Timeline</h3>
                {contactTimeline.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No interactions recorded yet</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />
                    <div className="space-y-4 ml-8">
                      {contactTimeline.map(event => {
                        const Icon = EVENT_ICONS[event.eventType] || Clock
                        return (
                          <div key={event.id} className="relative">
                            <div className="absolute -left-[42px] w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                              <Icon className="w-3 h-3 text-slate-500" />
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-800 capitalize">{event.eventType.replace(/_/g, ' ')}</p>
                                <span className="badge badge-neutral text-[10px]">{event.sourceModule}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {event.eventPayload && Object.entries(event.eventPayload as Record<string, any>).map(([k, v]) => (
                                  <span key={k} className="mr-2">{k}: <strong>{String(v)}</strong></span>
                                ))}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(event.occurredAt, 'relative')}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <Users2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">New Contact</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" value={newContact.firstName} onChange={e => setNewContact({...newContact, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={newContact.lastName} onChange={e => setNewContact({...newContact, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" value={newContact.phoneNumber} onChange={e => setNewContact({...newContact, phoneNumber: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Tags (comma separated)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. vip, lead" 
                  value={tagInput} 
                  onChange={e => {
                    setTagInput(e.target.value)
                    setNewContact({ ...newContact, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })
                  }} 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={isCreating} className="btn btn-primary">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Contact
              </button>
            </div>
          </div>
        </div>
      )}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">Edit Contact</h3>
              <button onClick={() => setEditingContact(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" value={editingContact.firstName} onChange={e => setEditingContact({...editingContact, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <input type="text" className="form-input" value={editingContact.lastName} onChange={e => setEditingContact({...editingContact, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={editingContact.email} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" value={editingContact.phoneNumber || ''} onChange={e => setEditingContact({...editingContact, phoneNumber: e.target.value})} />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setEditingContact(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleUpdate} disabled={isCreating} className="btn btn-primary">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

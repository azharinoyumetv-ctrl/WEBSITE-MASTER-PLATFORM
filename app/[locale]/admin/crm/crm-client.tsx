'use client'

import { useState } from 'react'
import { Users2, Search, Mail, Phone, Tag, Plus, ChevronRight, Clock, ShoppingCart, MessageSquare, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate, getInitials, stringToColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export function CrmClient({ initialContacts, initialTimeline }: { initialContacts: any[], initialTimeline: any[] }) {
  const [contacts, setContacts] = useState(initialContacts)
  const [selected, setSelected] = useState<any | null>(initialContacts[0] || null)
  const [search, setSearch] = useState('')

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
        <button onClick={() => toast.success('Opening new contact form')} className="btn btn-primary">
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
    </div>
  )
}

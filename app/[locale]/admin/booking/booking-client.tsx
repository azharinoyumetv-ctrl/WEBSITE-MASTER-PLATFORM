'use client'

import { useState } from 'react'
import { CalendarCheck, Clock, User, CheckCircle2, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { formatDate, getStatusBadgeClass, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createBooking, updateBookingStatus } from '@/lib/actions/booking'

const HOURS = Array.from({ length: 10 }, (_, i) => `${i + 9}:00`)
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BookingClient({ initialBookings, initialResources, tenantId }: { initialBookings: any[], initialResources: any[], tenantId: string }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [selectedResource, setSelectedResource] = useState(initialResources[0] || null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [newBooking, setNewBooking] = useState({
    customerEmail: '',
    resourceId: initialResources[0]?.id || '',
    date: '',
    time: '',
    notes: ''
  })

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.bookingStatus === 'confirmed').length,
    pending: bookings.filter(b => b.bookingStatus === 'pending_payment').length,
    completed: bookings.filter(b => b.bookingStatus === 'completed').length,
  }

  const handleCreateBooking = async () => {
    if (!newBooking.resourceId || !newBooking.date || !newBooking.time) {
      toast.error('Resource, date, and time are required')
      return
    }

    const resource = initialResources.find(r => r.id === newBooking.resourceId)
    const startTime = new Date(`${newBooking.date}T${newBooking.time}:00Z`) // Or local time depending on requirements
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour default

    setIsSaving(true)
    const res = await createBooking(tenantId, {
      customerName: newBooking.customerEmail || 'Walk-in',
      resourceId: resource?.id,
      resourceName: resource?.resourceName,
      startTime,
      endTime,
    })
    setIsSaving(false)

    if (res.success) {
      setBookings([res.booking, ...bookings])
      setShowNewModal(false)
      toast.success('Booking created!')
    } else {
      toast.error(res.error || 'Failed to create booking')
    }
  }

  const handleCancelBooking = async (id: string) => {
    const res = await updateBookingStatus(tenantId, id, 'cancelled')
    if (res.success) {
      setBookings(prev => prev.map(bk => bk.id === id ? { ...bk, bookingStatus: 'cancelled' } : bk))
      toast.success('Booking cancelled')
    } else {
      toast.error(res.error || 'Failed to cancel booking')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">Booking & Scheduling</h2>
          <p className="section-desc">Manage appointments, resources, and availability</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn btn-primary" id="new-booking-btn">
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Bookings', value: stats.total, icon: CalendarCheck, color: 'bg-indigo-600' },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, color: 'bg-emerald-600' },
          { label: 'Pending Payment', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-blue-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <p className="stat-label">{s.label}</p>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.color)}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="stat-value">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Resources */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Resources</h3>
            <div className="space-y-2">
              {initialResources.map(res => (
                <button
                  key={res.id}
                  onClick={() => setSelectedResource(res)}
                  className={cn('w-full text-left p-3 rounded-xl border transition-all', selectedResource?.id === res.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50')}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm font-medium', selectedResource?.id === res.id ? 'text-indigo-700' : 'text-slate-800')}>{res.resourceName}</p>
                    <div className={cn('w-2 h-2 rounded-full', res.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Capacity: {res.capacityPerSlot} · Buffer: {res.bufferMinutes}min</p>
                </button>
              ))}
              {initialResources.length === 0 && <p className="text-sm text-slate-500">No resources defined.</p>}
            </div>
          </div>
        </div>

        {/* Calendar + Bookings */}
        <div className="lg:col-span-3 space-y-4">
          {/* Weekly grid */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Week View</h3>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded text-slate-400 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
                <button className="p-1.5 rounded text-slate-400 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 min-w-[600px]">
                <div className="text-[10px] text-slate-400 p-2" />
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 p-2 border-l border-slate-100">{d}</div>
                ))}
                {HOURS.map(hour => (
                  <div key={`row-${hour}`} className="contents">
                    <div className="text-[10px] text-slate-400 p-2 text-right border-t border-slate-100">{hour}</div>
                    {DAYS.map((d, di) => {
                      const hasBooking = bookings.some((b) => {
                        const h = new Date(b.startTime).getHours()
                        return parseInt(hour) === h && new Date(b.startTime).getDay() === (di + 1) % 7 // Basic check
                      })
                      return (
                        <div key={`${d}-${hour}`} className="border-l border-t border-slate-100 p-1 min-h-[40px]">
                          {hasBooking && (
                            <div className="bg-indigo-500 rounded text-white text-[9px] p-1 font-medium leading-tight truncate">
                              {bookings.find(b => new Date(b.startTime).getHours() === parseInt(hour))?.customerName}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking list */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming Bookings</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Resource</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{b.customerName}</span>
                      </div>
                    </td>
                    <td className="text-sm text-slate-600">{b.resourceName}</td>
                    <td>
                      <p className="text-xs font-medium text-slate-700">{formatDate(b.startTime)}</p>
                      <p className="text-xs text-slate-400">{new Date(b.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} — {new Date(b.endTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td><span className={`badge ${getStatusBadgeClass(b.bookingStatus)}`}>{b.bookingStatus.replace('_', ' ')}</span></td>
                    <td>
                      {b.bookingStatus !== 'completed' && b.bookingStatus !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
                          className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No bookings found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Booking Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Create Booking</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Customer Email</label>
                <input type="email" value={newBooking.customerEmail} onChange={e => setNewBooking({...newBooking, customerEmail: e.target.value})} className="form-input" placeholder="customer@email.com" />
              </div>
              <div><label className="form-label">Resource</label>
                <select value={newBooking.resourceId} onChange={e => setNewBooking({...newBooking, resourceId: e.target.value})} className="form-select">
                  {initialResources.filter(r => r.isActive).map(r => <option key={r.id} value={r.id}>{r.resourceName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="form-label">Date</label><input type="date" value={newBooking.date} onChange={e => setNewBooking({...newBooking, date: e.target.value})} className="form-input" /></div>
                <div><label className="form-label">Time</label><input type="time" value={newBooking.time} onChange={e => setNewBooking({...newBooking, time: e.target.value})} className="form-input" /></div>
              </div>
              <div><label className="form-label">Notes</label><textarea value={newBooking.notes} onChange={e => setNewBooking({...newBooking, notes: e.target.value})} className="form-textarea" rows={2} placeholder="Any special requirements..." /></div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowNewModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleCreateBooking} disabled={isSaving} className="btn btn-primary" id="confirm-booking-btn">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSaving ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

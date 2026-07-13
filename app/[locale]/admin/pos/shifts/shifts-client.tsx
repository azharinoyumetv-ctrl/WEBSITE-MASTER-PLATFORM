'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Monitor, ChevronLeft, ChevronRight, Plus, Loader2, X, Edit2, Trash2, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { getShifts, createShift, updateShift, deleteShift } from '@/lib/actions/shifts'

export function ShiftsClient({
  initialShifts,
  terminals,
  users,
  tenantId
}: {
  initialShifts: any[]
  terminals: any[]
  users: any[]
  tenantId: string
}) {
  const [shifts, setShifts] = useState(initialShifts)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedShift, setSelectedShift] = useState<any | null>(null)

  // Form State
  const [form, setForm] = useState({
    userId: '',
    terminalId: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    notes: ''
  })

  // Calculate start of the week (Monday)
  const startOfWeek = new Date(currentDate)
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  startOfWeek.setDate(diff)
  startOfWeek.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const refreshShifts = async () => {
    setIsRefreshing(true)
    const res = await getShifts(tenantId)
    setIsRefreshing(false)
    if (res.success && res.shifts) {
      setShifts(res.shifts)
    }
  }

  const handlePrevWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }

  const handleNextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }

  const handleOpenCreateModal = (terminalId: string, day: Date) => {
    setSelectedShift(null)
    const localDateString = day.toISOString().split('T')[0]
    setForm({
      userId: users[0]?.id || '',
      terminalId,
      date: localDateString,
      startTime: '09:00',
      endTime: '17:00',
      notes: ''
    })
    setIsModalOpen(true)
  }

  const handleSelectShift = (shift: any) => {
    setSelectedShift(shift)
    const localDateString = new Date(shift.startTime).toISOString().split('T')[0]
    setForm({
      userId: shift.userId,
      terminalId: shift.terminalId,
      date: localDateString,
      startTime: new Date(shift.startTime).toTimeString().slice(0, 5),
      endTime: new Date(shift.endTime).toTimeString().slice(0, 5),
      notes: shift.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.userId || !form.terminalId || !form.date) {
      toast.error('Please complete all required fields')
      return
    }

    const startISO = `${form.date}T${form.startTime}:00`
    const endISO = `${form.date}T${form.endTime}:00`

    if (new Date(startISO) >= new Date(endISO)) {
      toast.error('End time must be after start time')
      return
    }

    setIsSaving(true)
    let res
    if (selectedShift) {
      res = await updateShift(tenantId, selectedShift.id, {
        userId: form.userId,
        terminalId: form.terminalId,
        startTime: startISO,
        endTime: endISO,
        notes: form.notes
      })
    } else {
      res = await createShift(tenantId, {
        userId: form.userId,
        terminalId: form.terminalId,
        startTime: startISO,
        endTime: endISO,
        notes: form.notes
      })
    }
    setIsSaving(false)

    if (res.success) {
      toast.success(selectedShift ? 'Shift updated' : 'Shift scheduled')
      setIsModalOpen(false)
      refreshShifts()
    } else {
      toast.error(res.error || 'Failed to save shift')
    }
  }

  const handleDelete = async () => {
    if (!selectedShift) return
    if (!confirm('Are you sure you want to cancel this scheduled shift?')) return

    setIsSaving(true)
    const res = await deleteShift(tenantId, selectedShift.id)
    setIsSaving(false)

    if (res.success) {
      toast.success('Shift cancelled')
      setIsModalOpen(false)
      refreshShifts()
    } else {
      toast.error(res.error || 'Failed to delete shift')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Shift Scheduler
          </h2>
          <p className="section-desc">Plan, assign, and track employee shifts across terminals</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenCreateModal(terminals[0]?.id || '', new Date())} 
            disabled={terminals.length === 0}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-1" /> Schedule Shift
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevWeek} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-800">
            Week of {startOfWeek.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={handleNextWeek} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded"></span>
          <span>Assigned Terminal Shift</span>
        </div>
      </div>

      {/* Scheduler Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-left font-bold text-slate-700 text-sm border-r border-slate-200 w-48">Terminal</th>
                {days.map((day, idx) => (
                  <th key={idx} className="p-4 text-center border-r border-slate-200 last:border-r-0 min-w-[120px]">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {day.toLocaleDateString([], { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {day.getDate()}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {terminals.map(terminal => (
                <tr key={terminal.id} className="border-b border-slate-200 last:border-b-0">
                  <td className="p-4 font-semibold text-slate-800 text-sm border-r border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span>{terminal.terminalName}</span>
                    </div>
                  </td>
                  {days.map((day, idx) => {
                    const dayShifts = shifts.filter(s => 
                      s.terminalId === terminal.id &&
                      new Date(s.startTime).toDateString() === day.toDateString()
                    )
                    return (
                      <td key={idx} className="p-2 border-r border-slate-200 last:border-r-0 align-top min-h-[140px] hover:bg-slate-50/30">
                        <div className="flex flex-col gap-2 h-full min-h-[100px]">
                          {dayShifts.map(shift => (
                            <button 
                              key={shift.id} 
                              onClick={() => handleSelectShift(shift)}
                              className="text-left p-2 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition flex flex-col gap-1 shadow-sm"
                            >
                              <span className="text-xs font-bold text-indigo-900 truncate flex items-center gap-1">
                                <Users className="w-3 h-3 text-indigo-400" />
                                {shift.user ? `${shift.user.firstName || ''} ${shift.user.lastName || ''}` : 'Unassigned'}
                              </span>
                              <span className="text-[10px] text-indigo-600 font-medium font-mono flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-indigo-400" />
                                {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </button>
                          ))}
                          <button 
                            onClick={() => handleOpenCreateModal(terminal.id, day)}
                            className="mt-auto w-full py-1.5 text-center border border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 rounded-lg text-[10px] font-medium transition"
                          >
                            + Schedule
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {terminals.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No POS terminals configured. Please configure terminals first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900">
                {selectedShift ? 'Edit Shift Assignment' : 'Schedule Shift'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Employee / User</label>
                <select 
                  className="form-select" 
                  value={form.userId} 
                  onChange={e => setForm({...form, userId: e.target.value})}
                >
                  <option value="">Select Employee</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.firstName || ''} {u.lastName || ''} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Terminal</label>
                <select 
                  className="form-select" 
                  value={form.terminalId} 
                  onChange={e => setForm({...form, terminalId: e.target.value})}
                >
                  {terminals.map(t => (
                    <option key={t.id} value={t.id}>{t.terminalName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Start Time</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={form.startTime} 
                    onChange={e => setForm({...form, startTime: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={form.endTime} 
                    onChange={e => setForm({...form, endTime: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-input min-h-[80px]" 
                  placeholder="Additional instructions..."
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50">
              {selectedShift ? (
                <button onClick={handleDelete} className="btn btn-secondary border-red-200 text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </button>
              ) : (
                <div></div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {selectedShift ? 'Update' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Users, Plus, Search, Filter, Mail, MoreHorizontal,
  UserCheck, UserX, Clock, Crown, Shield, Eye, Trash2,
  RefreshCw, Send, Loader2, Download, Copy
} from 'lucide-react'
import { formatDate, getStatusBadgeClass, getInitials, stringToColor, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { inviteUser, toggleUserStatus } from '@/lib/actions/user'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function UsersClient({ initialUsers, initialRoles, tenantId }: { initialUsers: any[], initialRoles: any[], tenantId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(initialRoles.length > 0 ? initialRoles[0].id : '')
  const [isInviting, setIsInviting] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null)
  const [fallbackInvitationUrl, setFallbackInvitationUrl] = useState('')

  const updateFilters = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set(key, val)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handleExportCSV = () => {
    if (users.length === 0) {
      toast.error('No users to export')
      return
    }
    const headers = ['Name', 'Email', 'Roles', 'Status', 'Joined']
    let csvContent = headers.join(',') + '\n'
    users.forEach(u => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
      const joinedStr = new Date(u.createdAt).toLocaleDateString()
      csvContent += `"${name}","${u.email}","${(u.roles || []).join(';')}",${u.status},"${joinedStr}"\n`
    })
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'users_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Users list exported successfully')
  }

  const filtered = users.filter(u => {
    const matchesSearch =
      `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' || u.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending_verification').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }

  const handleSendInvite = async () => {
    if (!inviteEmail) { toast.error('Please enter an email'); return }
    setIsInviting(true)
    
    const res = await inviteUser(tenantId, inviteEmail, inviteRole)
    setIsInviting(false)
    if (res.success) {
      if ((res as any).delivery === 'copy_link') {
        setFallbackInvitationUrl((res as any).accessUrl)
        toast.success('Invitation created. Copy the secure link below.')
      } else {
        toast.success('Invitation email queued successfully')
      }
      setShowInviteModal(false)
      setInviteEmail('')
    } else {
      toast.error(res.error || 'Failed to send invite')
    }
  }

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    
    // Optimistic
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
    
    const res = await toggleUserStatus(tenantId, user.id, newStatus)
    if (res.success) {
      toast.success(`User ${newStatus === 'active' ? 'reactivated' : 'suspended'}`)
    } else {
      toast.error(res.error || 'Failed to update user')
      // Revert Optimistic
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: user.status } : u))
    }
  }

  return (
    <div className="page-container animate-slide-up">
      <div className="section-header">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-desc">Manage team members, roles, and access for this workspace</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn btn-primary focus:ring-2 focus:ring-indigo-500" id="invite-user-btn">
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'bg-indigo-600' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'bg-emerald-600' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-50' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.label}</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{s.value}</h3>
            </div>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                updateFilters('q', e.target.value)
              }}
              id="user-search"
              className="form-input pl-9 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              updateFilters('status', e.target.value)
            }}
            className="form-select sm:w-40 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            id="user-status-filter"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending_verification">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-1.5 focus:ring-2 focus:ring-indigo-500">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-slate-300 mb-2" />
                    <p>No users found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map((user) => {
              const nameStr = user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email
              const initials = getInitials(nameStr)
              const avatarColor = stringToColor(user.email)
              
              return (
                <tr key={user.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        <span className="text-white text-xs font-bold">{initials}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{nameStr}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {user.roles && user.roles.map((roleName: string) => (
                        <span key={roleName} className="text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          {roleName.toLowerCase().includes('admin') && <Crown className="w-3 h-3 text-amber-500" />}
                          {roleName}
                        </span>
                      ))}
                      {(!user.roles || user.roles.length === 0) && (
                        <span className="text-xs text-slate-400 italic">No roles</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                      {user.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-sm text-slate-500">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt, 'relative') : '—'}
                  </td>
                  <td className="text-sm text-slate-500">{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedProfile(user)} className="btn btn-ghost btn-sm text-xs" title="Quick View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <Link href={`/admin/users/${user.id}`} className="btn btn-ghost btn-sm text-xs">
                        Full Profile
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={cn('btn btn-sm', user.status === 'active' ? 'btn-ghost' : 'btn-success')}
                      >
                        {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Showing {filtered.length} of {users.length} users</p>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Invite Team Member</h3>
              <p className="text-sm text-slate-500 mt-0.5">Create a secure invitation for a teammate</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  id="invite-email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Assign Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="form-select"
                >
                  {initialRoles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                  {initialRoles.length === 0 && (
                    <option value="" disabled>No roles available</option>
                  )}
                </select>
              </div>
              <p className="text-xs text-slate-400">
                The one-time link expires in <strong>48 hours</strong>. It will be emailed when SMTP is configured; otherwise, you can copy it through an approved channel.
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowInviteModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSendInvite} disabled={isInviting || !inviteRole} className="btn btn-primary" id="send-invite-btn">
                {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {fallbackInvitationUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-modal animate-scale-in">
            <h3 className="text-lg font-semibold text-slate-900">Copy secure invitation link</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Email delivery is not configured for this workspace yet. Send this one-time link through your approved channel. It expires in 48 hours.</p>
            <input id="invite-access-url" readOnly value={fallbackInvitationUrl} className="form-input mt-5 font-mono text-xs" />
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setFallbackInvitationUrl('')} className="btn btn-secondary">Close</button>
              <button onClick={() => { navigator.clipboard.writeText(fallbackInvitationUrl); toast.success('Invitation link copied') }} className="btn btn-primary"><Copy className="w-4 h-4" /> Copy link</button>
            </div>
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold shadow-sm"
                style={{ backgroundColor: stringToColor(selectedProfile.email) }}
              >
                {getInitials(selectedProfile.firstName || selectedProfile.lastName ? `${selectedProfile.firstName || ''} ${selectedProfile.lastName || ''}`.trim() : selectedProfile.email)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedProfile.firstName || selectedProfile.lastName ? `${selectedProfile.firstName || ''} ${selectedProfile.lastName || ''}`.trim() : 'Unknown Name'}
                </h3>
                <p className="text-sm text-slate-500">{selectedProfile.email}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <span className={`badge ${getStatusBadgeClass(selectedProfile.status)}`}>
                    {selectedProfile.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-1">Joined</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(selectedProfile.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-slate-400 mb-2">Assigned Roles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.roles && selectedProfile.roles.length > 0 ? (
                    selectedProfile.roles.map((roleName: string) => (
                      <span key={roleName} className="text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1.5">
                        {roleName.toLowerCase().includes('admin') && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        {roleName}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 italic">No roles assigned</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Last Login</p>
                <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {selectedProfile.lastLoginAt ? formatDate(selectedProfile.lastLoginAt, 'long') : 'Never logged in'}
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedProfile(null)} className="btn btn-secondary w-full sm:w-auto">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import {
  Shield, Plus, Edit2, Trash2, Users, CheckCircle2, XCircle,
  Lock, Unlock, Info, ChevronDown, ChevronRight, Crown, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { createRole, updateRolePermissions } from '@/lib/actions/rbac'

const ALL_MODULES = ['catalog', 'inventory', 'users', 'rbac', 'orders', 'payments', 'pos', 'crm', 'booking', 'analytics', 'ai', 'notifications', 'pages', 'billing', 'modules']
const ALL_ACTIONS = ['read', 'write', 'delete', 'toggle']

const ACTION_COLORS: Record<string, string> = {
  read: 'bg-blue-100 text-blue-700 border-blue-200',
  write: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  delete: 'bg-red-100 text-red-700 border-red-200',
  toggle: 'bg-purple-100 text-purple-700 border-purple-200',
}

export function RbacClient({ initialRoles, tenantId }: { initialRoles: any[], tenantId: string }) {
  const [roles, setRoles] = useState(initialRoles)
  const [selectedRole, setSelectedRole] = useState(initialRoles.length > 0 ? initialRoles[0] : null)
  const [showNewRoleModal, setShowNewRoleModal] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string | null>('catalog')
  const [isSaving, setIsSaving] = useState(false)

  const [newRoleData, setNewRoleData] = useState({
    name: '',
    description: '',
    baseRoleId: ''
  })

  const togglePermission = (module: string, action: string) => {
    if (!selectedRole) return

    const currentPerms = (selectedRole.permissions as Record<string, string[]>)[module] || []
    const hasPermission = currentPerms.includes(action)
    const newPerms = hasPermission
      ? currentPerms.filter(a => a !== action)
      : [...currentPerms, action]

    const updatedRole = {
      ...selectedRole,
      permissions: { ...selectedRole.permissions, [module]: newPerms }
    }
    
    setSelectedRole(updatedRole)
    setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r))
  }

  const hasPermission = (module: string, action: string) => {
    if (!selectedRole) return false
    const perms = (selectedRole.permissions as Record<string, string[]>)[module] || []
    return perms.includes(action)
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    const res = await updateRolePermissions(tenantId, selectedRole.id, selectedRole.permissions)
    setIsSaving(false)
    if (res.success) {
      toast.success('Permissions saved')
    } else {
      toast.error(res.error || 'Failed to save permissions')
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleData.name) return toast.error('Role name is required')
    setIsSaving(true)
    const res = await createRole(tenantId, newRoleData)
    setIsSaving(false)

    if (res.success) {
      const newRole = { ...res.role, _count: { userRoles: 0 } }
      setRoles([...roles, newRole])
      setSelectedRole(newRole)
      setShowNewRoleModal(false)
      setNewRoleData({ name: '', description: '', baseRoleId: '' })
      toast.success('Role created successfully')
    } else {
      toast.error(res.error || 'Failed to create role')
    }
  }

  return (
    <div className="page-container animate-slide-up">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">Access Control (RBAC)</h2>
          <p className="section-desc">Define roles and manage granular permissions across all modules</p>
        </div>
        <button onClick={() => setShowNewRoleModal(true)} className="btn btn-primary" id="create-role-btn">
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Roles ({roles.length})</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {roles.map((role) => (
                <button
                  key={role.id}
                  id={`role-${role.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    'w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors',
                    selectedRole?.id === role.id
                      ? 'bg-indigo-50 border-r-2 border-indigo-600'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    selectedRole?.id === role.id ? 'bg-indigo-600' : 'bg-slate-100'
                  )}>
                    {role.name === 'Tenant Admin' ? (
                      <Crown className={cn('w-4 h-4', selectedRole?.id === role.id ? 'text-white' : 'text-slate-500')} />
                    ) : (
                      <Shield className={cn('w-4 h-4', selectedRole?.id === role.id ? 'text-white' : 'text-slate-400')} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', selectedRole?.id === role.id ? 'text-indigo-700' : 'text-slate-800')}>
                      {role.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{role.description || 'No description'}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Users className="w-3 h-3 text-slate-300" />
                      <span className="text-xs text-slate-400">{role._count?.userRoles || 0} users</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Permissions — <span className="text-indigo-600">{selectedRole.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedRole.description}</p>
                </div>
                <button
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="btn btn-primary btn-sm"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {ALL_MODULES.map((module) => {
                  const modulePerms = (selectedRole.permissions as Record<string, string[]>)[module] || []
                  const isExpanded = expandedModule === module
                  const hasAny = modulePerms.length > 0

                  return (
                    <div key={module}>
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedModule(isExpanded ? null : module)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          <span className="text-sm font-medium text-slate-800 capitalize">{module}</span>
                          {hasAny && (
                            <span className="badge badge-success text-[10px]">{modulePerms.length} permissions</span>
                          )}
                        </div>
                        {hasAny ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-200" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 bg-slate-50/50">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                            {ALL_ACTIONS.map((action) => {
                              const granted = hasPermission(module, action)
                              return (
                                <button
                                  key={action}
                                  id={`perm-${module}-${action}`}
                                  onClick={() => togglePermission(module, action)}
                                  className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                                    granted
                                      ? ACTION_COLORS[action]
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  )}
                                >
                                  {granted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                  <span className="capitalize">{action}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center">
              <Shield className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No Role Selected</h3>
              <p className="text-sm text-slate-500 mt-1">Select a role from the sidebar to view or edit permissions.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-md animate-scale-in">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold">Create New Role</h3>
              <p className="text-sm text-slate-500 mt-0.5">Define a new permission set for your team</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Role Name *</label>
                <input 
                  type="text" 
                  value={newRoleData.name}
                  onChange={(e) => setNewRoleData({ ...newRoleData, name: e.target.value })}
                  placeholder="e.g. Finance Manager" 
                  className="form-input" 
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea 
                  value={newRoleData.description}
                  onChange={(e) => setNewRoleData({ ...newRoleData, description: e.target.value })}
                  placeholder="What can this role do?" 
                  className="form-textarea" 
                  rows={3} 
                />
              </div>
              <div>
                <label className="form-label">Base template</label>
                <select 
                  value={newRoleData.baseRoleId}
                  onChange={(e) => setNewRoleData({ ...newRoleData, baseRoleId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Start from scratch</option>
                  {roles.map(r => <option key={r.id} value={r.id}>Clone from: {r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowNewRoleModal(false)} className="btn btn-secondary">Cancel</button>
              <button
                onClick={handleCreateRole}
                disabled={isSaving || !newRoleData.name}
                className="btn btn-primary"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {isSaving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

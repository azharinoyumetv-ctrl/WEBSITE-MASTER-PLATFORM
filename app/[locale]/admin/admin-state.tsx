import { AlertTriangle, Building2, ShieldX } from 'lucide-react'

type AdminStateKind = 'error' | 'restricted' | 'context'

const stateStyles: Record<AdminStateKind, { icon: typeof AlertTriangle; iconClass: string; panelClass: string }> = {
  error: {
    icon: AlertTriangle,
    iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    panelClass: 'border-rose-200/80 dark:border-rose-500/20',
  },
  restricted: {
    icon: ShieldX,
    iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    panelClass: 'border-amber-200/80 dark:border-amber-500/20',
  },
  context: {
    icon: Building2,
    iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    panelClass: 'border-sky-200/80 dark:border-sky-500/20',
  },
}

export function AdminState({
  kind = 'error',
  title,
  description,
}: {
  kind?: AdminStateKind
  title: string
  description: string
}) {
  const style = stateStyles[kind]
  const Icon = style.icon

  return (
    <div className="page-container animate-slide-up">
      <section
        className={`mx-auto max-w-2xl rounded-3xl border bg-white p-7 shadow-sm dark:bg-slate-900 ${style.panelClass}`}
        role={kind === 'error' ? 'alert' : 'status'}
      >
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.iconClass}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </section>
    </div>
  )
}

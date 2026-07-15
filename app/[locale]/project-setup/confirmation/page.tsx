import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ProjectSetupConfirmationPage({
  searchParams,
}: {
  searchParams: { orderId?: string; status?: string }
}) {
  const failed = searchParams.status === 'error'

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-24">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${failed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {failed ? '!' : '✓'}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {failed ? 'Payment needs attention' : 'Payment submitted'}
        </h1>
        <p className="mt-3 text-slate-600">
          {failed
            ? 'We could not confirm the payment return. Please contact support if you completed a payment.'
            : 'We are confirming your payment. We will email your order confirmation and receipt as soon as the payment provider notifies us.'}
        </p>
        {searchParams.orderId && (
          <p className="mt-4 text-sm text-slate-500">
            Reference: <span className="font-mono">{searchParams.orderId.slice(0, 8)}</span>
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders" className="btn btn-primary justify-center">Find my order</Link>
          <Link href="/site" className="btn btn-secondary justify-center">Back to site</Link>
        </div>
      </section>
    </main>
  )
}

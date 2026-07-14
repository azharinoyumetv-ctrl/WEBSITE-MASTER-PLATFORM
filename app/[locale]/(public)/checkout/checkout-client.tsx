'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ShoppingCart, CheckCircle, Package, ArrowRight, X, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { createOrder } from '@/lib/actions/ecommerce'
import { createDokuCheckout, createInvoice, createMidtransCheckout, getPaymentStatus } from '@/lib/actions/payments'

function CheckoutClientComponent({ tenantId, items, checkoutNonce, website }: { 
  tenantId: string, 
  items: any[], 
  checkoutNonce?: string,
  website: any
}) {
  const [cart, setCart] = useState<{item: any, quantity: number}[]>([])
  const [step, setStep] = useState(1)
  // Service-order contact fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentVerifyStatus, setPaymentVerifyStatus] = useState<'idle' | 'checking' | 'success' | 'failed' | 'cancelled' | 'timeout'>('idle')
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 15

  const searchParams = useSearchParams()

  useEffect(() => {
    const status = searchParams.get('status')
    const invoice = searchParams.get('invoice') || searchParams.get('orderId')
    
    if (status === 'success' && invoice) {
      setStep(3)
      setPaymentVerifyStatus('checking')
      setAttempts(0)
      
      let localAttempts = 0
      
      const checkStatus = async () => {
        try {
          const res = await getPaymentStatus(tenantId, invoice)
          if (res.success) {
            if (res.status === 'succeeded') {
              setPaymentVerifyStatus('success')
              return true
            } else if (res.status === 'failed') {
              setPaymentVerifyStatus('failed')
              setStep(5)
              return true
            } else if (res.status === 'cancelled') {
              setPaymentVerifyStatus('cancelled')
              setStep(4)
              return true
            }
          }
          return false
        } catch {
          return false
        }
      }

      checkStatus().then(done => {
        if (done) return
        
        const interval = setInterval(async () => {
          localAttempts++
          setAttempts(localAttempts)
          const done = await checkStatus()
          if (done || localAttempts >= maxAttempts) {
            clearInterval(interval)
            if (localAttempts >= maxAttempts && !done) {
              setPaymentVerifyStatus('timeout')
            }
          }
        }, 3000)
      })
    } else if (status === 'cancel') {
      setStep(4)
    } else if (status === 'error' || status === 'failed') {
      setStep(5)
    }
  }, [searchParams, tenantId])
  
  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id)
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { item, quantity: 1 }]
    })
    toast.success('Added to cart')
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(p => p.item.id !== id))
  }

  const total = cart.reduce((sum, {item, quantity}) => sum + (Number(item.basePrice) * quantity), 0)

  const handleCheckout = async () => {
    if (!name.trim()) return toast.error('Please enter your full name')
    if (!phone.trim()) return toast.error('Please enter your phone number')
    if (!email.trim()) return toast.error('Please enter your email address')
    if (cart.length === 0) return toast.error('Cart is empty')

    setIsProcessing(true)
    const res = await createOrder(tenantId, {
      email: email.trim(),
      name: name.trim(),
      phone: phone.trim(),
      companyName: companyName.trim() || undefined,
      notes: notes.trim() || undefined,
      items: cart.map(c => ({ id: c.item.id, quantity: c.quantity }))
    })
    
    if (res.success && res.order) {
      const order = res.order;
      try {
        const gateway = website.themeConfig?.paymentGateway || 'doku';
        
        if (gateway === 'doku' && website.dokuEnabled) {
          const checkoutRes = await createDokuCheckout(tenantId, order.id, total, 'IDR', { email })
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.paymentUrl!
          return
        }
        if (gateway === 'xendit' && website.xenditEnabled) {
          const checkoutRes = await createInvoice(tenantId, order.id, total, email)
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.invoiceUrl!
          return
        }
        if (gateway === 'midtrans' && website.midtransEnabled) {
          const checkoutRes = await createMidtransCheckout(tenantId, order.id, total, email)
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.redirectUrl!
          return
        }

        // Fallbacks if primary is not enabled or unset
        if (website.dokuEnabled) {
          const checkoutRes = await createDokuCheckout(tenantId, order.id, total, 'IDR', { email })
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.paymentUrl!
          return
        }
        if (website.xenditEnabled) {
          const checkoutRes = await createInvoice(tenantId, order.id, total, email)
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.invoiceUrl!
          return
        }
        if (website.midtransEnabled) {
          const checkoutRes = await createMidtransCheckout(tenantId, order.id, total, email)
          if (!checkoutRes.success) throw new Error(checkoutRes.error)
          window.location.href = checkoutRes.redirectUrl!
          return
        }

        // Show confirmation page if no payment gateways enabled
        setStep(3)
      } catch (err: any) {
        toast.error(err.message || 'Payment redirection failed')
      } finally {
        setIsProcessing(false)
      }
    } else {
      setIsProcessing(false)
      toast.error(res.error || 'Checkout failed')
    }
  }

  if (step === 3) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        {paymentVerifyStatus === 'checking' ? (
          <>
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-slate-500 mb-2">We are verifying your transaction. Attempt {attempts} of {maxAttempts}...</p>
            <p className="text-xs text-slate-400">Please do not close or refresh this page.</p>
          </>
        ) : paymentVerifyStatus === 'timeout' ? (
          <>
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold mb-2">Verification Taking Longer</h2>
            <p className="text-slate-500 mb-6">We haven't received confirmation from the payment provider yet. Your order may still process shortly.</p>
            <div className="space-y-3">
              <button onClick={() => window.location.reload()} className="btn btn-primary w-full">Check Again</button>
              <p className="text-xs text-slate-400 mt-4">Need help? Contact support at <span className="font-semibold text-slate-600">support@dagangos.com</span> with your transaction details.</p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
            <p className="text-slate-500 mb-6">We have received your payment and sent a receipt to {email || 'your email'}.</p>
            <button onClick={() => window.location.href = '/'} className="btn btn-primary">Return to Store</button>
          </>
        )}
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
        <h2 className="text-2xl font-bold mb-2">Payment Cancelled</h2>
        <p className="text-slate-500 mb-6">You cancelled the payment process. No charges were made.</p>
        <button onClick={() => setStep(2)} className="btn btn-primary w-full">Retry Payment</button>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto bg-white border border-slate-200">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">×</div>
        <h2 className="text-2xl font-bold mb-2 text-rose-600">Payment Failed</h2>
        <p className="text-slate-500 mb-6 font-medium">Your payment attempt failed. Please check your card balance or try a different channel.</p>
        <button onClick={() => setStep(2)} className="btn btn-primary w-full">Try Again</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Products */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-xl font-semibold mb-4">Available Products</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.filter(i => i.isVisible).map(item => (
            <div key={item.id} className="card p-4 flex flex-col">
              <div className="w-full h-40 bg-slate-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {item.imageUrls?.length > 0 ? (
                  <Image src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover" width={300} height={160} unoptimized />
                ) : (
                  <Package className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <h4 className="font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
              <p className="text-indigo-600 font-bold my-1">{formatCurrency(Number(item.basePrice))}</p>
              <div className="mt-auto pt-3">
                <button onClick={() => addToCart(item)} className="btn btn-secondary w-full">Add to Cart</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-6">
          <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5" />
            Your Cart
          </h3>
          
          {cart.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Your cart is empty</p>
          ) : (
            <div className="space-y-4 mb-6">
              {cart.map(({item, quantity}) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="text-slate-500">Qty: {quantity} &times; {formatCurrency(Number(item.basePrice))}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(Number(item.basePrice) * quantity)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {step === 1 ? (
            <button 
              onClick={() => setStep(2)} 
              disabled={cart.length === 0}
              className="btn btn-primary w-full"
            >
              Proceed to Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <div className="space-y-3 animate-scale-in">
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Details</p>

                <div>
                  <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Your full name" 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Phone Number <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="+62 812 3456 7890" 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Email Address <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="you@example.com" 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Company / Business Name <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={e => setCompanyName(e.target.value)} 
                    placeholder="PT. Your Company" 
                    className="form-input" 
                  />
                </div>

                <div>
                  <label className="form-label">Notes / Special Requests <span className="text-slate-400 font-normal text-xs">(optional)</span></label>
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Any special requirements or messages for our team..." 
                    rows={3}
                    className="form-input resize-none" 
                  />
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? 'Processing...' : `Pay ${formatCurrency(total)}`}
              </button>
              <button onClick={() => setStep(1)} className="btn btn-secondary w-full">Back to Cart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CheckoutClient(props: { tenantId: string, items: any[], checkoutNonce?: string, website: any }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="text-slate-500 animate-pulse">Loading checkout...</div>
      </div>
    }>
      <CheckoutClientComponent {...props} />
    </Suspense>
  )
}

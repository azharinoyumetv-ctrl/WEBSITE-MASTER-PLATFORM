import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInvoice = searchParams.get('invoice_number') || searchParams.get('order_id') || '';
    const invoiceNumber = rawInvoice.includes('_') ? rawInvoice.split('_')[0] : rawInvoice;
    
    // Redirect back to home or checkout page
    const host = req.headers.get('host') || 'store.dagangos.com';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    
    return NextResponse.redirect(`${protocol}://${host}/checkout?status=success&invoice=${invoiceNumber || ''}`);
  } catch (error) {
    console.error('Doku GET redirect handler error:', error);
    try {
      const url = new URL(req.url);
      return NextResponse.redirect(`${url.protocol}//${url.host}/checkout?status=error`);
    } catch {
      return NextResponse.redirect('https://store.dagangos.com/checkout?status=error');
    }
  }
}

export async function POST(req: Request) {
  try {
    const host = req.headers.get('host') || 'store.dagangos.com';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${protocol}://${host}/checkout?status=success`);
  } catch (error: any) {
    console.error('Doku webhook result handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

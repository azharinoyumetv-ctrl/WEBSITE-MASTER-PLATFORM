import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInvoice = searchParams.get('invoice_number') || searchParams.get('order_id') || '';
    const invoiceNumber = rawInvoice.includes('_') ? rawInvoice.split('_')[0] : rawInvoice;
    
    // Legacy DOKU result callbacks still point here. Preserve the order ID and
    // send the customer to the project-flow confirmation rather than the
    // catalog checkout, which is a different workflow.
    const host = req.headers.get('host') || 'store.dagangos.com';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    
    return NextResponse.redirect(`${protocol}://${host}/en/project-setup/confirmation?orderId=${encodeURIComponent(invoiceNumber)}`);
  } catch (error) {
    console.error('Doku GET redirect handler error:', error);
    try {
      const url = new URL(req.url);
      return NextResponse.redirect(`${url.protocol}//${url.host}/en/project-setup/confirmation?status=error`);
    } catch {
      return NextResponse.redirect('https://store.dagangos.com/en/project-setup/confirmation?status=error');
    }
  }
}

export async function POST(req: Request) {
  try {
    const host = req.headers.get('host') || 'store.dagangos.com';
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${protocol}://${host}/en/project-setup/confirmation`);
  } catch (error: any) {
    console.error('[webhook/doku/result] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

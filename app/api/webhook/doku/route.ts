import { handleDokuNotification } from '@/lib/actions/payments';
import { NextResponse } from 'next/server';

const MAX_DOKU_WEBHOOK_BYTES = 1024 * 1024

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type')?.toLowerCase() || ''
    if (!contentType.startsWith('application/json')) {
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 })
    }

    const rawLength = req.headers.get('content-length')
    const contentLength = rawLength ? Number.parseInt(rawLength, 10) : 0
    if (Number.isFinite(contentLength) && contentLength > MAX_DOKU_WEBHOOK_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    const { status, body } = await handleDokuNotification(req);
    return NextResponse.json(body, { status });
  } catch (error: any) {
    console.error('[webhook/doku] Handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

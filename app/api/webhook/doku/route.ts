import { handleDokuNotification } from '@/lib/actions/payments';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { status, body } = await handleDokuNotification(req);
    return NextResponse.json(body, { status });
  } catch (error: any) {
    console.error('[webhook/doku] Handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { handleDokuNotification } from '@/lib/actions/payments';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { status, body } = await handleDokuNotification(req);
    return NextResponse.json(body, { status });
  } catch (error: any) {
    console.error('Doku webhook handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

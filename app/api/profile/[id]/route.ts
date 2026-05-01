import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifySession } from '@/app/lib/session';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (session.userId !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  }

  const {
    password_hash: _password_hash,
    reset_token: _reset_token,
    reset_token_expires: _reset_token_expires,
    ...safeData
  } = data as Record<string, unknown>;

  return NextResponse.json(safeData);
}

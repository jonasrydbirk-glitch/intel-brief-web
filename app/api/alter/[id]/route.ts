import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { verifySession } from '@/app/lib/session';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ?? "placeholder",
  { auth: { persistSession: false } }
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('subscribers')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !profile) {
    return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  }

  if (profile.tweaks_used >= profile.tweaks_limit) {
    return NextResponse.json({ error: 'Tweak limit reached' }, { status: 403 });
  }

  const body = await request.json();

  const updates: Record<string, unknown> = {
    role: body.role ?? profile.role,
    segments: body.segments ?? profile.segments,
    regions: body.regions ?? profile.regions,
    focus: body.focus ?? profile.focus,
    company: body.company ?? profile.company,
    watchlist: body.watchlist ?? profile.watchlist,
    tweaks_used: profile.tweaks_used + 1,
  };

  const { error: updateError } = await supabaseAdmin
    .from('subscribers')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tweaks_used: profile.tweaks_used + 1,
    tweaks_limit: profile.tweaks_limit,
  });
}

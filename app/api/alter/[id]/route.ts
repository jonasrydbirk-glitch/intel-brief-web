import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: profile, error: fetchError } = await supabase
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

  const { error: updateError } = await supabase
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

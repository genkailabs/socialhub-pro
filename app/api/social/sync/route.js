import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBrandInstagramMetrics } from '@/lib/metrics-data';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brand_id');
  if (!brandId) return NextResponse.json({ success: false, error: 'brand_id obrigatório' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });

  const { data: brand } = await supabase.from('brands').select('id').eq('id', brandId).single();
  if (!brand) return NextResponse.json({ success: false, error: 'Marca inválida' }, { status: 403 });

  const result = await getBrandInstagramMetrics(brandId);
  if (!result) return NextResponse.json({ success: true, connected: false, networks: {} });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, connected: true, networks: { instagram: result.metrics } });
}

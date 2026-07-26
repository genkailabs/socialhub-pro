import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260726000100_paid_traffic.sql', 'utf8');
const selectionSql = fs.readFileSync('supabase/migrations/20260726000200_paid_traffic_account_selection.sql', 'utf8');

describe('schema de trafego pago', () => {
  it('protege as tabelas com RLS e as liga a marca', () => {
    for (const table of ['meta_ad_accounts', 'meta_ads_snapshots', 'meta_ads_tokens']) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('REFERENCES public.brands(id) ON DELETE CASCADE');
  });

  it('guarda token apenas na tabela sem policy de navegador', () => {
    const snapshots = sql.match(/CREATE TABLE IF NOT EXISTS public\.meta_ads_snapshots \(([\s\S]*?)\n\);/)?.[1] || '';
    expect(snapshots).not.toMatch(/access_token/i);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.meta_ads_tokens');
    expect(sql).toContain('ALTER TABLE public.meta_ads_tokens ENABLE ROW LEVEL SECURITY');
    expect(sql).not.toContain('CREATE POLICY "meta_ads_tokens');
  });

  it('guarda opcoes de conta temporarias no mesmo registro protegido', () => {
    expect(selectionSql).toContain('ADD COLUMN IF NOT EXISTS account_options JSONB');
    expect(selectionSql).toContain('ADD COLUMN IF NOT EXISTS selected_meta_account_id TEXT');
  });
});

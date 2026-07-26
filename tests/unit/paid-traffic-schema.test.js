import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/migrations/20260726000100_paid_traffic.sql', 'utf8');

describe('schema de trafego pago', () => {
  it('protege as tabelas com RLS e as liga a marca', () => {
    for (const table of ['meta_ad_accounts', 'meta_ads_snapshots', 'meta_ads_operations']) {
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('REFERENCES public.brands(id) ON DELETE CASCADE');
  });

  it('nao guarda token em dados de leitura ou auditoria', () => {
    expect(sql).not.toMatch(/CREATE TABLE[^;]*meta_ads_snapshots[\s\S]*?access_token/i);
    expect(sql).not.toMatch(/CREATE TABLE[^;]*meta_ads_operations[\s\S]*?access_token/i);
  });
});

'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_COOKIE, validateBrandName, slugHandle } from '@/lib/brands';

const COOKIE_OPTS = { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' };

export async function createBrand(formData) {
  let name;
  try {
    name = validateBrandName(formData.get('name'));
  } catch (e) {
    return { error: e.message };
  }
  const category = String(formData.get('category') || 'Geral');
  const color = String(formData.get('color') || '#6366F1');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' };

  const { data, error } = await supabase
    .from('brands')
    .insert({ user_id: user.id, name, handle: slugHandle(name), category, color })
    .select('id')
    .single();

  if (error) return { error: `Não foi possível criar a marca: ${error.message}` };

  const store = await cookies();
  store.set(ACTIVE_COOKIE, data.id, COOKIE_OPTS);
  revalidatePath('/', 'layout');
  return { ok: true, id: data.id };
}

export async function switchBrand(id) {
  const store = await cookies();
  store.set(ACTIVE_COOKIE, id, COOKIE_OPTS);
  revalidatePath('/', 'layout');
}

export async function deleteBrand(id) {
  const supabase = await createClient();
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) return { error: error.message };

  const store = await cookies();
  if (store.get(ACTIVE_COOKIE)?.value === id) store.delete(ACTIVE_COOKIE);
  revalidatePath('/', 'layout');
  return { ok: true };
}

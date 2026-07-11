-- Permite que usuários autenticados subam/leiam objetos no bucket público `media`.
-- (O bucket já existe e é público; faltava policy de INSERT para a sessão do usuário,
--  já que o app novo não usa service role.)

-- Garante bucket público (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "media authenticated upload" ON storage.objects;
CREATE POLICY "media authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'media');

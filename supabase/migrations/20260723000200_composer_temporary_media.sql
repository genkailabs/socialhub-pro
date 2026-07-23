-- Permite que o Composer remova somente arquivos temporários da marca do usuário.
-- O service role usado pelo publicador/cron continua ignorando RLS.

DROP POLICY IF EXISTS "composer temporary media delete" ON storage.objects;
CREATE POLICY "composer temporary media delete"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'temp'
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id::text = (storage.foldername(name))[2]
        AND b.user_id = auth.uid()
    )
  );

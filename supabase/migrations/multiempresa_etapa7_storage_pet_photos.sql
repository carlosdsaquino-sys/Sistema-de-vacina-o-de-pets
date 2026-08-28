-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 7
-- STORAGE: FOTOS DOS PETS
-- =========================================================

-- Remove as policies antigas, que permitiam que qualquer
-- usuário autenticado alterasse qualquer arquivo do bucket.

DROP POLICY IF EXISTS
  authenticated_upload_pet_photos
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_update_pet_photos
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_delete_pet_photos
ON storage.objects;


-- =========================================================
-- UPLOAD
-- =========================================================
--
-- O primeiro diretório do arquivo precisa ser exatamente
-- o organization_id do usuário logado.
--
-- Ex:
-- 32916685-.../PET_ID/foto.jpg
-- =========================================================

CREATE POLICY pet_photos_organization_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================

CREATE POLICY pet_photos_organization_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- EXCLUSÃO
-- =========================================================

CREATE POLICY pet_photos_organization_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);
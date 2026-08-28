-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 8
-- STORAGE: LOGO / ARQUIVOS DA EMPRESA
-- =========================================================

-- Remove as policies antigas, que permitiam qualquer
-- usuário autenticado mexer em qualquer arquivo do bucket.

DROP POLICY IF EXISTS
  authenticated_upload_company_assets
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_update_company_assets
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_delete_company_assets
ON storage.objects;


-- =========================================================
-- UPLOAD
-- =========================================================
--
-- Caminho esperado:
--
-- organization_id/logo/logo-arquivo.png
--
-- =========================================================

CREATE POLICY company_assets_organization_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================

CREATE POLICY company_assets_organization_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- EXCLUSÃO
-- =========================================================

CREATE POLICY company_assets_organization_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);
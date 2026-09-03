CREATE POLICY "pop_source_documents_no_client_select" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id <> 'pop-source-documents' AND false);
CREATE POLICY "pop_source_documents_no_client_insert" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "pop_source_documents_no_client_update" ON storage.objects FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "pop_source_documents_no_client_delete" ON storage.objects FOR DELETE TO authenticated, anon USING (false);
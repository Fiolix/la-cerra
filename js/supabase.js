let createClient;
try {
  ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
} catch (e1) {
  console.warn('⚠️ jsDelivr down, Fallback auf esm.sh:', e1);
  ({ createClient } = await import('https://esm.sh/@supabase/supabase-js@2'));
}

export const supabase = createClient(
  'https://ymeumqnmcumgqlffwwjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltZXVtcW5tY3VtZ3FsZmZ3d2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTAyMTEsImV4cCI6MjA2NjYyNjIxMX0.wOCjVUegJsBS8t11yXkgrN-I41wJlOreJ3feUtVaMxs'
);

console.log('✅ Supabase SDK geladen & Client erstellt');
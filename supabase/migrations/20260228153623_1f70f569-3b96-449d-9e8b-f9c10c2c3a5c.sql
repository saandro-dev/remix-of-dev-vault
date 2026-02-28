
-- vault_knowledge_gaps: tracks bugs/gaps reported by AI agents
CREATE TABLE public.vault_knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'promoted_to_module')),
  error_message TEXT NOT NULL,
  context TEXT,
  domain TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  hit_count INTEGER NOT NULL DEFAULT 1,
  resolution TEXT,
  resolution_code TEXT,
  promoted_module_id UUID REFERENCES public.vault_modules(id),
  reported_by UUID,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_knowledge_gaps_status ON public.vault_knowledge_gaps(status);
CREATE INDEX idx_knowledge_gaps_error_msg ON public.vault_knowledge_gaps USING gin(to_tsvector('english', error_message));
CREATE INDEX idx_knowledge_gaps_reported_by ON public.vault_knowledge_gaps(reported_by);

-- RLS
ALTER TABLE public.vault_knowledge_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on vault_knowledge_gaps"
  ON public.vault_knowledge_gaps FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin can view all knowledge gaps"
  ON public.vault_knowledge_gaps FOR SELECT
  TO authenticated
  USING (is_admin_or_owner(auth.uid()));

CREATE POLICY "Users can view own reported gaps"
  ON public.vault_knowledge_gaps FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "Users can update own reported gaps"
  ON public.vault_knowledge_gaps FOR UPDATE
  TO authenticated
  USING (reported_by = auth.uid())
  WITH CHECK (reported_by = auth.uid());

-- updated_at trigger
CREATE TRIGGER update_vault_knowledge_gaps_updated_at
  BEFORE UPDATE ON public.vault_knowledge_gaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

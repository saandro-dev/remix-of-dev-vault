
-- Create key_folders table
CREATE TABLE public.key_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6B7280',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- RLS policy
CREATE POLICY "Users can CRUD own key_folders"
  ON public.key_folders
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE TRIGGER update_key_folders_updated_at
  BEFORE UPDATE ON public.key_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add folder_id to api_keys
ALTER TABLE public.api_keys
  ADD COLUMN folder_id uuid REFERENCES public.key_folders(id) ON DELETE CASCADE;

-- Fix 3 Portuguese why_it_matters
UPDATE vault_modules SET why_it_matters = 'Using a single ALL policy for everything is an anti-pattern. If you want users to read other users'' data (e.g. public modules) but not edit them, you need separate policies. Additionally, without an explicit service_role policy, your Edge Functions may be blocked by RLS.' WHERE id = '2dd64f55-d229-4cac-a09a-e85a569d1223';

UPDATE vault_modules SET why_it_matters = 'If all Edge Functions use the same secret key and a webhook function is compromised, the attacker has access to everything. With Multi-Key Domain Isolation, each functional domain has its own key — compromising the webhook key does not grant access to admin operations.' WHERE id = '8075cfbd-1427-4fd0-8782-c3b1703f364a';

UPDATE vault_modules SET why_it_matters = 'Supabase Vault uses AES-256-GCM to encrypt data at rest. Using a direct INSERT into vault.secrets fails with permission denied — the only correct method is via vault.create_secret(). This ensures that even a DBA with database access cannot read the data without the encryption key.' WHERE id = '1d4626eb-50ef-4f68-9b73-089201b02963';

-- Add code_example for 8 modules

UPDATE vault_modules SET code_example = '-- Check all tables created by this schema
SELECT table_name FROM information_schema.tables
WHERE table_schema = ''public''
  AND table_name LIKE ''whatsapp_%''
ORDER BY table_name;

-- Insert a new WhatsApp instance
INSERT INTO public.whatsapp_instances (vendor_id, instance_name, evolution_instance_id, status)
VALUES (auth.uid(), ''my-store'', ''evo_abc123'', ''disconnected'');

-- Create a message template
INSERT INTO public.whatsapp_templates (vendor_id, name, trigger_event, body_template)
VALUES (
  auth.uid(),
  ''order-confirmed'',
  ''order_paid'',
  ''Hi {{customer_name}}, your order #{{order_id}} has been confirmed!''
);' WHERE id = 'aed2617b-6183-4da8-b432-28b8ee22f291';

UPDATE vault_modules SET code_example = '// Evolution API sends webhooks to this endpoint:
// POST /functions/v1/whatsapp-status-webhook?token=YOUR_SECRET

// Example CONNECTION_UPDATE payload:
const payload = {
  event: "CONNECTION_UPDATE",
  instance: "my-store",
  data: { state: "open", statusReason: 200 },
};

// The function updates whatsapp_instances status automatically.
// No client-side code needed — this is a server-to-server webhook.' WHERE id = 'f612457b-e0a2-4b4b-a90e-3ed89e1a184d';

UPDATE vault_modules SET code_example = 'import { createEvolutionClient } from "./_shared/whatsapp/evolution-client";

const evo = createEvolutionClient({
  baseUrl: Deno.env.get("EVOLUTION_API_URL")!,
  apiKey: Deno.env.get("EVOLUTION_API_KEY")!,
});

// Send a text message
await evo.sendText("my-instance", {
  number: "5511999998888",
  text: "Hello from DevVault!",
});

// Check instance status
const status = await evo.getInstanceStatus("my-instance");
console.log(status.state); // "open" | "close" | "connecting"' WHERE id = '03968b5a-7db0-42f2-8f03-85b1eeca44bf';

UPDATE vault_modules SET code_example = 'import type {
  WhatsAppInstance,
  WhatsAppTemplate,
  EvolutionWebhookPayload,
  TemplateVariables,
} from "./_shared/whatsapp/types";

// Type-safe instance creation
const instance: WhatsAppInstance = {
  id: crypto.randomUUID(),
  vendor_id: userId,
  instance_name: "my-store",
  evolution_instance_id: "evo_abc",
  status: "disconnected",
};

// Type-safe webhook payload handling
function handleWebhook(payload: EvolutionWebhookPayload) {
  if (payload.event === "CONNECTION_UPDATE") {
    console.log("Instance " + payload.instance + " is now " + payload.data.state);
  }
}' WHERE id = 'e138bb68-c16e-4732-8793-73b8d7c4c9c6';

UPDATE vault_modules SET code_example = 'import { renderTemplate } from "./_shared/whatsapp/template-renderer";

const template = "Hi {{customer_name}}, order #{{order_id}} total: {{total}}";

const rendered = renderTemplate(template, {
  customer_name: "João Silva",
  order_id: "ORD-1234",
  total: "R$ 149,90",
});

// Result: "Hi João Silva, order #ORD-1234 total: R$ 149,90"
console.log(rendered);' WHERE id = '8135a5df-0b10-4c57-8b7e-13cbd4f3d214';

UPDATE vault_modules SET code_example = 'import { createDispatcher } from "./_shared/whatsapp/dispatcher";

const dispatcher = createDispatcher({
  evolutionClient: evoClient,
  supabase: supabaseClient,
  logger: createLogger("dispatcher"),
});

// Dispatch messages for an order event
const result = await dispatcher.dispatch({
  event: "order_paid",
  orderId: "ORD-1234",
  vendorId: "uuid-vendor",
  customerPhone: "5511999998888",
  variables: {
    customer_name: "João Silva",
    order_id: "ORD-1234",
    total: "R$ 149,90",
  },
});

console.log("Sent " + result.messagesSent + " messages");' WHERE id = 'e691051a-cd8b-46a3-a292-ce4a1b319b5c';

UPDATE vault_modules SET code_example = 'import {
  useWhatsAppInstances,
  useWhatsAppTemplates,
  useCreateTemplate,
} from "@/modules/whatsapp/hooks";

function WhatsAppDashboard() {
  const { data: instances } = useWhatsAppInstances();
  const { data: templates } = useWhatsAppTemplates();
  const createTemplate = useCreateTemplate();

  const handleCreate = () => {
    createTemplate.mutate({
      name: "welcome",
      trigger_event: "order_created",
      body_template: "Welcome {{customer_name}}!",
    });
  };

  return (
    <div>
      <h2>Instances: {instances?.length ?? 0}</h2>
      <button onClick={handleCreate}>New Template</button>
    </div>
  );
}' WHERE id = 'ebae6291-f016-40d3-9b4a-79b5f8b37ccb';

UPDATE vault_modules SET code_example = 'import requests

BASE_URL = "https://bskfnthwewhpfrldbhqx.supabase.co/functions/v1"
HEADERS = {
    "X-DevVault-Key": "dvlt_YOUR_KEY_HERE",
    "Content-Type": "application/json",
}

# Bootstrap: get all domains and top modules
resp = requests.post(f"{BASE_URL}/vault-query", headers=HEADERS,
    json={"action": "bootstrap"})
print(resp.json()["data"]["domains"])

# Search modules
resp = requests.post(f"{BASE_URL}/vault-query", headers=HEADERS,
    json={"action": "search", "query": "rate limiting", "domain": "security"})
print(resp.json()["data"]["modules"])

# Ingest a new module
resp = requests.post(f"{BASE_URL}/vault-ingest", headers=HEADERS,
    json={
        "title": "My New Module",
        "code": "export const hello = () => console.log(''hello'');",
        "language": "typescript",
        "domain": "frontend",
    })
print(resp.json())' WHERE id = 'd0b6fbe8-b09c-4c2e-a1be-0faad516819a';

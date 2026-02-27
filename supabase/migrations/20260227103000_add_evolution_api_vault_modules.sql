--- Inserção de Módulos do Vault para a Integração com a Evolution API ---

-- Este arquivo de migração insere 7 módulos detalhados sobre como integrar
-- com a Evolution API para envio de mensagens via WhatsApp. O conteúdo foi
-- extraído e adaptado do projeto validado 'risecheckout'.

-- O user_id '32d5c933-94b0-4b8d-a855-f00b3d2f1193' foi identificado como o proprietário
-- dos módulos existentes e será usado para manter a consistência.

DO $$
DECLARE
  v_user_id UUID := '32d5c933-94b0-4b8d-a855-f00b3d2f1193';
BEGIN

-- Módulo 1: Evolution API v2 Client (TypeScript)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Evolution API v2 Client (TypeScript)',
  'Cliente HTTP tipado para a Evolution API v2, escrito em TypeScript para Deno. Abstrai a comunicação com a API, tratando de autenticação, timeouts e erros. Fornece métodos para gerenciar instâncias (criar, deletar, conectar, desconectar) e enviar mensagens (texto e mídia).',
  'backend',
  'code_snippet',
  'typescript',
  ARRAY['evolution-api', 'whatsapp', 'api-client', 'deno'],
  'global',
  'validated',
  'risecheckout',
  $$
/**
 * ============================================================================
 * Evolution API v2 Client
 * ============================================================================
 *
 * Typed HTTP client for Evolution API v2.
 * All calls use fetchWithTimeout from _shared/http/ for reliability.
 *
 * @module _shared/whatsapp/evolution-client
 * @version 1.0.0 - RISE Protocol V3
 * ============================================================================*/

import { createLogger } from "../logger.ts";
import { fetchWithTimeout } from "../http/fetch-utils.ts";
import type {
  EvolutionCreateInstanceRequest,
  EvolutionCreateInstanceResponse,
  EvolutionConnectionStateResponse,
  EvolutionQrCodeResponse,
  EvolutionSendTextRequest,
  EvolutionSendMediaRequest,
  EvolutionSendResponse,
} from "./types.ts";

const log = createLogger("EvolutionClient");

export interface EvolutionClient {
  createInstance(name: string, webhookUrl: string): Promise<EvolutionCreateInstanceResponse>;
  deleteInstance(name: string): Promise<void>;
  getConnectionState(name: string): Promise<EvolutionConnectionStateResponse>;
  connectInstance(name: string): Promise<EvolutionQrCodeResponse>;
  disconnectInstance(name: string): Promise<void>;
  sendText(instanceName: string, number: string, text: string): Promise<EvolutionSendResponse>;
  sendMedia(instanceName: string, number: string, mediaUrl: string, caption: string, mediaType: string): Promise<EvolutionSendResponse>;
}

export function createEvolutionClient(baseUrl: string, globalApiKey: string): EvolutionClient {
  const normalizedUrl = baseUrl.replace(/\/+$/, "");

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${normalizedUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: globalApiKey,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetchWithTimeout(url, options, 15000);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Evolution API ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }

    return {} as T;
  }

  return {
    async createInstance(name: string, webhookUrl: string): Promise<EvolutionCreateInstanceResponse> {
      const payload: EvolutionCreateInstanceRequest = {
        instanceName: name,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
        },
      };
      return request<EvolutionCreateInstanceResponse>("POST", "/instance/create", payload);
    },
    async deleteInstance(name: string): Promise<void> {
      await request<unknown>("DELETE", `/instance/delete/${name}`);
    },
    async getConnectionState(name: string): Promise<EvolutionConnectionStateResponse> {
      return request<EvolutionConnectionStateResponse>("GET", `/instance/connectionState/${name}`);
    },
    async connectInstance(name: string): Promise<EvolutionQrCodeResponse> {
      return request<EvolutionQrCodeResponse>("GET", `/instance/connect/${name}`);
    },
    async disconnectInstance(name: string): Promise<void> {
      await request<unknown>("DELETE", `/instance/logout/${name}`);
    },
    async sendText(instanceName: string, number: string, text: string): Promise<EvolutionSendResponse> {
      const payload: EvolutionSendTextRequest = { number, text };
      return request<EvolutionSendResponse>("POST", `/message/sendText/${instanceName}`, payload);
    },
    async sendMedia(instanceName: string, number: string, mediaUrl: string, caption: string, mediaType: string): Promise<EvolutionSendResponse> {
      const payload: EvolutionSendMediaRequest = {
        number,
        media: mediaUrl,
        caption,
        mediatype: mediaType,
      };
      return request<EvolutionSendResponse>("POST", `/message/sendMedia/${instanceName}`, payload);
    },
  };
}
  $$,
  $$
### Contexto
Este cliente é a base para toda a interação com a Evolution API. Ele é projetado para ser usado em um ambiente Deno (como as Edge Functions do Supabase) e depende de um helper `fetchWithTimeout` para evitar que as requisições fiquem presas indefinidamente.

### Como Usar
1.  **Importe** a função `createEvolutionClient` e os tipos necessários.
2.  **Instancie** o cliente fornecendo a URL base da sua instância da Evolution API e a chave de API global.
3.  **Chame** os métodos do cliente para interagir com a API.

```typescript
import { createEvolutionClient } from './evolution-client.ts';

const evoClient = createEvolutionClient(
  Deno.env.get("EVOLUTION_API_URL")!,
  Deno.env.get("EVOLUTION_API_GLOBAL_KEY")!
);

// Exemplo: Conectar uma instância e obter o QR Code
const qrCodeData = await evoClient.connectInstance("minha-instancia");
console.log(qrCodeData.base64);

// Exemplo: Enviar uma mensagem de texto
await evoClient.sendText("minha-instancia", "5511999998888", "Olá, mundo!");
```

### Dependências
- `logger.ts`: Um helper de logging (pode ser substituído por `console.log`).
- `http/fetch-utils.ts`: Fornece `fetchWithTimeout`.
- `types.ts`: Contém todas as definições de tipo para as requisições e respostas da API.
  $$
);

-- Módulo 2: Tipos da Integração WhatsApp/Evolution (TypeScript)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Tipos da Integração WhatsApp/Evolution (TypeScript)',
  'Coleção completa de tipos TypeScript para a integração com a Evolution API. Inclui entidades do banco de dados (Instance, Template, Automation, Log), tipos de requisição/resposta da API Evolution e tipos para o dispatcher de mensagens e webhooks.',
  'backend',
  'code_snippet',
  'typescript',
  ARRAY['evolution-api', 'whatsapp', 'types', 'typescript'],
  'global',
  'validated',
  'risecheckout',
  $$
export interface WhatsAppInstance {
  id: string;
  vendor_id: string;
  instance_name: string;
  instance_id: string | null;
  phone_number: string | null;
  status: InstanceStatus;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export type InstanceStatus = "disconnected" | "connecting" | "open" | "close";

export interface WhatsAppTemplate {
  id: string;
  vendor_id: string;
  name: string;
  body: string;
  media_url: string | null;
  media_type: MediaType;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type MediaType = "text" | "image" | "video" | "document";

export interface WhatsAppAutomation {
  id: string;
  vendor_id: string;
  instance_id: string;
  template_id: string;
  event_type: WhatsAppEventType;
  product_id: string | null;
  active: boolean;
  delay_seconds: number;
  created_at: string;
  updated_at: string;
}

export type WhatsAppEventType =
  | "purchase_approved"
  | "pix_generated"
  | "purchase_refunded"
  | "abandoned_checkout";

export interface WhatsAppMessageLog {
  id: string;
  automation_id: string | null;
  instance_id: string | null;
  vendor_id: string;
  order_id: string | null;
  recipient_phone: string;
  template_name: string;
  rendered_body: string;
  status: MessageStatus;
  error_message: string | null;
  evolution_message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

export interface EvolutionCreateInstanceRequest {
  instanceName: string;
  qrcode: boolean;
  integration: string;
  webhook: {
    url: string;
    byEvents: boolean;
    base64: boolean;
    events: string[];
  };
}

export interface EvolutionCreateInstanceResponse {
  instance: { instanceName: string; instanceId: string; status: string; };
  hash: Record<string, string>;
  qrcode?: { base64: string; };
}

export interface EvolutionConnectionStateResponse {
  instance: { instanceName: string; state: string; };
}

export interface EvolutionQrCodeResponse {
  base64: string;
  code: string;
}

export interface EvolutionSendTextRequest {
  number: string;
  text: string;
}

export interface EvolutionSendMediaRequest {
  number: string;
  media: string;
  caption?: string;
  mediatype: string;
}

export interface EvolutionSendResponse {
  key: { remoteJid: string; fromMe: boolean; id: string; };
  message: Record<string, unknown>;
  messageTimestamp: string;
  status: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
}

export interface EvolutionConnectionUpdate {
  state: string;
  statusReason?: number;
}

export interface EvolutionQrCodeUpdate {
  base64: string;
  code: string;
}

export interface DispatchRequest {
  order_id: string;
  event_type: WhatsAppEventType;
  vendor_id: string;
}

export interface DispatchResult {
  total_sent: number;
  total_failed: number;
  results: SingleSendResult[];
}

export interface SingleSendResult {
  automation_id: string;
  template_name: string;
  recipient: string;
  success: boolean;
  error?: string;
  evolution_message_id?: string;
}

export interface TemplateVariables {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  product_name?: string;
  amount?: string;
  pix_code?: string;
  order_id?: string;
  payment_method?: string;
}
  $$,
  $$
### Contexto
Manter tipos consistentes entre o banco de dados, as Edge Functions (backend) e o frontend é crucial para a robustez do sistema. Este arquivo centraliza todas as definições de tipo relacionadas à integração com o WhatsApp, servindo como uma "única fonte da verdade".

### Como Usar
Importe os tipos necessários em qualquer arquivo TypeScript para garantir a segurança de tipo e o autocompletar do editor. Isso evita erros comuns de digitação e inconsistências de dados entre as diferentes partes do sistema.

```typescript
import type { WhatsAppInstance, EvolutionSendResponse } from './types.ts';

function processInstance(instance: WhatsAppInstance) {
  // ...
}
```
  $$
);

-- Módulo 3: Schema do Banco de Dados para WhatsApp (SQL)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Schema do Banco de Dados para WhatsApp (SQL)',
  'Migração SQL completa para criar as tabelas, tipos, índices e políticas de RLS necessários para o sistema de automação de WhatsApp. Inclui tabelas para instâncias, templates, automações e logs de mensagens.',
  'backend',
  'sql_migration',
  'sql',
  ARRAY['whatsapp', 'database', 'sql', 'schema', 'rls'],
  'global',
  'validated',
  'risecheckout',
  $$
-- 1. whatsapp_instances
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  instance_id TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_whatsapp_instance_status CHECK (status IN ('disconnected', 'connecting', 'open', 'close'))
);
CREATE INDEX idx_whatsapp_instances_vendor ON public.whatsapp_instances(vendor_id);
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own instances" ON public.whatsapp_instances FOR ALL USING (vendor_id = auth.uid());

-- 2. whatsapp_templates
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'text',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_whatsapp_template_media_type CHECK (media_type IN ('text', 'image', 'video', 'document'))
);
CREATE INDEX idx_whatsapp_templates_vendor ON public.whatsapp_templates(vendor_id);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own templates" ON public.whatsapp_templates FOR ALL USING (vendor_id = auth.uid());

-- 3. whatsapp_automations
CREATE TABLE public.whatsapp_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_whatsapp_automation UNIQUE (vendor_id, event_type, product_id, template_id)
);
CREATE INDEX idx_whatsapp_automations_vendor ON public.whatsapp_automations(vendor_id);
CREATE INDEX idx_whatsapp_automations_event ON public.whatsapp_automations(vendor_id, event_type, active);
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can manage own automations" ON public.whatsapp_automations FOR ALL USING (vendor_id = auth.uid());

-- 4. whatsapp_message_logs
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.whatsapp_automations(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  template_name TEXT NOT NULL,
  rendered_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  evolution_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_whatsapp_log_status CHECK (status IN ('queued', 'sent', 'delivered', 'failed'))
);
CREATE INDEX idx_whatsapp_logs_vendor_created ON public.whatsapp_message_logs(vendor_id, created_at DESC);
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own message logs" ON public.whatsapp_message_logs FOR SELECT USING (vendor_id = auth.uid());

-- 5. Triggers for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_whatsapp_automations_updated_at BEFORE UPDATE ON public.whatsapp_automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  $$,
  $$
### Contexto
Este schema é o coração do sistema de automação de WhatsApp. Ele foi projetado para ser robusto e escalável, com relacionamentos claros entre as entidades e políticas de segurança (RLS) que garantem que um vendedor só possa acessar seus próprios dados.

### Destaques
- **RLS (Row Level Security):** Todas as tabelas possuem políticas que isolam os dados por `vendor_id`.
- **Índices:** Índices otimizados foram criados para as consultas mais comuns, como buscar automações por evento ou logs por data.
- **Constraints:** Validações no nível do banco de dados (como `CHECK` e `UNIQUE`) garantem a integridade dos dados.
- **Flexibilidade:** O uso de `product_id` opcional permite automações globais (para todos os produtos) ou específicas.
  $$
);

-- Módulo 4: Renderizador de Templates de Mensagem (TypeScript)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Renderizador de Templates de Mensagem (TypeScript)',
  'Função utilitária para substituir placeholders (variáveis) em um template de mensagem. Suporta variáveis como nome do cliente, nome do produto, valor, código PIX, etc., usando um formato de chaves duplas (ex: {{customer_name}}).',
  'backend',
  'code_snippet',
  'typescript',
  ARRAY['whatsapp', 'template', 'renderer', 'utility'],
  'global',
  'validated',
  'risecheckout',
  $$
import type { TemplateVariables } from "./types.ts";

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}|\{(\$[a-zA-Z0-9_]+)}/g;

export function renderTemplate(body: string, variables: TemplateVariables): string {
  if (!body) return "";

  return body.replace(PLACEHOLDER_REGEX, (match, p1, p2) => {
    const key = (p1 || p2) as keyof TemplateVariables;
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

export function extractPlaceholders(text: string): string[] {
  const placeholders = new Set<string>();
  let match;
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    placeholders.add(match[1] || match[2]);
  }
  return Array.from(placeholders);
}

export function formatAmountBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}
  $$,
  $$
### Contexto
Personalizar mensagens é fundamental para a comunicação com o cliente. Este renderizador permite criar templates de mensagem dinâmicos que são preenchidos com dados reais do pedido no momento do envio.

### Como Usar
```typescript
import { renderTemplate } from './template-renderer.ts';
import type { TemplateVariables } from './types.ts';

const templateBody = "Olá, {{customer_name}}! Seu pedido do produto {{product_name}} foi aprovado.";

const orderVariables: TemplateVariables = {
  customer_name: "Alessandro",
  product_name: "Curso de IA",
};

const renderedMessage = renderTemplate(templateBody, orderVariables);
// "Olá, Alessandro! Seu pedido do produto Curso de IA foi aprovado."
```
  $$
);

-- Módulo 5: Dispatcher de Mensagens WhatsApp (Edge Function)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Dispatcher de Mensagens WhatsApp (Edge Function)',
  'Lógica central para o envio de mensagens. Esta função é acionada por um evento (ex: compra aprovada), encontra as automações correspondentes, renderiza o template com os dados do pedido e envia a mensagem através da Evolution API, registrando todo o processo na tabela de logs.',
  'backend',
  'full_module',
  'typescript',
  ARRAY['whatsapp', 'dispatcher', 'edge-function', 'automation'],
  'global',
  'validated',
  'risecheckout',
  $$
// Esta é uma versão simplificada do dispatcher para fins de documentação.
// O código original é mais complexo e lida com múltiplos casos de borda.

import { SupabaseClient } from "@supabase/supabase-js";
import { createEvolutionClientFromEnv, EvolutionClient } from "./evolution-client.ts";
import { renderTemplate } from "./template-renderer.ts";
import type { DispatchRequest, DispatchResult, SingleSendResult, TemplateVariables } from "./types.ts";

async function getTemplateAndInstance(supabase: SupabaseClient, automation: any) {
  // ... busca o template e a instância no banco de dados
}

async function getOrderVariables(supabase: SupabaseClient, orderId: string): Promise<TemplateVariables> {
  // ... busca os dados do pedido, cliente e produto para preencher as variáveis
  return { customer_name: "Cliente", product_name: "Produto", amount: "R$ 100,00" };
}

export async function dispatchWhatsAppMessages(supabase: SupabaseClient, req: DispatchRequest): Promise<DispatchResult> {
  const { order_id, event_type, vendor_id } = req;

  // 1. Encontrar automações ativas para o evento e vendedor
  const { data: automations, error } = await supabase
    .from("whatsapp_automations")
    .select("*, templates:whatsapp_templates(*), instances:whatsapp_instances(*)")
    .eq("vendor_id", vendor_id)
    .eq("event_type", event_type)
    .eq("active", true);

  if (error || !automations) {
    // ... trata o erro
    return { total_sent: 0, total_failed: 0, results: [] };
  }

  const evolutionClient = createEvolutionClientFromEnv();
  const variables = await getOrderVariables(supabase, order_id);
  const results: SingleSendResult[] = [];

  for (const automation of automations) {
    const template = automation.templates;
    const instance = automation.instances;
    const recipientPhone = variables.customer_phone!;

    if (!template || !instance || !recipientPhone) continue;

    // 2. Verificar se a instância está conectada
    if (instance.status !== 'open') {
      // ... loga o erro e continua
      continue;
    }

    // 3. Renderizar o template
    const renderedBody = renderTemplate(template.body, variables);

    try {
      // 4. Enviar a mensagem
      const sendResult = await evolutionClient.sendText(instance.instance_name, recipientPhone, renderedBody);
      
      // 5. Logar o sucesso
      await supabase.from("whatsapp_message_logs").insert({ ... });
      results.push({ success: true, ... });

    } catch (e) {
      // 6. Logar a falha
      await supabase.from("whatsapp_message_logs").insert({ status: 'failed', ... });
      results.push({ success: false, error: e.message, ... });
    }
  }

  return { total_sent: results.filter(r => r.success).length, total_failed: results.filter(r => !r.success).length, results };
}
  $$,
  $$
### Contexto
O dispatcher é o orquestrador do sistema. Ele une todas as peças: automações, templates, dados do pedido e o cliente da API. É projetado para ser chamado por outras Edge Functions, como o webhook de pós-pagamento.

### Fluxo de Execução
1.  Recebe um evento (ex: `purchase_approved`) e um `order_id`.
2.  Busca no banco de dados todas as automações ativas para aquele evento e vendedor.
3.  Para cada automação encontrada:
    a. Carrega os dados do template e da instância de WhatsApp.
    b. Carrega os dados do pedido para usar como variáveis.
    c. Verifica se a instância está conectada.
    d. Renderiza a mensagem do template com as variáveis.
    e. Envia a mensagem via `EvolutionClient`.
    f. Grava um registro de log (sucesso ou falha).
4.  Retorna um resumo da operação.
  $$
);

-- Módulo 6: CRUD de Instâncias e Automações (Edge Function)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'CRUD de Instâncias e Automações (Edge Function)',
  'Edge Function que expõe uma API RESTful para o frontend gerenciar instâncias, templates e automações. Lida com a lógica de negócio e a comunicação com a Evolution API para criar e conectar instâncias, além de fazer o CRUD no banco de dados do Supabase.',
  'backend',
  'full_module',
  'typescript',
  ARRAY['whatsapp', 'crud', 'edge-function', 'rest-api'],
  'global',
  'validated',
  'risecheckout',
  $$
// Exemplo simplificado do handler principal da Edge Function `whatsapp-crud`

import { serve } from "https://deno.land/std/http/server.ts";
import { authenticateRequest } from "../_shared/auth-guard.ts";
import { createEvolutionClientFromEnv } from "../_shared/whatsapp/index.ts";

async function handleInstance(req: Request, supabase: SupabaseClient, userId: string) {
  const evolutionClient = createEvolutionClientFromEnv();
  switch (req.method) {
    case "POST":
      // 1. Criar instância na Evolution API
      const { instanceName } = await req.json();
      const webhookUrl = `https://<project-ref>.supabase.co/functions/v1/whatsapp-status-webhook?token=<secret>`;
      const evoInstance = await evolutionClient.createInstance(instanceName, webhookUrl);
      // 2. Salvar no banco de dados
      const { data, error } = await supabase.from("whatsapp_instances").insert({ ... }).select().single();
      return new Response(JSON.stringify(data));
    case "GET":
      // Listar instâncias do usuário
      const { data } = await supabase.from("whatsapp_instances").select("*").eq("vendor_id", userId);
      return new Response(JSON.stringify(data));
    // ... outros métodos (DELETE, etc.)
  }
}

async function handleTemplate(req: Request, supabase: SupabaseClient, userId: string) { /* ... CRUD de templates ... */ }
async function handleAutomation(req: Request, supabase: SupabaseClient, userId: string) { /* ... CRUD de automações ... */ }

serve(async (req) => {
  // Autenticação JWT
  const { supabase, user, error } = await authenticateRequest(req);
  if (error) return error;

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  switch (path) {
    case "instances":
      return handleInstance(req, supabase, user.id);
    case "templates":
      return handleTemplate(req, supabase, user.id);
    case "automations":
      return handleAutomation(req, supabase, user.id);
    default:
      return new Response("Not Found", { status: 404 });
  }
});
  $$,
  $$
### Contexto
Para que o usuário possa configurar suas automações, o frontend precisa de uma API para listar, criar, editar e deletar instâncias, templates e as próprias automações. Esta Edge Function serve como o backend para a interface de configuração do WhatsApp.

### Endpoints Expostos
- `POST /whatsapp-crud/instances`: Cria uma nova instância.
- `GET /whatsapp-crud/instances`: Lista as instâncias do usuário.
- `DELETE /whatsapp-crud/instances/:id`: Deleta uma instância.
- `GET /whatsapp-crud/instances/:id/connect`: Inicia a conexão e retorna o QR Code.
- `POST /whatsapp-crud/templates`: Cria um novo template.
- `GET /whatsapp-crud/templates`: Lista os templates.
- ... e assim por diante para todas as operações CRUD.
  $$
);

-- Módulo 7: Webhook de Status da Conexão (Edge Function)
INSERT INTO public.vault_modules (
  user_id, title, description, domain, module_type, language, tags, visibility, validation_status, source_project, code, context_markdown
)
VALUES (
  v_user_id,
  'Webhook de Status da Conexão (Edge Function)',
  'Edge Function pública que recebe webhooks da Evolution API sobre o status da conexão (conectado, desconectado, QR code atualizado). Ela atualiza o status da instância no banco de dados em tempo real, permitindo que o frontend mostre o estado atual da conexão para o usuário.',
  'backend',
  'full_module',
  'typescript',
  ARRAY['whatsapp', 'webhook', 'edge-function', 'realtime'],
  'global',
  'validated',
  'risecheckout',
  $$
import { serve } from "https://deno.land/std/http/server.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import type { EvolutionWebhookPayload, EvolutionConnectionUpdate, EvolutionQrCodeUpdate } from "../_shared/whatsapp/index.ts";

function timingSafeEqual(a: string, b: string): boolean {
  // ... implementação de comparação segura contra timing attacks
}

serve(async (req) => {
  // 1. Autenticação via token na URL
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const expectedToken = Deno.env.get("WEBHOOK_SECRET");
  if (!token || !timingSafeEqual(token, expectedToken)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json() as EvolutionWebhookPayload;
  const { event, instance: instanceName, data } = payload;

  const supabase = getSupabaseClient("webhooks");

  // 2. Encontrar a instância no banco de dados
  const { data: instance, error } = await supabase
    .from("whatsapp_instances")
    .select("id, status")
    .eq("instance_name", instanceName)
    .maybeSingle();

  if (error || !instance) {
    // Ignora webhooks para instâncias não encontradas
    return new Response("OK");
  }

  // 3. Processar o evento
  switch (event) {
    case "connection.update": {
      const updateData = data as EvolutionConnectionUpdate;
      const newStatus = updateData.state; // 'open', 'close', 'connecting'
      await supabase
        .from("whatsapp_instances")
        .update({ status: newStatus, qr_code: null })
        .eq("id", instance.id);
      break;
    }
    case "qrcode.updated": {
      const qrData = data as EvolutionQrCodeUpdate;
      await supabase
        .from("whatsapp_instances")
        .update({ qr_code: qrData.base64, status: 'connecting' })
        .eq("id", instance.id);
      break;
    }
  }

  return new Response("OK");
});
  $$,
  $$
### Contexto
É essencial que o sistema saiba quando uma instância do WhatsApp está conectada ou não. A Evolution API nos notifica sobre essas mudanças através de webhooks. Esta Edge Function atua como o receptor desses webhooks.

### Segurança
Como este é um endpoint público, a segurança é crítica. A autenticação não é feita com JWT, mas sim com um token secreto enviado como um parâmetro na URL do webhook. É vital usar uma função de comparação segura (`timingSafeEqual`) para prevenir ataques de tempo na validação do token.

### Fluxo
1.  Recebe uma requisição POST da Evolution API.
2.  Valida o token secreto na URL.
3.  Parseia o payload do webhook para obter o evento (`connection.update`, `qrcode.updated`), o nome da instância e os dados.
4.  Busca a instância correspondente no banco de dados.
5.  Atualiza o campo `status` ou `qr_code` da instância com base no evento recebido.
  $$
);

END $$;

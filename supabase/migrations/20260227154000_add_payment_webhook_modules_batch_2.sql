/**
 * Migration: Add Payment & Webhook Modules (Batch 2)
 * 
 * Inserts core payment and webhook modules from risecheckout into the DevVault.
 */

-- Módulos de Pagamento e Webhooks (Batch 2)
INSERT INTO vault_modules (user_id, title, slug, description, domain, module_type, implementation_order, prerequisites, code, why_it_matters, code_example, source_project, validation_status, visibility, tags, language)
VALUES
(
  -- Módulo 6: Circuit Breaker
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Circuit Breaker for External API Calls',
  'circuit-breaker-external-apis',
  'Implements the Circuit Breaker pattern to prevent cascading failures when calling external APIs (e.g., payment gateways, email services). It blocks requests to a failing service for a configured timeout, allowing it to recover.',
  'architecture',
  'pattern_guide',
  6,
  '{}'::jsonb[],
  $CODE$
  /**
   * ============================================================================
   * CIRCUIT BREAKER - Protection Against Cascading Failures
   * ============================================================================
   *
   * States:
   * - CLOSED: Normal operation, requests pass through
   * - OPEN: Service unavailable, requests are blocked immediately
   * - HALF_OPEN: Recovery test, allows 1 request to pass
   *
   * Version: 1.0
   * Date: 2026-01-11
   * ============================================================================
   */
  import { createLogger } from "./logger.ts";
  const log = createLogger("CircuitBreaker");

  export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

  // ... (implementation of CircuitBreakerConfig, CircuitInternalState, etc.)
  $CODE$,
  'If a payment gateway is down, repeatedly calling it will exhaust your server resources and cause your own application to fail. A Circuit Breaker detects the failure, stops sending requests, and gives the external service time to recover, making your system more resilient.',
  $EXAMPLE$
  import { createCircuitBreaker } from "@/supabase/functions/_shared/circuit-breaker.ts";

  const stripeCircuit = createCircuitBreaker({ name: "stripe-api" });

  const result = await stripeCircuit.execute(async () => {
    return await callStripeApi();
  });
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"architecture", "resilience", "circuit-breaker", "payments"}',
  'typescript'
),
(
  -- Módulo 7: Idempotency Middleware for Webhooks
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Idempotency Middleware for Webhook Handlers',
  'idempotency-middleware-webhooks',
  'Ensures that webhook events are processed exactly once, even if the provider sends the same event multiple times. It uses an idempotency key from the webhook header to track and ignore duplicate requests.',
  'backend',
  'full_module',
  7,
  '{}'::jsonb[],
  $CODE$
  /**
   * Idempotency Middleware for Webhooks
   *
   * Prevents duplicate processing of webhook events.
   *
   * @module _shared/webhook/idempotency-middleware
   * @version 1.0.0
   */
  import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
  import { getSupabaseClient } from "../supabase-client.ts";

  // ... (implementation of checkIdempotency, markAsProcessed, etc.)
  $CODE$,
  'Webhook providers often retry failed requests, which can lead to duplicate processing (e.g., granting a user access to a product twice, sending two confirmation emails). Idempotency is critical for building reliable webhook handlers.',
  $EXAMPLE$
  import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
  import { idempotencyMiddleware } from "@/supabase/functions/_shared/webhook/idempotency-middleware.ts";

  const handleStripeWebhook = async (req: Request) => {
    // ... process webhook
  };

  serve(idempotencyMiddleware(handleStripeWebhook));
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"backend", "webhooks", "idempotency", "payments"}',
  'typescript'
);

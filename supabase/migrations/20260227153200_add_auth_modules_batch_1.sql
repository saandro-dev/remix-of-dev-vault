/**
 * Migration: Add Auth Modules (Batch 1)
 * 
 * Inserts the first 5 core authentication modules from risecheckout into the DevVault.
 * All modules are in English, with implementation_order and prerequisites.
 */

-- Módulos de Autenticação (Batch 1)
INSERT INTO vault_modules (user_id, title, slug, description, domain, module_type, implementation_order, prerequisites, code, why_it_matters, code_example, source_project, validation_status, visibility, tags, language)
VALUES
(
  -- Módulo 1: Auth Constants
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Auth Constants - Single Source of Truth',
  'auth-constants-ssot',
  'Centralizes all authentication constants (token durations, bcrypt cost, hash version) into a single file to eliminate duplication and ensure consistency across all Edge Functions. Compliant with RISE Protocol V3.',
  'security',
  'code_snippet',
  1,
  '{}'::jsonb[],
  $CODE$
  /**
   * Auth Constants - Centralized
   *
   * RISE Protocol V3: Single source of truth for all auth constants.
   * This file eliminates duplication across buyer-auth-types.ts and producer-auth-helpers.ts.
   *
   * @version 1.0.0
   */
  // ============================================
  // HASH CONSTANTS
  // ============================================
  /**
   * Current hash version (bcrypt only - SHA-256 legacy eliminated)
   */
  export const CURRENT_HASH_VERSION = 2;
  /**
   * bcrypt cost factor (10 = ~100ms per hash)
   */
  export const BCRYPT_COST = 10;

  // ============================================
  // REFRESH TOKEN CONSTANTS (SESSION COMMANDER)
  // ============================================
  /**
   * Access token duration in minutes
   *
   * SESSION COMMANDER ARCHITECTURE - RISE V3 2026-01-26
   *
   * Increased from 60 to 240 minutes (4 hours) to match market standards
   * (Cakto, Kiwify, Hotmart) and eliminate frequent logouts.
   */
  export const ACCESS_TOKEN_DURATION_MINUTES = 240; // 4 hours

  /**
   * Refresh token duration in days (long-lived for convenience)
   */
  export const REFRESH_TOKEN_DURATION_DAYS = 30;

  /**
   * Password reset token expiry in hours
   */
  export const RESET_TOKEN_EXPIRY_HOURS = 1;

  // ============================================
  // ACCOUNT STATUS (PHASE 2: Replaces Password Markers)
  // ============================================
  /**
   * Account status enum - replaces password_hash markers
   * RISE V3: Single source of truth for account states
   */
  export enum AccountStatus {
    ACTIVE = "active",
    PENDING_SETUP = "pending_setup",
    RESET_REQUIRED = "reset_required",
    OWNER_NO_PASSWORD = "owner_no_password",
    PENDING_EMAIL_VERIFICATION = "pending_email_verification",
  }
  $CODE$,
  'Centralizing constants prevents inconsistencies and bugs. If one part of the system uses a 60-minute token and another uses 240, users will be logged out unexpectedly. This file ensures every part of the system agrees on how long a session lasts.',
  $EXAMPLE$
  import { ACCESS_TOKEN_DURATION_MINUTES } from "@/supabase/functions/_shared/auth-constants";

  function createSession() {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_DURATION_MINUTES * 60 * 1000);
    // ...
  }
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"auth", "constants", "security", "session"}',
  'typescript'
),
(
  -- Módulo 2: Cookie Helper
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Secure Cookie Helper - HttpOnly, Secure, SameSite=None',
  'secure-cookie-helper',
  'Provides functions to create, parse, and manage secure, HttpOnly cookies for authentication, following industry best practices. Uses __Secure- prefix and SameSite=None for cross-domain compatibility.',
  'security',
  'full_module',
  2,
  ARRAY['{"module_slug": "auth-constants-ssot", "reason": "Cookie maxAge depends on ACCESS_TOKEN_DURATION_MINUTES from auth-constants"}']::jsonb[],
  $CODE$
  /**
   * Secure Cookie Helper
   *
   * RISE Protocol V3: Centralized, secure cookie management.
   * Replaces fragmented cookie logic from buyer-auth-helpers and producer-auth-helpers.
   *
   * @version 2.0.0
   */
  import { ACCESS_TOKEN_DURATION_MINUTES } from "./auth-constants.ts";

  // ============================================
  // CONFIG
  // ============================================
  /**
   * Domain for auth cookies - allows sharing session across subdomains.
   * Example: .risecheckout.com
   */
  export const COOKIE_DOMAIN = Deno.env.get("RISE_COOKIE_DOMAIN") || "";

  // ============================================
  // UNIFIED COOKIE NAMES (RISE V3 → V4)
  // ============================================
  /**
   * Unified cookie names - __Secure- prefix allows Domain attribute.
   * Changed from __Host- which blocks Domain attribute.
   */
  export const COOKIE_NAMES = {
    access: "__Secure-rise_access",
    refresh: "__Secure-rise_refresh",
  } as const;

  // ============================================
  // COOKIE OPTIONS
  // ============================================
  export interface CookieOptions {
    maxAge: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    path?: string;
    domain?: string;
  }

  const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
    maxAge: ACCESS_TOKEN_DURATION_MINUTES * 60,
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    domain: COOKIE_DOMAIN,
  };

  // ============================================
  // COOKIE PARSING & CREATION
  // ============================================
  // ... (implementation of getCookie, createAuthCookies, etc.)
  $CODE$,
  'Improperly configured cookies are a major security vulnerability. This module enforces HttpOnly (prevents XSS), Secure (prevents MITM), and SameSite=None (required for cross-domain auth) by default, eliminating common attack vectors.',
  $EXAMPLE$
  import { createAuthCookies, jsonResponseWithCookies } from "@/supabase/functions/_shared/cookie-helper.ts";

  const { accessToken, refreshToken } = generateSessionTokens();
  const cookies = createAuthCookies(accessToken, refreshToken);
  return jsonResponseWithCookies({ user }, 200, cookies);
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"auth", "cookie", "security", "session"}',
  'typescript'
),
(
  -- Módulo 3: Multi-Key Supabase Client
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Multi-Key Supabase Client for Domain Isolation',
  'multi-key-supabase-client',
  'Implements a cached Supabase client factory that uses different SERVICE_ROLE_KEYs based on the functional domain (e.g., payments, webhooks, admin). This isolates permissions and limits the blast radius if one key is compromised.',
  'security',
  'full_module',
  3,
  '{}'::jsonb[],
  $CODE$
  /**
   * Multi-Key Supabase Client
   *
   * RISE Protocol V3: Blast-radius isolation via domain-specific secret keys.
   *
   * @version 1.0.0
   */
  import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
  import { createLogger } from "./logger.ts";

  const log = createLogger("SupabaseClient");

  export type SecretDomain = "webhooks" | "payments" | "admin" | "general";

  const DOMAIN_KEY_MAP: Record<SecretDomain, string> = {
    webhooks: "SUPABASE_WEBHOOKS_KEY",
    payments: "SUPABASE_PAYMENTS_KEY",
    admin: "SUPABASE_ADMIN_KEY",
    general: "SUPABASE_SERVICE_ROLE_KEY",
  };

  const domainClients: Partial<Record<SecretDomain, SupabaseClient>> = {};

  // ... (implementation of getSupabaseClient, createFreshSupabaseClient, etc.)
  $CODE$,
  $$Using a single, all-powerful SERVICE_ROLE_KEY for every operation is dangerous. If that key leaks, the entire system is compromised. This pattern isolates permissions, so a leaked `webhooks` key can't be used to access payment data, for example.$$,
  $EXAMPLE$
  import { getSupabaseClient } from "@/supabase/functions/_shared/supabase-client.ts";

  // In a payment processing function:
  const supabase = getSupabaseClient("payments");

  // In a webhook handler:
  const supabase = getSupabaseClient("webhooks");
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"auth", "security", "supabase", "multi-key"}',
  'typescript'
),
(
  -- Módulo 4: Unified Auth v2
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Unified Auth v2 - Single Identity Model',
  'unified-auth-v2',
  'The core of the custom authentication system. Manages user identity, session tokens, role switching, and password hashing, all independent of Supabase GoTrue. Provides a single source of truth for user authentication.',
  'backend',
  'full_module',
  4,
  ARRAY['{"module_slug": "auth-constants-ssot", "reason": "Depends on token durations and hash constants"}', '{"module_slug": "secure-cookie-helper", "reason": "Uses secure cookies to store session tokens"}']::jsonb[],
  $CODE$
  /**
   * Unified Auth V2 - Single Identity Model
   *
   * RISE ARCHITECT PROTOCOL V3 - 10.0/10
   *
   * Replaces: unified-auth.ts, buyer-auth-handlers.ts, producer-auth-handlers.ts
   *
   * @module _shared/unified-auth-v2
   * @version 2.0.0
   */
  import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
  import { createLogger } from "./logger.ts";
  import { getCookie, COOKIE_NAMES, createAuthCookies, createLogoutCookies } from "./cookie-helper.ts";
  import { ACCESS_TOKEN_DURATION_MINUTES, REFRESH_TOKEN_DURATION_DAYS } from "./auth-constants.ts";
  import { genSaltSync, hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

  // ... (implementation of UnifiedUser, SessionData, generateSessionTokens, etc.)
  $CODE$,
  'Supabase GoTrue is powerful but can be limiting for complex SaaS apps with multiple user roles (e.g., buyer, seller, admin). A custom auth system provides full control over the user identity model, session management, and security policies, enabling features like instant role switching.',
  $EXAMPLE$
  import { UnifiedAuth } from "@/supabase/functions/_shared/unified-auth-v2.ts";

  const auth = new UnifiedAuth(getSupabaseClient("admin"));
  const { user, session } = await auth.signInWithPassword("user@email.com", "password123");
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"auth", "backend", "custom-auth", "identity"}',
  'typescript'
),
(
  -- Módulo 5: Rate Limiting Middleware
  '32d5c933-94b0-4b8d-a855-f00b3d2f1193',
  'Rate Limiting Middleware for Edge Functions',
  'rate-limiting-middleware',
  'A middleware that protects Edge Functions from abuse by enforcing rate limits based on IP address and action type. Uses a sliding window algorithm and a Redis-backed store for high performance.',
  'security',
  'full_module',
  5,
  ARRAY['{"module_slug": "api-response-helpers", "reason": "Uses createErrorResponse to return 429 Too Many Requests"}']::jsonb[],
  $CODE$
  /**
   * Rate Limiting Module
   *
   * Barrel export para o sistema consolidado de rate limiting.
   *
   * @version 1.0.0 - RISE V3 Compliant
   * @module rate-limiting
   */
  // Types
  export type { RateLimitConfig, RateLimitResult } from "./types.ts";
  // Configs
  export * from "./configs.ts";
  // Service
  export { checkRateLimit, createRateLimitResponse, getClientIP } from "./service.ts";
  // Middleware
  export { rateLimitMiddleware } from "./middleware.ts";
  $CODE$,
  'Without rate limiting, a single malicious actor can overload your system with requests, causing a denial-of-service (DoS) attack that impacts all users. This middleware is a critical first line of defense for any public-facing API.',
  $EXAMPLE$
  import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
  import { rateLimitMiddleware } from "@/supabase/functions/_shared/rate-limiting/index.ts";

  const handleRequest = async (req: Request) => {
    // ... your logic
  };

  serve(rateLimitMiddleware(handleRequest, "login_attempt"));
  $EXAMPLE$,
  'risecheckout',
  'validated',
  'global',
  '{"security", "rate-limiting", "middleware", "dos"}',
  'typescript'
);

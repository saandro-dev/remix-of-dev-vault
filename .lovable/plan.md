

# Fix: devvault-mcp tool registration API mismatch

## Root Cause

The `mcp-lite` library's `McpServer.tool()` method signature is:
```typescript
server.tool("toolName", {
  description: "...",
  inputSchema: { ... },
  handler: async (args) => { ... }
});
```

Our code incorrectly passes a single object:
```typescript
server.tool({
  name: "devvault_bootstrap",  // ← name inside object = WRONG
  ...
});
```

The library treats the first argument as the tool name (string), and the second as options. When it receives an object as the first arg, the second arg is `undefined`, causing `Cannot read properties of undefined (reading 'inputSchema')`.

## Fix

Refactor all 6 `server.tool()` calls in `supabase/functions/devvault-mcp/index.ts` from:
```typescript
server.tool({
  name: "tool_name",
  description: "...",
  inputSchema: { ... },
  handler: async (params) => { ... }
});
```
To:
```typescript
server.tool("tool_name", {
  description: "...",
  inputSchema: { ... },
  handler: async (params) => { ... }
});
```

All 6 tools affected: `devvault_bootstrap`, `devvault_search`, `devvault_get`, `devvault_list`, `devvault_domains`, `devvault_ingest`.

## Files

```text
MODIFY  supabase/functions/devvault-mcp/index.ts  (fix all 6 tool registrations)
```

After fix, redeploy and test via curl to confirm `initialize` + `tools/list` return correctly.


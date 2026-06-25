/**
 * @ledgerproof/workers — Cloudflare Workers binding.
 *
 * Usage in wrangler.toml::
 *
 *   [[vars]]
 *   LEDGERPROOF_PUBLISHER_ID = "LEI:5493001KJTIIGC8Y1R12"
 *   LEDGERPROOF_DEPLOYER_COUNTRY = "DE"
 *   LEDGERPROOF_DEPLOYER_NAME = "Acme Corp"
 *
 *   [[secrets]]
 *   LEDGERPROOF_API_KEY
 *
 * Usage in your Worker::
 *
 *   import { receiptFromText, type Env } from "@ledgerproof/workers";
 *
 *   export default {
 *     async fetch(req: Request, env: Env, ctx: ExecutionContext) {
 *       const result = await env.AI.run("@cf/meta/llama-3-8b-instruct", { prompt: "..." });
 *       // Issue receipt in background — does NOT block the response.
 *       ctx.waitUntil(receiptFromText(env, result.response, "cloudflare/llama-3-8b-instruct"));
 *       return new Response(result.response);
 *     }
 *   };
 */

import { LedgerProof } from "@ledgerproof/sdk";
import type { Receipt } from "@ledgerproof/sdk";

export interface Env {
  LEDGERPROOF_API_KEY: string;
  LEDGERPROOF_PUBLISHER_ID: string;
  LEDGERPROOF_DEPLOYER_COUNTRY: string;
  LEDGERPROOF_DEPLOYER_NAME: string;
  LEDGERPROOF_API_BASE?: string;
}

/**
 * Issue an LPR Article 50 receipt for a piece of text. Returns the receipt
 * or `null` if issuance failed (fails open). Pass this to `ctx.waitUntil()`
 * to keep the Worker's response latency unaffected.
 */
export async function receiptFromText(
  env: Env,
  text: string,
  aiSystemId: string,
  options: {
    contentCategory?: "SYNTHETIC_TEXT" | "AI_ASSISTED_DOCUMENT";
    isPublicInterest?: boolean;
  } = {}
): Promise<Receipt | null> {
  if (!text) return null;
  try {
    const lp = new LedgerProof({
      publisherId: env.LEDGERPROOF_PUBLISHER_ID,
      deployerCountry: env.LEDGERPROOF_DEPLOYER_COUNTRY,
      apiKey: env.LEDGERPROOF_API_KEY,
      apiBase: env.LEDGERPROOF_API_BASE,
    });
    return await lp.publishAiArticle50({
      artifact: text,
      artifactContentType: "text/plain",
      aiSystemId,
      deployerName: env.LEDGERPROOF_DEPLOYER_NAME,
      contentCategory: options.contentCategory ?? "SYNTHETIC_TEXT",
      generationType: "FULLY_GENERATED",
      ...(options.isPublicInterest !== undefined && { isPublicInterest: options.isPublicInterest }),
    });
  } catch {
    return null;
  }
}

/**
 * Wrap a Workers AI inference call to auto-issue a receipt for its result.
 *
 *   const result = await withReceipt(env, ctx, "@cf/meta/llama-3-8b-instruct",
 *                                    () => env.AI.run(...));
 */
export async function withReceipt<T extends { response?: string }>(
  env: Env,
  ctx: ExecutionContext,
  aiSystemId: string,
  inference: () => Promise<T>
): Promise<T> {
  const result = await inference();
  if (typeof result?.response === "string" && result.response) {
    ctx.waitUntil(receiptFromText(env, result.response, aiSystemId));
  }
  return result;
}

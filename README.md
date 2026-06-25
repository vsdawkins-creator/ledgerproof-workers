# @ledgerproof/workers

Cloudflare Workers binding for LedgerProof — Article 50 receipts at the edge.

```bash
npm install @ledgerproof/sdk @ledgerproof/workers
```

```toml
# wrangler.toml
[vars]
LEDGERPROOF_PUBLISHER_ID = "LEI:5493001KJTIIGC8Y1R12"
LEDGERPROOF_DEPLOYER_COUNTRY = "DE"
LEDGERPROOF_DEPLOYER_NAME = "Acme Corp"
```

```bash
wrangler secret put LEDGERPROOF_API_KEY
```

```ts
import { withReceipt, type Env } from "@ledgerproof/workers";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const result = await withReceipt(env, ctx, "cloudflare/llama-3-8b-instruct",
      () => env.AI.run("@cf/meta/llama-3-8b-instruct", { prompt: "..." })
    );
    return new Response(result.response);
  },
};
```

Apache-2.0.

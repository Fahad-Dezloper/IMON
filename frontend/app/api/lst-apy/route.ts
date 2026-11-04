import { connection } from "next/server";
import { NextResponse } from "next/server";
import deploymentsJson from "@/lib/deployments.143.json";

type AssetMeta = {
  address: string;
  provider?: string;
  inVault?: boolean;
  llamaPoolId?: string | null;
  fallbackApy?: number;
  apySource?: string;
};

type LlamaPool = {
  pool: string;
  apy?: number;
  apyBase?: number;
  tvlUsd?: number;
  project?: string;
};

/**
 * Live LST APYs for the iMON basket.
 * Primary: DefiLlama yields. Fallback: Capricorn published APY for aprMON.
 */
export async function GET() {
  await connection(); // uncached — always hit live feeds

  try {
    const deployments = deploymentsJson as {
      assets: Record<string, AssetMeta>;
    };

    const res = await fetch("https://yields.llama.fi/pools", {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `DefiLlama ${res.status}` }, { status: 502 });
    }
    const body = (await res.json()) as { data: LlamaPool[] };
    const byId = new Map(body.data.map((p) => [p.pool, p]));

    const sleeves = Object.entries(deployments.assets)
      .filter(([, m]) => Boolean(m.inVault))
      .map(([symbol, meta]) => {
        let apy: number | null = null;
        let source = "unavailable";
        let tvlUsd: number | null = null;

        if (meta.llamaPoolId) {
          const p = byId.get(meta.llamaPoolId);
          const v = p?.apy ?? p?.apyBase;
          if (typeof v === "number" && Number.isFinite(v)) {
            apy = v;
            source = `defillama:${p?.project ?? meta.llamaPoolId}`;
            tvlUsd = typeof p?.tvlUsd === "number" ? p.tvlUsd : null;
          }
        }

        if (apy === null && typeof meta.fallbackApy === "number") {
          apy = meta.fallbackApy;
          source = meta.apySource ?? "fallback";
        }

        const aprBps = apy === null ? null : Math.round(apy * 100);
        return {
          symbol,
          address: meta.address,
          provider: meta.provider ?? null,
          apy,
          aprBps,
          source,
          tvlUsd,
        };
      });

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      chainId: 143,
      sleeves,
    });
  } catch (e) {
    console.error("[api/lst-apy]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to fetch APYs" },
      { status: 500 },
    );
  }
}

import deployments from "../../../deployments/143.json" with { type: "json" };

export type LiveApy = {
  symbol: string;
  address: `0x${string}`;
  apy: number;
  aprBps: bigint;
  source: string;
};

type AssetMeta = {
  address: string;
  inVault?: boolean;
  llamaPoolId?: string | null;
  fallbackApy?: number;
  apySource?: string;
};

const LLAMA_POOLS = "https://yields.llama.fi/pools";

/** Fetch live LST APYs (DefiLlama primary; Capricorn fallback for aprMON). */
export async function fetchLiveApys(): Promise<LiveApy[]> {
  const res = await fetch(LLAMA_POOLS, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DefiLlama ${res.status}`);
  const body = (await res.json()) as { data: Array<{ pool: string; apy?: number; apyBase?: number }> };
  const byId = new Map(body.data.map((p) => [p.pool, p]));

  const out: LiveApy[] = [];
  for (const [symbol, meta] of Object.entries(deployments.assets) as [string, AssetMeta][]) {
    if (!meta.inVault) continue;
    let apy: number | null = null;
    let source = "unknown";

    if (meta.llamaPoolId) {
      const p = byId.get(meta.llamaPoolId);
      const v = p?.apy ?? p?.apyBase;
      if (typeof v === "number" && Number.isFinite(v)) {
        apy = v;
        source = `defillama:${meta.llamaPoolId}`;
      }
    }

    if (apy === null && typeof meta.fallbackApy === "number") {
      apy = meta.fallbackApy;
      source = meta.apySource ?? "fallback";
    }

    if (apy === null) continue;

    const aprBps = BigInt(Math.round(apy * 100)); // 13.69% → 1369
    out.push({
      symbol,
      address: meta.address as `0x${string}`,
      apy,
      aprBps,
      source,
    });
  }
  return out;
}

/**
 * iMON APR rotator — production keeper.
 *
 * Each tick:
 *  1. YieldOracle.recordMany(assets)  → refresh trailing APRs
 *  2. Compare preferredDepositAsset (best) vs worst overweight sleeve
 *  3. If best APR − worst APR ≥ MIN_APR_DELTA_BPS and best has cap headroom,
 *     vault.rebalance(worst → best) sized so destination stays under cap.
 *
 * Env (required):
 *   DEPLOYER_PRIVATE_KEY / KEEPER_PRIVATE_KEY
 *   VAULT, YIELD_ORACLE
 * Optional:
 *   MONAD_MAINNET_RPC (default https://rpc.monad.xyz)
 *   INTERVAL_MS (default 300000 = 5m)
 *   MIN_APR_DELTA_BPS (default 50 = 0.50%)
 *   MAX_ROTATE_BPS (default 500 = 5% of source sleeve per tick)
 *   MIN_WEIGHT_BPS (default 100 = only sell sleeves ≥1% NAV)
 *   SLIPPAGE_BPS (default 50 = 0.50% vs fair MON value)
 *   DRY_RUN=1
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { oracleAbi, rateReaderAbi, vaultAbi } from "./abi.js";
import { fetchLiveApys } from "./liveApy.js";
import deployments from "../../../deployments/143.json" with { type: "json" };

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const ONE = 10n ** 18n;

const rpc = process.env.MONAD_MAINNET_RPC ?? deployments.rpc ?? "https://rpc.monad.xyz";
const vault = (process.env.VAULT ?? deployments.contracts.iMONVault) as Address;
const oracle = (process.env.YIELD_ORACLE ?? deployments.contracts.YieldOracle) as Address;
const pkRaw = process.env.KEEPER_PRIVATE_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
if (!pkRaw) throw new Error("Set KEEPER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY");
const privateKey = (pkRaw.startsWith("0x") ? pkRaw : `0x${pkRaw}`) as Hex;

const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 300_000);
const MIN_APR_DELTA_BPS = BigInt(process.env.MIN_APR_DELTA_BPS ?? 50);
const MAX_ROTATE_BPS = BigInt(process.env.MAX_ROTATE_BPS ?? 500);
const MIN_WEIGHT_BPS = Number(process.env.MIN_WEIGHT_BPS ?? 100);
const SLIPPAGE_BPS = BigInt(process.env.SLIPPAGE_BPS ?? 50);
const DRY_RUN = process.env.DRY_RUN === "1";
const ONCE = process.argv.includes("--once");

const monad = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
} as const;

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain: monad, transport: http(rpc) });
const walletClient = createWalletClient({ account, chain: monad, transport: http(rpc) });

function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

async function tick() {
  const assets = (await publicClient.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: "getAssets",
  })) as Address[];

  if (assets.length === 0) {
    log("no assets");
    return;
  }

  // 1) Push live protocol APYs (DefiLlama) so routing uses real-time yield, not 0% trailing
  const live = await fetchLiveApys();
  log(
    "live APYs",
    live.map((x) => ({ symbol: x.symbol, apy: x.apy, bps: x.aprBps.toString(), source: x.source })),
  );

  if (!DRY_RUN && live.length > 0) {
    const pushHash = await walletClient.writeContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "pushLiveAprMany",
      args: [live.map((x) => x.address), live.map((x) => x.aprBps)],
    });
    await publicClient.waitForTransactionReceipt({ hash: pushHash });
    log("oracle.pushLiveAprMany", pushHash);
  } else if (DRY_RUN) {
    log("DRY_RUN skip pushLiveAprMany");
  }

  // 2) Refresh trailing rate-growth window (fallback when live feed ages out)
  if (!DRY_RUN) {
    const hash = await walletClient.writeContract({
      address: oracle,
      abi: oracleAbi,
      functionName: "recordMany",
      args: [assets],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    log("oracle.recordMany", hash);
  } else {
    log("DRY_RUN skip recordMany");
  }

  const weights: number[] = [];
  const caps: number[] = [];
  const aprs: bigint[] = [];
  const bals: bigint[] = [];
  const enabled = assets.map(() => true);

  for (const a of assets) {
    const [w, cap, apr, bal] = await Promise.all([
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "weightBps", args: [a] }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "effectiveCapBps", args: [a] }),
      publicClient.readContract({
        address: oracle,
        abi: oracleAbi,
        functionName: "effectiveAprBps",
        args: [a],
      }),
      publicClient.readContract({ address: vault, abi: vaultAbi, functionName: "vaultBalance", args: [a] }),
    ]);
    weights.push(Number(w));
    caps.push(Number(cap));
    aprs.push(apr as bigint);
    bals.push(bal as bigint);
  }

  const [best, bestApr] = (await publicClient.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: "preferredDepositAsset",
  })) as [Address, bigint];

  const [worst, worstApr] = (await publicClient.readContract({
    address: oracle,
    abi: oracleAbi,
    functionName: "worstAsset",
    args: [assets, weights, enabled, MIN_WEIGHT_BPS],
  })) as [Address, bigint];

  log(
    "APRs",
    assets.map((a, i) => ({
      a,
      aprBps: aprs[i].toString(),
      weightBps: weights[i],
      capBps: caps[i],
      bal: bals[i].toString(),
    })),
  );
  log("best", best, "apr", bestApr.toString(), "worst", worst, "apr", worstApr.toString());

  if (best === ZERO || worst === ZERO || best.toLowerCase() === worst.toLowerCase()) {
    log("no rotation candidate");
    return;
  }

  const delta = bestApr - worstApr;
  if (delta < MIN_APR_DELTA_BPS) {
    log(`delta ${delta} < MIN_APR_DELTA_BPS ${MIN_APR_DELTA_BPS}; skip`);
    return;
  }

  const worstIdx = assets.findIndex((a) => a.toLowerCase() === worst.toLowerCase());
  const bestIdx = assets.findIndex((a) => a.toLowerCase() === best.toLowerCase());
  if (worstIdx < 0 || bestIdx < 0) return;

  const sourceBal = bals[worstIdx];
  if (sourceBal === 0n) {
    log("source empty");
    return;
  }

  // Size: min(MAX_ROTATE_BPS of source, headroom on destination in token terms)
  let amountIn = (sourceBal * MAX_ROTATE_BPS) / 10_000n;
  if (amountIn === 0n) amountIn = sourceBal / 100n; // dust path
  if (amountIn === 0n) {
    log("amountIn=0");
    return;
  }

  const reader = (await publicClient.readContract({
    address: vault,
    abi: vaultAbi,
    functionName: "rateReader",
  })) as Address;

  const [rateIn, rateOut] = await Promise.all([
    publicClient.readContract({ address: reader, abi: rateReaderAbi, functionName: "rateOf", args: [worst] }),
    publicClient.readContract({ address: reader, abi: rateReaderAbi, functionName: "rateOf", args: [best] }),
  ]);

  // Fair MON value → expected out; apply slippage
  const valueIn = (amountIn * (rateIn as bigint)) / ONE;
  let minOut = (valueIn * ONE) / (rateOut as bigint);
  minOut = (minOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  log("rebalance", { tokenIn: worst, tokenOut: best, amountIn: amountIn.toString(), minOut: minOut.toString() });

  if (DRY_RUN) {
    log("DRY_RUN skip rebalance");
    return;
  }

  const hash = await walletClient.writeContract({
    address: vault,
    abi: vaultAbi,
    functionName: "rebalance",
    args: [worst, best, amountIn, minOut],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log("rebalance tx", hash, "status", receipt.status);
}

async function main() {
  log("apr-rotator start", { vault, oracle, keeper: account.address, INTERVAL_MS, DRY_RUN, ONCE });
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error(new Date().toISOString(), "tick failed", e);
    }
    if (ONCE) break;
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

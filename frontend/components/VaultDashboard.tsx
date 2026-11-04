"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  MONAD_CHAIN_ID,
  basketAssets,
  explorerAddress,
  explorerTx,
  iMONVaultABI,
  isDeployed,
  rateReaderABI,
  rateReaderAddress,
  vaultAddress,
  yieldOracleABI,
  yieldOracleAddress,
  type Address,
} from "@/lib/contracts";
import { formatToken, parseToken, shortAddress } from "@/lib/format";

type TxStep = "idle" | "depositing" | "redeeming";

type LiveSleeve = {
  symbol: string;
  address: string;
  apy: number | null;
  aprBps: number | null;
  source: string;
};

function formatAprBps(apr: bigint | number | undefined | null): string {
  if (apr === undefined || apr === null) return "—";
  const n = Number(apr) / 100;
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function formatApyPct(apy: number | null | undefined): string {
  if (apy === undefined || apy === null || !Number.isFinite(apy)) return "—";
  return `${apy.toFixed(2)}%`;
}

export function VaultDashboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const onMonad = chainId === MONAD_CHAIN_ID;

  const [depositInput, setDepositInput] = useState("0.1");
  const [redeemInput, setRedeemInput] = useState("");
  const [step, setStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [localError, setLocalError] = useState<string | null>(null);
  const [liveSleeves, setLiveSleeves] = useState<LiveSleeve[]>([]);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/lst-apy", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { updatedAt?: string; sleeves?: LiveSleeve[] };
        if (cancelled) return;
        setLiveSleeves(body.sleeves ?? []);
        setLiveUpdatedAt(body.updatedAt ?? null);
      } catch {
        /* keep last good */
      }
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const publicClient = usePublicClient({ chainId: MONAD_CHAIN_ID });
  const { writeContractAsync, isPending: isWritePending, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const vault = vaultAddress ?? undefined;
  const reader = rateReaderAddress ?? undefined;
  const oracle = yieldOracleAddress ?? undefined;
  const vaultReady = Boolean(isDeployed && vault && reader);

  const { data: monBalance } = useBalance({
    address,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(address && onMonad), refetchInterval: 8_000 },
  });

  const basketReads = useReadContracts({
    contracts:
      vault && reader && oracle
        ? basketAssets.flatMap((a) => [
            {
              address: vault,
              abi: iMONVaultABI,
              functionName: "vaultBalance",
              args: [a.address],
            },
            {
              address: reader,
              abi: rateReaderABI,
              functionName: "rateOf",
              args: [a.address],
            },
            {
              address: oracle,
              abi: yieldOracleABI,
              functionName: "effectiveAprBps",
              args: [a.address],
            },
            {
              address: vault,
              abi: iMONVaultABI,
              functionName: "weightBps",
              args: [a.address],
            },
          ])
        : [],
    query: { enabled: vaultReady && Boolean(oracle), refetchInterval: 8_000 },
  });

  const sleeveRows = basketAssets.map((a, i) => {
    const base = i * 4;
    const live = liveSleeves.find((s) => s.symbol === a.symbol);
    const onChainApr = basketReads.data?.[base + 2]?.result as bigint | undefined;
    return {
      ...a,
      balance: basketReads.data?.[base]?.result as bigint | undefined,
      rate: basketReads.data?.[base + 1]?.result as bigint | undefined,
      aprBps: onChainApr,
      liveApy: live?.apy ?? null,
      weightBps: basketReads.data?.[base + 3]?.result as number | undefined,
    };
  });

  const { data: preferred } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "preferredDepositAsset",
    query: { enabled: vaultReady, refetchInterval: 8_000 },
  });
  const preferredAddr = (preferred as [Address, bigint] | undefined)?.[0];
  const preferredApr = (preferred as [Address, bigint] | undefined)?.[1];
  const preferredMeta = basketAssets.find(
    (a) => preferredAddr && a.address.toLowerCase() === preferredAddr.toLowerCase(),
  );

  const { data: resolveTarget } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "resolveDepositTarget",
    query: { enabled: vaultReady, refetchInterval: 8_000 },
  });
  const targetAddr = resolveTarget as Address | undefined;
  const targetMeta = basketAssets.find(
    (a) => targetAddr && a.address.toLowerCase() === targetAddr.toLowerCase(),
  );

  const reads = useReadContracts({
    contracts: vault
      ? ([
          { address: vault, abi: iMONVaultABI, functionName: "nav" },
          { address: vault, abi: iMONVaultABI, functionName: "navPerShare" },
          { address: vault, abi: iMONVaultABI, functionName: "totalSupply" },
          {
            address: vault,
            abi: iMONVaultABI,
            functionName: "balanceOf",
            args: address ? [address] : undefined,
          },
          { address: vault, abi: iMONVaultABI, functionName: "symbol" },
        ] as const)
      : [],
    query: { enabled: vaultReady, refetchInterval: 8_000 },
  });

  const nav = reads.data?.[0]?.result as bigint | undefined;
  const navPerShare = reads.data?.[1]?.result as bigint | undefined;
  const totalSupply = reads.data?.[2]?.result as bigint | undefined;
  const iMonBalance = reads.data?.[3]?.result as bigint | undefined;
  const shareSymbol = (reads.data?.[4]?.result as string | undefined) ?? "iMON";

  const depositAmount = useMemo(() => parseToken(depositInput), [depositInput]);
  const redeemAmount = useMemo(() => parseToken(redeemInput), [redeemInput]);

  const { data: previewMon } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "previewDepositMON",
    args: depositAmount !== null && depositAmount > 0n ? [depositAmount] : undefined,
    query: {
      enabled: Boolean(vaultReady && depositAmount && depositAmount > 0n && onMonad),
    },
  });
  const previewShares = (previewMon as [bigint, Address] | undefined)?.[0];
  const previewTarget = (previewMon as [bigint, Address] | undefined)?.[1];
  const previewTargetMeta = basketAssets.find(
    (a) => previewTarget && a.address.toLowerCase() === previewTarget.toLowerCase(),
  );

  const { data: previewRedeem } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "previewRedeem",
    args: redeemAmount !== null && redeemAmount > 0n ? [redeemAmount] : undefined,
    query: {
      enabled: Boolean(vaultReady && redeemAmount && redeemAmount > 0n && onMonad),
    },
  });
  const previewRedeemAmts = previewRedeem as [readonly `0x${string}`[], readonly bigint[]] | undefined;

  async function refresh() {
    await Promise.all([reads.refetch(), basketReads.refetch()]);
  }

  async function onDepositMon() {
    setLocalError(null);
    resetWrite();
    if (!vaultReady || !address || !vault) return;
    if (!depositAmount || depositAmount <= 0n) {
      setLocalError("Enter a MON amount > 0");
      return;
    }
    if (monBalance?.value !== undefined && depositAmount > monBalance.value) {
      setLocalError("Insufficient MON balance");
      return;
    }

    try {
      if (!publicClient) throw new Error("RPC client not ready");
      setStep("depositing");
      // 1% share slippage vs preview (swap + rounding)
      const minShares =
        previewShares !== undefined ? (previewShares * 9900n) / 10_000n : 0n;
      const depHash = await writeContractAsync({
        address: vault,
        abi: iMONVaultABI,
        functionName: "depositMON",
        args: [address, minShares],
        value: depositAmount,
        chainId: MONAD_CHAIN_ID,
      });
      setTxHash(depHash);
      await publicClient.waitForTransactionReceipt({ hash: depHash });
      await refresh();
      setStep("idle");
    } catch (e) {
      setStep("idle");
      setLocalError(e instanceof Error ? e.message : "Deposit failed");
    }
  }

  async function onRedeem() {
    setLocalError(null);
    resetWrite();
    if (!vaultReady || !address || !vault) return;
    if (!redeemAmount || redeemAmount <= 0n) {
      setLocalError("Enter shares to redeem > 0");
      return;
    }
    if (iMonBalance !== undefined && redeemAmount > iMonBalance) {
      setLocalError(`Insufficient ${shareSymbol} balance`);
      return;
    }

    try {
      if (!publicClient) throw new Error("RPC client not ready");
      setStep("redeeming");
      const hash = await writeContractAsync({
        address: vault,
        abi: iMONVaultABI,
        functionName: "redeem",
        args: [redeemAmount, address],
        chainId: MONAD_CHAIN_ID,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
      setStep("idle");
    } catch (e) {
      setStep("idle");
      setLocalError(e instanceof Error ? e.message : "Redeem failed");
    }
  }

  if (!isDeployed) {
    return (
      <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
        Contracts are not published yet. Waiting on <code>deployments.143.json</code>.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Basket NAV" value={`${formatToken(nav)} MON`} />
        <Stat label="NAV / share" value={`${formatToken(navPerShare)} MON`} />
        <Stat
          label="Routes into"
          value={
            preferredMeta || targetMeta
              ? `${(preferredMeta ?? targetMeta)!.symbol} · ${formatAprBps(preferredApr)}`
              : "—"
          }
        />
        <Stat label="Path" value="MON → max APY LST" />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 text-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Where your MON is put to work</h2>
          <div className="flex items-center gap-3">
            {liveUpdatedAt && (
              <span className="font-mono text-[10px] text-neutral-500">
                feed {new Date(liveUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            {vault && (
              <a
                className="font-mono text-xs text-violet-400 hover:underline"
                href={explorerAddress(vault)}
                target="_blank"
                rel="noreferrer"
              >
                Vault {shortAddress(vault)}
              </a>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left font-mono text-xs">
            <thead className="text-neutral-500">
              <tr>
                <th className="pb-2 font-normal">LST</th>
                <th className="pb-2 font-normal">Live APY</th>
                <th className="pb-2 font-normal">Weight</th>
                <th className="pb-2 font-normal">Cap</th>
                <th className="pb-2 font-normal">In vault</th>
              </tr>
            </thead>
            <tbody className="text-neutral-300">
              {sleeveRows.map((row) => {
                const isPref =
                  (preferredAddr && row.address.toLowerCase() === preferredAddr.toLowerCase()) ||
                  (targetAddr && row.address.toLowerCase() === targetAddr.toLowerCase());
                return (
                  <tr key={row.symbol} className={isPref ? "text-emerald-400" : undefined}>
                    <td className="py-1.5">
                      {row.symbol}
                      {isPref ? " ← receiving deposits" : ""}
                    </td>
                    <td className="py-1.5 font-semibold">{formatApyPct(row.liveApy)}</td>
                    <td className="py-1.5">
                      {row.weightBps !== undefined
                        ? `${(Number(row.weightBps) / 100).toFixed(2)}%`
                        : "—"}
                    </td>
                    <td className="py-1.5">{(row.capBps / 100).toFixed(0)}%</td>
                    <td className="py-1.5">{formatToken(row.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-neutral-500">
          Deposit MON — we wrap to WMON, swap into the highest-APY sleeve with cap headroom, and
          mint iMON. No need to buy an LST yourself.
        </p>
      </section>

      {!isConnected && (
        <p className="rounded-xl border border-neutral-800 px-4 py-3 text-sm text-neutral-400">
          Connect a wallet to deposit MON or redeem iMON.
        </p>
      )}

      {isConnected && !onMonad && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          <span>Wrong network (chain {chainId}).</span>
          <button
            type="button"
            onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
            className="rounded-md border border-amber-600/60 px-2 py-1 text-xs hover:bg-amber-600/10"
          >
            Switch to Monad
          </button>
        </div>
      )}

      {isConnected && onMonad && (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <Stat label={`Your ${shareSymbol}`} value={formatToken(iMonBalance)} />
            <Stat label="Your MON" value={formatToken(monBalance?.value)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 p-4">
              <h3 className="mb-3 font-semibold">Deposit MON → {shareSymbol}</h3>
              <label className="mb-1 block text-xs text-neutral-500">Amount (MON)</label>
              <div className="mb-2 flex gap-2">
                <input
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-violet-500"
                  inputMode="decimal"
                />
                <button
                  type="button"
                  className="rounded-lg border border-neutral-700 px-3 text-xs hover:border-neutral-500"
                  onClick={() => {
                    if (!monBalance?.value) return;
                    // leave ~0.02 MON for gas
                    const gasReserve = 20_000_000_000_000_000n;
                    const max =
                      monBalance.value > gasReserve ? monBalance.value - gasReserve : 0n;
                    setDepositInput(formatUnits(max, 18));
                  }}
                >
                  Max
                </button>
              </div>
              <p className="mb-3 text-xs text-neutral-500">
                Preview ≈ {formatToken(previewShares)} {shareSymbol}
                {previewTargetMeta || preferredMeta
                  ? ` · auto-swaps into ${(previewTargetMeta ?? preferredMeta)!.symbol}`
                  : ""}
              </p>
              <button
                type="button"
                onClick={onDepositMon}
                disabled={isWritePending || isConfirming || step !== "idle"}
                className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {step === "depositing"
                  ? "Depositing MON…"
                  : isConfirming
                    ? "Confirming…"
                    : "Deposit MON"}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-neutral-500">
                One transaction: wrap → Uniswap swap → mint. No LST approve needed.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 p-4">
              <h3 className="mb-3 font-semibold">Redeem {shareSymbol} → basket</h3>
              <label className="mb-1 block text-xs text-neutral-500">Shares ({shareSymbol})</label>
              <div className="mb-2 flex gap-2">
                <input
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-violet-500"
                  inputMode="decimal"
                />
                <button
                  type="button"
                  className="rounded-lg border border-neutral-700 px-3 text-xs hover:border-neutral-500"
                  onClick={() =>
                    iMonBalance !== undefined && setRedeemInput(formatUnits(iMonBalance, 18))
                  }
                >
                  Max
                </button>
              </div>
              <div className="mb-3 space-y-0.5 text-xs text-neutral-500">
                {previewRedeemAmts?.[0]?.map((tok, i) => {
                  const meta = basketAssets.find(
                    (a) => a.address.toLowerCase() === tok.toLowerCase(),
                  );
                  const amt = previewRedeemAmts[1]?.[i] ?? 0n;
                  if (amt === 0n) return null;
                  return (
                    <div key={tok}>
                      {meta?.symbol ?? shortAddress(tok)}: {formatToken(amt)}
                    </div>
                  );
                }) ?? <span>Preview —</span>}
              </div>
              <button
                type="button"
                onClick={onRedeem}
                disabled={isWritePending || isConfirming || step !== "idle"}
                className="w-full rounded-lg border border-neutral-600 px-4 py-2 text-sm font-semibold hover:border-neutral-400 disabled:opacity-50"
              >
                {step === "redeeming"
                  ? "Redeeming…"
                  : isConfirming
                    ? "Confirming…"
                    : `Redeem ${shareSymbol}`}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-neutral-500">
                Always open: pro-rata raw LST basket, no oracle, never paused.
              </p>
            </div>
          </section>
        </>
      )}

      {(localError || txHash) && (
        <div className="rounded-xl border border-neutral-800 px-4 py-3 text-sm">
          {localError && <p className="text-rose-400">{localError}</p>}
          {txHash && (
            <p className="font-mono text-xs text-neutral-400">
              Tx{" "}
              <a
                className="text-violet-400 hover:underline"
                href={explorerTx(txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(txHash)}
              </a>
              {isConfirmed ? " · confirmed" : isConfirming ? " · confirming…" : ""}
            </p>
          )}
        </div>
      )}

      <p className="font-mono text-[10px] text-neutral-600">
        totalSupply {formatToken(totalSupply)} {shareSymbol}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/30 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-lg">{value}</div>
    </div>
  );
}

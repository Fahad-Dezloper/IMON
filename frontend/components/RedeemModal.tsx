"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Modal } from "./ui/Modal";
import { MONAD_CHAIN_ID, basketAssets, explorerTx, iMONVaultABI, vaultAddress } from "@/lib/contracts";
import { formatToken, parseToken, shortAddress } from "@/lib/format";

export function RedeemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const onMonad = chainId === MONAD_CHAIN_ID;
  const vault = vaultAddress ?? undefined;

  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId: MONAD_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const { data: balData } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(vault && address), refetchInterval: 8_000 },
  });
  const iMonBalance = balData as bigint | undefined;

  const amt = useMemo(() => parseToken(amount), [amount]);

  const { data: previewRedeem } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "previewRedeem",
    args: amt && amt > 0n ? [amt] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(vault && amt && amt > 0n) },
  });
  const preview = previewRedeem as [readonly `0x${string}`[], readonly bigint[]] | undefined;

  const tooMuch = Boolean(amt && iMonBalance !== undefined && amt > iMonBalance);
  const done = Boolean(txHash);

  function close() {
    setAmount("");
    setTxHash(undefined);
    setPending(false);
    setError(null);
    onClose();
  }

  async function submit() {
    setError(null);
    if (!vault || !address || !amt || amt <= 0n) {
      setError("Enter an amount of iMON to redeem.");
      return;
    }
    if (tooMuch) {
      setError("Insufficient iMON balance.");
      return;
    }
    try {
      if (!publicClient) throw new Error("RPC client not ready");
      setPending(true);
      const hash = await writeContractAsync({
        address: vault,
        abi: iMONVaultABI,
        functionName: "redeem",
        args: [amt, address],
        chainId: MONAD_CHAIN_ID,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setPending(false);
      toast.success("Redeemed iMON → basket");
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message.split("\n")[0] : "Redeem failed");
    }
  }

  return (
    <Modal open={open} onClose={close} title="Redeem iMON">
      {done ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={22} />
          </div>
          <p className="font-semibold text-ink">Redeemed</p>
          <p className="mt-1 text-sm text-ink-3">Your pro-rata basket has been returned.</p>
          <a
            href={explorerTx(txHash!)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-mono text-xs text-accent-ink hover:underline"
          >
            {shortAddress(txHash!)} ↗
          </a>
          <button
            onClick={close}
            className="mt-5 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-ink-3">
              <span>iMON to redeem</span>
              <span className="tnum">Balance: {formatToken(iMonBalance)} iMON</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2.5 shadow-surface">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.0"
                className="tnum w-full bg-transparent text-lg text-ink outline-none placeholder:text-ink-4"
              />
              <button
                onClick={() => iMonBalance !== undefined && setAmount(formatUnits(iMonBalance, 18))}
                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-ink-2 hover:text-ink"
              >
                MAX
              </button>
            </div>
            {tooMuch && <p className="mt-1 text-xs text-error">Exceeds your iMON balance.</p>}
          </div>

          <div className="rounded-xl bg-bg p-3 text-sm">
            <p className="mb-2 text-ink-3">You&rsquo;ll receive your slice of each token:</p>
            {preview && preview[0].length ? (
              preview[0].map((tok, i) => {
                const meta = basketAssets.find((a) => a.address.toLowerCase() === tok.toLowerCase());
                const amtOut = preview[1][i] ?? 0n;
                if (amtOut === 0n) return null;
                return (
                  <div key={tok} className="flex items-center justify-between py-0.5">
                    <span className="text-ink">{meta?.symbol ?? shortAddress(tok)}</span>
                    <span className="tnum text-ink">{formatToken(amtOut)}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-ink-4">Enter an amount to preview.</p>
            )}
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          {!isConnected ? (
            <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm text-ink-3">
              Connect a wallet to redeem.
            </p>
          ) : !onMonad ? (
            <button
              onClick={() => switchChain({ chainId: MONAD_CHAIN_ID })}
              className="w-full rounded-lg bg-warning py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Switch to Monad
            </button>
          ) : (
            <button
              disabled={!amt || amt <= 0n || tooMuch || pending}
              onClick={submit}
              className="w-full rounded-lg bg-accent py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Redeeming…" : "Redeem iMON"}
            </button>
          )}
          <p className="text-center text-xs text-ink-4">
            Pro-rata basket, no oracle, never paused.
          </p>
        </div>
      )}
    </Modal>
  );
}

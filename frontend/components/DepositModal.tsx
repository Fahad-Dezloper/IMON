"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-ink-3">{k}</span>
      <span className="tnum font-medium text-ink">{v}</span>
    </div>
  );
}

export function DepositModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const onMonad = chainId === MONAD_CHAIN_ID;
  const vault = vaultAddress ?? undefined;

  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient({ chainId: MONAD_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const { data: mon } = useBalance({
    address,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(address) },
  });

  const amt = useMemo(() => parseToken(amount), [amount]);

  const { data: previewMon } = useReadContract({
    address: vault,
    abi: iMONVaultABI,
    functionName: "previewDepositMON",
    args: amt && amt > 0n ? [amt] : undefined,
    chainId: MONAD_CHAIN_ID,
    query: { enabled: Boolean(vault && amt && amt > 0n) },
  });
  const previewShares = (previewMon as [bigint, `0x${string}`] | undefined)?.[0];
  const previewTarget = (previewMon as [bigint, `0x${string}`] | undefined)?.[1];
  const targetMeta = basketAssets.find(
    (a) => previewTarget && a.address.toLowerCase() === previewTarget.toLowerCase(),
  );

  const tooMuch = Boolean(amt && mon?.value !== undefined && amt > mon.value);
  const done = Boolean(txHash);

  function close() {
    setAmount("");
    setTxHash(undefined);
    setPending(false);
    setError(null);
    onClose();
  }

  function setMax() {
    if (!mon?.value) return;
    const gasReserve = 20_000_000_000_000_000n; // ~0.02 MON for gas
    const max = mon.value > gasReserve ? mon.value - gasReserve : 0n;
    setAmount(formatUnits(max, 18));
  }

  async function submit() {
    setError(null);
    if (!vault || !address || !amt || amt <= 0n) {
      setError("Enter a MON amount greater than 0.");
      return;
    }
    if (tooMuch) {
      setError("Insufficient MON balance.");
      return;
    }
    try {
      if (!publicClient) throw new Error("RPC client not ready");
      setPending(true);
      const minShares = previewShares !== undefined ? (previewShares * 9900n) / 10_000n : 0n; // 1% slippage
      const hash = await writeContractAsync({
        address: vault,
        abi: iMONVaultABI,
        functionName: "depositMON",
        args: [address, minShares],
        value: amt,
        chainId: MONAD_CHAIN_ID,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setPending(false);
      toast.success("Deposited MON → iMON");
    } catch (e) {
      setPending(false);
      setError(e instanceof Error ? e.message.split("\n")[0] : "Deposit failed");
    }
  }

  return (
    <Modal open={open} onClose={close} title="Deposit MON">
      {done ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <Check size={22} />
          </div>
          <p className="font-semibold text-ink">Deposited</p>
          <p className="mt-1 text-sm text-ink-3">
            You received ~{formatToken(previewShares)} iMON.
          </p>
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
              <span>Amount (MON)</span>
              <span className="tnum">Balance: {formatToken(mon?.value)} MON</span>
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
                onClick={setMax}
                className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-ink-2 hover:text-ink"
              >
                MAX
              </button>
            </div>
            {tooMuch && <p className="mt-1 text-xs text-error">Exceeds your MON balance.</p>}
          </div>

          <div className="rounded-xl bg-bg p-3 text-sm">
            <Row k="You'll receive" v={`~${formatToken(previewShares)} iMON`} />
            <Row k="Auto-swaps into" v={targetMeta ? targetMeta.symbol : "best-APY sleeve"} />
            <Row k="Max slippage" v="1%" />
            <Row k="Network" v="Monad (143)" />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          {!isConnected ? (
            <p className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm text-ink-3">
              Connect a wallet to deposit.
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
              {pending ? "Depositing…" : "Deposit MON"}
            </button>
          )}
          <p className="text-center text-xs text-ink-4">
            One transaction: wrap → swap → mint.
          </p>
        </div>
      )}
    </Modal>
  );
}

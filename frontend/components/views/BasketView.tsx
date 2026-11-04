"use client";

import { useMemo, useState } from "react";
import { useVaultData } from "@/lib/useVaultData";
import { useUserPosition } from "@/lib/useUserPosition";
import { LstCard } from "@/components/LstCard";
import { Projection } from "@/components/Projection";

export function BasketView() {
  const { basket, stats } = useVaultData();
  const pos = useUserPosition();

  const principal = pos.connected ? pos.valueMon : 25_000;
  const [weights, setWeights] = useState<number[]>(() => basket.map((a) => a.weightBps / 100));

  const blendedApy = useMemo(
    () => basket.reduce((acc, a, i) => acc + (weights[i] / 100) * a.apy, 0),
    [basket, weights],
  );
  const netApy = blendedApy * (1 - stats.yieldFeeBps / 10_000);

  function setWeight(i: number, v: number) {
    const clamped = Math.max(0, Math.min(100, v));
    const others = weights.reduce((s, w, j) => (j === i ? s : s + w), 0);
    const remaining = 100 - clamped;
    setWeights(
      weights.map((w, j) => {
        if (j === i) return clamped;
        if (others <= 0) return remaining / (weights.length - 1);
        return w * (remaining / others);
      }),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* left: the boxes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        {basket.map((a, i) => (
          <LstCard key={a.symbol} asset={a} weight={weights[i]} onWeight={(v) => setWeight(i, v)} />
        ))}
      </div>
      {/* right: the number */}
      <Projection principal={principal} netApy={netApy} />
    </div>
  );
}

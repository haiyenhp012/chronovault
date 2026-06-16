import { useState, useEffect, useCallback } from "react";
import { Contract, formatUnits, getAddress } from "ethers";
import { ADDRESSES, AIRDROP_ABI, TOKEN_ABI, AIRDROP_CLAIMS, CHAIN } from "../config";
import { useToast } from "./Toast";

function fmt(v) {
  return Number(formatUnits(v, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function AirdropCard({ wallet }) {
  const { address, provider, wrongNetwork } = wallet;
  const toast = useToast();

  const [status, setStatus] = useState("idle"); // idle | eligible | claimed | none
  const [allocation, setAllocation] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const entry = address ? AIRDROP_CLAIMS[getAddress(address)] : null;

  const load = useCallback(async () => {
    if (!address || !provider || wrongNetwork) return;
    setLoading(true);
    try {
      const airdrop = new Contract(ADDRESSES.airdrop, AIRDROP_ABI, provider);
      const token = new Contract(ADDRESSES.token, TOKEN_ABI, provider);
      const [bal, claimedFlag] = await Promise.all([
        token.balanceOf(address),
        airdrop.claimed(address),
      ]);
      setBalance(bal);

      if (!entry) {
        setStatus("none");
        setAllocation(null);
        return;
      }
      setAllocation(BigInt(entry.amount));
      setStatus(claimedFlag ? "claimed" : "eligible");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address, provider, wrongNetwork, entry]);

  useEffect(() => {
    load();
  }, [load]);

  async function onClaim() {
    if (!entry) return;
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const airdrop = new Contract(ADDRESSES.airdrop, AIRDROP_ABI, signer);
      const tx = await airdrop.claim(entry.amount, entry.proof);
      toast.info("Claim submitted", "Waiting for confirmation…");
      await tx.wait();
      toast.success("Airdrop claimed", `${fmt(entry.amount)} CHR is now in your wallet`);
      setStatus("claimed");
      await load();
    } catch (e) {
      toast.error("Claim failed", e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass glass-hover group h-full rounded-3xl p-7">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-chrono-400/20 bg-chrono-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-chrono-300">
            Step 1
          </div>
          <h2 className="text-xl font-bold text-white">CHR Airdrop</h2>
          <p className="mt-1 text-sm text-slate-400">
            Claim your allocation of the Chrono token.
          </p>
        </div>
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-chrono-500 to-aqua-400 text-2xl shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          🎁
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat
          label="Your allocation"
          value={allocation != null ? `${fmt(allocation)} CHR` : "—"}
          loading={loading && allocation == null && status === "idle"}
        />
        <Stat
          label="CHR balance"
          value={balance != null ? `${fmt(balance)} CHR` : "—"}
          loading={loading && balance == null}
        />
      </div>

      <div className="mt-6">
        {!address ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-sm text-slate-400">
            Connect your wallet to check eligibility
          </p>
        ) : status === "none" ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-center text-sm text-slate-400">
            This address is not in the airdrop list
          </p>
        ) : status === "claimed" ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3.5 text-center text-sm font-medium text-emerald-300">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-emerald-950">
              ✓
            </span>
            Already claimed
          </div>
        ) : (
          <button
            onClick={onClaim}
            disabled={busy || wrongNetwork}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
            )}
            {busy ? "Claiming…" : `Claim ${allocation != null ? fmt(allocation) : ""} CHR`}
          </button>
        )}
      </div>

      <a
        href={`${CHAIN.explorer}/address/${ADDRESSES.airdrop}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 block text-center text-xs text-slate-500 transition hover:text-chrono-400"
      >
        Airdrop contract ↗
      </a>
    </div>
  );
}

function Stat({ label, value, loading }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      {loading ? (
        <div className="skeleton mt-1.5 h-4 w-20 rounded" />
      ) : (
        <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
      )}
    </div>
  );
}

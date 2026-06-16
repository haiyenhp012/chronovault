import { useState, useEffect, useCallback } from "react";
import { Contract, parseUnits, formatUnits, MaxUint256, isAddress } from "ethers";
import { ADDRESSES, VAULT_ABI, TOKEN_ABI, TOKENS, CHAIN } from "../config";
import { useToast } from "./Toast";

const PRESETS = [
  { label: "1 min", secs: 60 },
  { label: "1 hour", secs: 3600 },
  { label: "1 day", secs: 86400 },
  { label: "30 days", secs: 2592000 },
];

function fmtDate(secs) {
  const d = new Date(secs * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBal(v, decimals) {
  return Number(formatUnits(v, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export function LockForm({ wallet, onLocked }) {
  const { address, provider, wrongNetwork } = wallet;
  const toast = useToast();

  const [tokenKey, setTokenKey] = useState("OPN");
  const [customAddr, setCustomAddr] = useState("");
  const [customMeta, setCustomMeta] = useState(null); // { symbol, decimals } | null
  const [customError, setCustomError] = useState("");

  const [amount, setAmount] = useState("");
  const [cliffSecs, setCliffSecs] = useState(60);
  const [durationSecs, setDurationSecs] = useState(3600);
  const [balance, setBalance] = useState(null);
  const [allowance, setAllowance] = useState(0n);
  const [busy, setBusy] = useState(false);

  const selected = TOKENS.find((t) => t.key === tokenKey);
  const isNative = !!selected?.native;
  const isCustom = !!selected?.custom;

  // Resolve the effective token: address + decimals + symbol in play right now.
  const effective = (() => {
    if (isCustom) {
      if (customMeta && isAddress(customAddr)) {
        return { address: customAddr, decimals: customMeta.decimals, symbol: customMeta.symbol };
      }
      return null;
    }
    return { address: selected.address, decimals: selected.decimals, symbol: selected.symbol };
  })();

  // Look up custom token metadata when a valid address is pasted.
  useEffect(() => {
    let cancelled = false;
    if (!isCustom || !provider) {
      setCustomMeta(null);
      setCustomError("");
      return;
    }
    if (!customAddr) {
      setCustomMeta(null);
      setCustomError("");
      return;
    }
    if (!isAddress(customAddr)) {
      setCustomMeta(null);
      setCustomError("Not a valid address");
      return;
    }
    (async () => {
      try {
        const erc20 = new Contract(customAddr, TOKEN_ABI, provider);
        const [sym, dec] = await Promise.all([erc20.symbol(), erc20.decimals()]);
        if (cancelled) return;
        setCustomMeta({ symbol: sym, decimals: Number(dec) });
        setCustomError("");
      } catch {
        if (cancelled) return;
        setCustomMeta(null);
        setCustomError("Not an ERC-20 token on this network");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustom, customAddr, provider]);

  const load = useCallback(async () => {
    if (!address || !provider || wrongNetwork || !effective) {
      setBalance(null);
      setAllowance(0n);
      return;
    }
    try {
      if (isNative) {
        const bal = await provider.getBalance(address);
        setBalance(bal);
        setAllowance(MaxUint256); // native never needs approval
        return;
      }
      const token = new Contract(effective.address, TOKEN_ABI, provider);
      const [bal, alw] = await Promise.all([
        token.balanceOf(address),
        token.allowance(address, ADDRESSES.vault),
      ]);
      setBalance(bal);
      setAllowance(alw);
    } catch (e) {
      console.error(e);
    }
  }, [address, provider, wrongNetwork, isNative, effective?.address]);

  useEffect(() => {
    load();
  }, [load]);

  const decimals = effective?.decimals ?? 18;
  const symbol = effective?.symbol ?? "";

  const amountWei = (() => {
    try {
      return amount && effective ? parseUnits(amount, decimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  const needsApproval = !isNative && amountWei > 0n && allowance < amountWei;
  const scheduleValid = durationSecs > cliffSecs;
  const now = Math.floor(Date.now() / 1000);

  async function onApprove() {
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const token = new Contract(effective.address, TOKEN_ABI, signer);
      const tx = await token.approve(ADDRESSES.vault, MaxUint256);
      toast.info("Approval submitted", "Waiting for confirmation…");
      await tx.wait();
      toast.success("Approved", `ChronoVault can now lock your ${symbol}`);
      await load();
    } catch (e) {
      toast.error("Approval failed", e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onLock() {
    if (!effective) {
      toast.error("Select a token", "Pick a token or enter a valid ERC-20 address");
      return;
    }
    if (amountWei <= 0n) {
      toast.error("Invalid amount", "Enter an amount greater than zero");
      return;
    }
    if (!scheduleValid) {
      toast.error("Invalid schedule", "Duration must be longer than the cliff");
      return;
    }
    setBusy(true);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(ADDRESSES.vault, VAULT_ABI, signer);
      const start = now;
      const cliff = now + cliffSecs;
      const end = now + durationSecs;

      let tx;
      if (isNative) {
        tx = await vault.lockNative(address, start, cliff, end, { value: amountWei });
      } else {
        tx = await vault.lock(effective.address, amountWei, address, start, cliff, end);
      }
      toast.info("Lock submitted", "Waiting for confirmation…");
      await tx.wait();
      toast.success("Position created", `Locked ${amount} ${symbol} with linear vesting`);
      setAmount("");
      await load();
      onLocked?.();
    } catch (e) {
      toast.error("Lock failed", e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  const lockDisabled = busy || wrongNetwork || amountWei <= 0n || !scheduleValid || !effective;

  return (
    <div className="glass glass-hover group h-full rounded-3xl p-7">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-aqua-400/20 bg-aqua-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-aqua-300">
            Step 2
          </div>
          <h2 className="text-xl font-bold text-white">Create a Lock</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lock native OPN or any ERC-20 under cliff + linear vesting. You receive a tradable NFT position.
          </p>
        </div>
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-aqua-400 to-chrono-500 text-2xl shadow-glow-aqua transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
          🔒
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {/* Token selector */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wider text-slate-500">
            Token to lock
          </label>
          <div className="flex flex-wrap gap-2">
            {TOKENS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTokenKey(t.key);
                  setAmount("");
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  tokenKey === t.key
                    ? "border-chrono-400/50 bg-chrono-500/20 text-white shadow-[0_0_16px_-6px_rgba(108,92,255,0.8)]"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                {t.symbol}
                {t.native && <span className="ml-1 text-[9px] text-aqua-400">native</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Custom address input */}
        {isCustom && (
          <div>
            <input
              value={customAddr}
              onChange={(e) => setCustomAddr(e.target.value.trim())}
              placeholder="0x… ERC-20 contract address"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-chrono-400/50"
            />
            {customError && <p className="mt-1.5 text-[11px] text-rose-400">{customError}</p>}
            {customMeta && (
              <p className="mt-1.5 text-[11px] text-aqua-400">
                {customMeta.symbol} · {customMeta.decimals} decimals
              </p>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-slate-500">Amount</label>
            {balance != null && effective && (
              <button
                onClick={() => {
                  // For native, leave a little for gas.
                  const usable = isNative
                    ? balance > parseUnits("0.001", 18)
                      ? balance - parseUnits("0.001", 18)
                      : 0n
                    : balance;
                  setAmount(formatUnits(usable, decimals));
                }}
                className="text-xs font-medium text-chrono-400 transition hover:text-chrono-300"
              >
                Max: {fmtBal(balance, decimals)} {symbol}
              </button>
            )}
          </div>
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4 transition focus-within:border-chrono-400/50 focus-within:bg-white/[0.07]">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={!effective}
              className="w-full bg-transparent py-3.5 font-mono text-lg text-white outline-none placeholder:text-slate-600 disabled:opacity-50"
            />
            <span className="font-semibold text-slate-400">{symbol || "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SchedulePicker label="Cliff" value={cliffSecs} onChange={setCliffSecs} />
          <SchedulePicker label="Total duration" value={durationSecs} onChange={setDurationSecs} />
        </div>

        {/* Schedule preview */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Cliff unlock</span>
            <span className={`font-mono ${scheduleValid ? "text-white" : "text-rose-400"}`}>
              {fmtDate(now + cliffSecs)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Fully vested</span>
            <span className={`font-mono ${scheduleValid ? "text-aqua-400" : "text-rose-400"}`}>
              {fmtDate(now + durationSecs)}
            </span>
          </div>
          {!scheduleValid && (
            <p className="mt-2 text-[11px] text-rose-400">
              Duration must be longer than the cliff.
            </p>
          )}
        </div>

        {needsApproval ? (
          <button
            onClick={onApprove}
            disabled={busy || wrongNetwork || !effective}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
            )}
            {busy ? "Approving…" : `Approve ${symbol}`}
          </button>
        ) : (
          <button
            onClick={onLock}
            disabled={lockDisabled}
            className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
            )}
            {busy ? "Locking…" : isNative ? "Lock OPN" : "Lock tokens"}
          </button>
        )}
      </div>

      <a
        href={`${CHAIN.explorer}/address/${ADDRESSES.vault}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 block text-center text-xs text-slate-500 transition hover:text-chrono-400"
      >
        Vault contract ↗
      </a>
    </div>
  );
}

function SchedulePicker({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-wider text-slate-500">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.secs}
            onClick={() => onChange(p.secs)}
            className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
              value === p.secs
                ? "border-chrono-400/50 bg-chrono-500/20 text-white shadow-[0_0_16px_-6px_rgba(108,92,255,0.8)]"
                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

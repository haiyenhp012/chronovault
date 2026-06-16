import { useState, useEffect, useCallback, useRef } from "react";
import { Contract, formatUnits } from "ethers";
import { ADDRESSES, VAULT_ABI, TOKEN_ABI, TOKENS, NATIVE, CHAIN } from "../config";
import { useToast } from "./Toast";

function fmt(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// Static metadata for the known tokens, keyed by lowercased address.
const KNOWN = {};
for (const t of TOKENS) {
  if (t.address) KNOWN[t.address.toLowerCase()] = { symbol: t.symbol, decimals: t.decimals };
}
KNOWN[NATIVE.toLowerCase()] = { symbol: "OPN", decimals: 18 };

export function Positions({ wallet, refreshKey }) {
  const { address, provider, wrongNetwork } = wallet;
  const toast = useToast();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const metaCache = useRef({ ...KNOWN });

  // Tick every second so progress bars animate live.
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Resolve a token's { symbol, decimals }, caching unknown tokens after one lookup.
  const resolveMeta = useCallback(
    async (tokenAddr) => {
      const key = tokenAddr.toLowerCase();
      if (metaCache.current[key]) return metaCache.current[key];
      try {
        const erc20 = new Contract(tokenAddr, TOKEN_ABI, provider);
        const [sym, dec] = await Promise.all([erc20.symbol(), erc20.decimals()]);
        const meta = { symbol: sym, decimals: Number(dec) };
        metaCache.current[key] = meta;
        return meta;
      } catch {
        const meta = { symbol: "???", decimals: 18 };
        metaCache.current[key] = meta;
        return meta;
      }
    },
    [provider]
  );

  const load = useCallback(async () => {
    if (!address || !provider || wrongNetwork) {
      setPositions([]);
      return;
    }
    setLoading(true);
    try {
      const vault = new Contract(ADDRESSES.vault, VAULT_ABI, provider);
      const next = Number(await vault.nextId());
      const owned = [];
      // Scan all minted ids; ownerOf reverts for burned positions.
      for (let id = 1; id < next; id++) {
        try {
          const owner = await vault.ownerOf(id);
          if (owner.toLowerCase() !== address.toLowerCase()) continue;
          const [lock, claimable] = await Promise.all([
            vault.getLock(id),
            vault.claimable(id),
          ]);
          const meta = await resolveMeta(lock.token);
          owned.push({
            id,
            token: lock.token,
            symbol: meta.symbol,
            decimals: meta.decimals,
            amount: lock.amount,
            claimed: lock.claimed,
            start: Number(lock.start),
            cliff: Number(lock.cliff),
            end: Number(lock.end),
            claimable,
          });
        } catch {
          // burned or non-existent; skip
        }
      }
      setPositions(owned);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address, provider, wrongNetwork, resolveMeta]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function onClaim(id) {
    setClaimingId(id);
    try {
      const signer = await provider.getSigner();
      const vault = new Contract(ADDRESSES.vault, VAULT_ABI, signer);
      const tx = await vault.claim(id);
      toast.info("Claim submitted", "Waiting for confirmation…");
      await tx.wait();
      toast.success("Claimed", `Position #${id} vested tokens sent to your wallet`);
      await load();
    } catch (e) {
      toast.error("Claim failed", e.shortMessage || e.message);
    } finally {
      setClaimingId(null);
    }
  }

  if (!address) return null;

  const claimableCount = positions.filter((p) => p.claimable > 0n).length;

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            Step 3
          </div>
          <h2 className="text-2xl font-bold text-white">Your Positions</h2>
        </div>

        <div className="flex items-center gap-3">
          {positions.length > 0 && (
            <>
              <Summary label="Positions" value={String(positions.length)} />
              <Summary
                label="Ready to claim"
                value={String(claimableCount)}
                highlight={claimableCount > 0}
              />
            </>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:border-white/20 hover:text-white"
          >
            <span className={loading ? "inline-block animate-spin-slow" : ""}>↻</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loading && positions.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : positions.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
            ⏳
          </div>
          <p className="text-base font-medium text-white">No active positions yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
            Create a lock above to mint your first vesting position. It will show up
            here as a tradable NFT with live progress.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {positions.map((p, i) => (
            <div
              key={p.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <PositionCard
                p={p}
                now={now}
                claiming={claimingId === p.id}
                onClaim={() => onClaim(p.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, highlight }) {
  return (
    <div className="hidden rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2 text-right sm:block">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold ${
          highlight ? "text-aqua-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PositionCard({ p, now, claiming, onClaim }) {
  const dec = p.decimals;
  const sym = p.symbol;
  const total = Number(formatUnits(p.amount, dec));
  const claimed = Number(formatUnits(p.claimed, dec));
  const claimable = Number(formatUnits(p.claimable, dec));

  const span = p.end - p.start;
  const elapsed = Math.min(Math.max(now - p.start, 0), span);
  const vestPct = span > 0 ? (elapsed / span) * 100 : 0;
  const claimedPct = total > 0 ? (claimed / total) * 100 : 0;

  const beforeCliff = now < p.cliff;
  const fullyVested = now >= p.end;
  const hasClaimable = p.claimable > 0n;

  let status, statusColor, dotColor;
  if (fullyVested) {
    status = "Fully vested";
    statusColor = "text-aqua-400";
    dotColor = "bg-aqua-400";
  } else if (beforeCliff) {
    status = "In cliff";
    statusColor = "text-amber-400";
    dotColor = "bg-amber-400";
  } else {
    status = "Vesting";
    statusColor = "text-chrono-400";
    dotColor = "bg-chrono-400";
  }

  function countdown(target) {
    const d = target - now;
    if (d <= 0) return "now";
    const days = Math.floor(d / 86400);
    const h = Math.floor((d % 86400) / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = d % 60;
    if (days > 0) return `${days}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="glass glass-hover h-full rounded-3xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-chrono-500 to-aqua-400 font-mono text-sm font-bold text-white shadow-glow">
            #{p.id}
          </div>
          <div>
            <p className="font-mono text-base font-semibold text-white">
              {fmt(total)} {sym}
            </p>
            <p className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              {status}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          NFT
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Vesting progress</span>
            <span className="font-mono font-semibold text-white">
              {vestPct.toFixed(1)}%
            </span>
          </div>
          {/* Track with claimed underlay + vested fill */}
          <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chrono-500 to-aqua-400 transition-all duration-700 ${
                !fullyVested && !beforeCliff ? "shimmer" : ""
              }`}
              style={{ width: `${vestPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full border-r border-white/40 bg-white/15"
              style={{ width: `${claimedPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>Claimed {claimedPct.toFixed(0)}%</span>
            <span>{fmt(total)} {sym} total</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <Stat
            label="Claimable now"
            value={`${fmt(claimable)} ${sym}`}
            highlight={hasClaimable}
          />
          <Stat label="Claimed" value={`${fmt(claimed)} ${sym}`} />
          <Stat
            label={beforeCliff ? "Cliff ends in" : fullyVested ? "Vesting" : "Fully vests in"}
            value={beforeCliff ? countdown(p.cliff) : fullyVested ? "Complete" : countdown(p.end)}
          />
          <Stat label="Token" value={sym} />
        </div>

        <button
          onClick={onClaim}
          disabled={!hasClaimable || claiming}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white"
        >
          {claiming && (
            <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
          )}
          {claiming
            ? "Claiming…"
            : hasClaimable
            ? `Claim ${fmt(claimable)} ${sym}`
            : beforeCliff
            ? "Locked until cliff"
            : "Nothing to claim"}
        </button>
      </div>

      <a
        href={`${CHAIN.explorer}/token/${ADDRESSES.vault}/instance/${p.id}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block text-center text-xs text-slate-500 transition hover:text-chrono-400"
      >
        View NFT #{p.id} ↗
      </a>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-0.5 font-mono text-sm ${
          highlight ? "text-aqua-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <div className="skeleton h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
      <div className="skeleton mt-5 h-2.5 w-full rounded-full" />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="skeleton h-12 rounded-lg" />
        <div className="skeleton h-12 rounded-lg" />
        <div className="skeleton h-12 rounded-lg" />
        <div className="skeleton h-12 rounded-lg" />
      </div>
      <div className="skeleton mt-4 h-11 w-full rounded-xl" />
    </div>
  );
}

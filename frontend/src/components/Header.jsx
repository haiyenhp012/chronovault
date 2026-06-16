import { useState } from "react";
import { CHAIN } from "../config";

function short(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function Header({ wallet }) {
  const { address, connecting, hasWallet, wrongNetwork, connect, switchNetwork } = wallet;
  const [copied, setCopied] = useState(false);

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="#" className="group flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-chrono-500/40 blur-md transition-opacity group-hover:opacity-80" />
            <img
              src="/chrono.svg"
              alt="ChronoVault"
              className="relative h-9 w-9 transition-transform group-hover:scale-105"
            />
          </div>
          <div>
            <p className="text-lg font-bold leading-none text-white">
              Chrono<span className="gradient-text">Vault</span>
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Time-locked vesting
            </p>
          </div>
        </a>

        <div className="flex items-center gap-3">
          {address && (
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:flex">
              <span
                className={`h-2 w-2 rounded-full ${
                  wrongNetwork ? "bg-rose-400" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                }`}
              />
              {wrongNetwork ? "Wrong network" : CHAIN.name}
            </span>
          )}

          {!hasWallet ? (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:border-white/25 hover:bg-white/10"
            >
              Install wallet
            </a>
          ) : !address ? (
            <button
              onClick={connect}
              disabled={connecting}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white"
            >
              {connecting && (
                <span className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-white/30 border-t-white" />
              )}
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          ) : wrongNetwork ? (
            <button
              onClick={switchNetwork}
              className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold text-white"
            >
              Switch to OPN
            </button>
          ) : (
            <button
              onClick={copyAddr}
              className="group flex items-center gap-2 rounded-xl border border-chrono-400/30 bg-chrono-500/10 px-4 py-2 font-mono text-sm text-chrono-300 transition hover:border-chrono-400/50 hover:bg-chrono-500/15"
            >
              <span className="h-2 w-2 rounded-full bg-chrono-400" />
              {copied ? "Copied!" : short(address)}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

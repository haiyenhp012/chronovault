import { useState, useEffect, useRef } from "react";
import { CHAIN } from "../config";

function short(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function Header({ wallet }) {
  const { address, connecting, hasWallet, wrongNetwork, connect, disconnect, switchNetwork } = wallet;
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="group flex items-center gap-2 rounded-xl border border-chrono-400/30 bg-chrono-500/10 px-4 py-2 font-mono text-sm text-chrono-300 transition hover:border-chrono-400/50 hover:bg-chrono-500/15"
              >
                <span className="h-2 w-2 rounded-full bg-chrono-400" />
                {short(address)}
                <span className={`text-[10px] transition-transform ${menuOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-950/95 py-1 shadow-xl backdrop-blur-xl">
                  <button
                    onClick={() => {
                      copyAddr();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    {copied ? "Copied!" : "Copy address"}
                  </button>
                  <button
                    onClick={() => {
                      disconnect();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

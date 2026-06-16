import { useState } from "react";
import { useWallet } from "./useWallet";
import { ToastProvider } from "./components/Toast";
import { Header } from "./components/Header";
import { AirdropCard } from "./components/AirdropCard";
import { LockForm } from "./components/LockForm";
import { Positions } from "./components/Positions";
import { ADDRESSES, CHAIN } from "./config";

export default function App() {
  const wallet = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <ToastProvider>
      <div className="bg-grid" />
      <div className="aurora">
        <span />
        <span />
        <span />
      </div>
      <div className="noise" />

      <Header wallet={wallet} />

      <main className="mx-auto max-w-6xl px-5 pb-28">
        {/* Hero */}
        <section className="relative py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 shadow-inner-top backdrop-blur-sm">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-aqua-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-aqua-400" />
            </span>
            Live on OPN Chain Testnet
          </span>

          <h1 className="mt-7 text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-7xl">
            Lock tokens.
            <br className="hidden sm:block" />{" "}
            <span className="gradient-text">Vest with proof.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            ChronoVault turns every time-lock into a tradable NFT position. Cliff
            schedules, linear vesting, and on-chain claims — built for teams,
            presales, and OTC escrow.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#app"
              className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold text-white"
            >
              Launch App
            </a>
            <a
              href={`${CHAIN.explorer}/address/${ADDRESSES.vault}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:border-white/25 hover:bg-white/10"
            >
              View on Explorer ↗
            </a>
          </div>

          {/* Trust stats */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            <HeroStat value="Cliff + Linear" label="Vesting" />
            <HeroStat value="ERC-721" label="Tradable positions" />
            <HeroStat value="Merkle" label="Gas-light airdrop" />
            <HeroStat value="OPN 984" label="Chain ID" />
          </div>
        </section>

        {/* App */}
        <div id="app" className="scroll-mt-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
              <AirdropCard wallet={wallet} />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.12s" }}>
              <LockForm wallet={wallet} onLocked={bump} />
            </div>
          </div>

          <div className="mt-10">
            <Positions wallet={wallet} refreshKey={refreshKey} />
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="/chrono.svg" alt="" className="h-6 w-6" />
            <span className="text-sm font-semibold text-white">
              Chrono<span className="gradient-text">Vault</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Built for the IOPn Builders Programme · Season 1 · DeFi &amp; Open Finance
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <a
              href={`${CHAIN.explorer}/address/${ADDRESSES.vault}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-chrono-400"
            >
              Vault
            </a>
            <a
              href={`${CHAIN.explorer}/address/${ADDRESSES.token}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-chrono-400"
            >
              Token
            </a>
            <a
              href={`${CHAIN.explorer}/address/${ADDRESSES.airdrop}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-chrono-400"
            >
              Airdrop
            </a>
          </div>
        </div>
      </footer>
    </ToastProvider>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="glass rounded-2xl px-4 py-4 text-center">
      <p className="gradient-text text-lg font-bold sm:text-xl">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

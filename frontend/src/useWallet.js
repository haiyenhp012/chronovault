import { useState, useEffect, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { CHAIN } from "./config";

export function useWallet() {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const wrongNetwork = chainId !== null && chainId !== CHAIN.id;

  const refresh = useCallback(async () => {
    if (!window.ethereum) return;
    const p = new BrowserProvider(window.ethereum);
    const accounts = await p.send("eth_accounts", []);
    const net = await p.getNetwork();
    setProvider(p);
    setChainId(Number(net.chainId));
    setAddress(accounts.length ? accounts[0] : null);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) return;
    setConnecting(true);
    try {
      const p = new BrowserProvider(window.ethereum);
      const accounts = await p.send("eth_requestAccounts", []);
      const net = await p.getNetwork();
      setProvider(p);
      setChainId(Number(net.chainId));
      setAddress(accounts[0]);
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN.idHex }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN.idHex,
              chainName: CHAIN.name,
              rpcUrls: [CHAIN.rpcUrl],
              nativeCurrency: CHAIN.nativeCurrency,
              blockExplorerUrls: [CHAIN.explorer],
            },
          ],
        });
      }
    }
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(() => {
    // EIP-1193 has no programmatic revoke; we just forget local state.
    // The user re-authorizes via connect() next time.
    setAddress(null);
    setProvider(null);
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    refresh();
    const onAccounts = (a) => setAddress(a.length ? a[0] : null);
    const onChain = () => refresh();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, [refresh]);

  return {
    address,
    chainId,
    provider,
    connecting,
    hasWallet,
    wrongNetwork,
    connect,
    disconnect,
    switchNetwork,
    refresh,
  };
}

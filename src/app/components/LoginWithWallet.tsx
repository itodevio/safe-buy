import { useState } from "react"
import { ethers } from "ethers"
import { useAtom } from "jotai";
import walletAtom from "../atoms/wallet";
import toast from "react-hot-toast";

export default function LoginWithWallet() {
  const [wallet, setWallet] = useAtom(walletAtom);
  const [loading, setLoading] = useState(false);

  const loadWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      try {
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = signer.address;
        const balance = await provider.getBalance(address);
        
        setWallet({
          provider,
          address,
          balance,
        });
      } catch (err) {
        toast.error('You need to connect your wallet to use the dApp!');
      }

    }

    setLoading(false);
  };

  if (wallet.address) {
    return (
      <div
        className="h-14 bg-primary rounded px-4 min-w-44 text-neutral-light font-bold font-overpass flex flex-col justify-center cursor-pointer"
      >
        <span>Address: {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
        <span>Balance: {ethers.formatEther(wallet.balance || 0)} ETH</span>
      </div>
    )
  }

  return (
    <button
      className="h-10 bg-primary rounded px-4 min-w-44 text-neutral-light font-bold font-overpass"
      onClick={loadWallet}
      disabled={loading}
    >
      {loading ? 'Loading': 'Connect Wallet'}
    </button>
  )
}

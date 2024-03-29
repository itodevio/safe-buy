import { BrowserProvider } from "ethers";
import { atom } from "jotai";

type WalletAtom = {
  provider?: BrowserProvider;
  address?: string;
  balance?: bigint;
}

export default atom<WalletAtom>({});


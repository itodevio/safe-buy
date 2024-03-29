import type { MetaFunction } from "@remix-run/node";
import LoginWithWallet from "../components/LoginWithWallet";
import React, { useState } from "react";
import { useAtom } from "jotai";
import wallet from "../atoms/wallet";
import SafeBuy from '../contracts/SafePurchase.json'
import { ethers } from "ethers";

export const meta: MetaFunction = () => {
  return [
    { title: "SafeBuy" },
    { name: "description", content: "An Arbitrum dapp that allows you to sell an item with more certainty that you'll have the money in the end!" },
  ];
};

export default function Index() {
  const [tab, setTab] = useState('sell');
 
  return (
    <>
      <header className="bg-neutral-dark w-full flex justify-between px-48 items-center pt-8 pb-6 fixed top-0 border-b border-gray-900">
        <h1 className="font-overpass text-neutral-light font-bold text-3xl">SAFEBUY</h1>
        <LoginWithWallet />
      </header>
      <div className="h-full w-full flex justify-center items-center">
        <div className="w-[550px] bg-secondary-1 rounded-xl flex flex-col pb-10 gap-8">
          <div className="flex rounded-xl">
            <button
              className={`w-1/2 text-neutral-dark font-overpass text-xl py-4 font-bold border-r border-neutral-dark ${tab == 'buy' ? 'border-b': ''}`}
              onClick={() => setTab('sell')}
            >
              New SafeBuy
            </button>
            <button
              className={`w-1/2 text-neutral-dark font-overpass text-xl py-4 font-bold border-neutral-dark ${tab == 'sell' ? 'border-b': ''}`}
              onClick={() => setTab('buy')}
            >
              Ongoing SafeBuy
            </button>
          </div>
          {tab === 'sell' ? <SellForm /> : <BuyForm  />}
        </div>
      </div>
      <p className="absolute top-[calc(100vh-120px)] left-10 font-overpass font-bold text-neutral-light text-lg">
        Pay me a coffee ☕!
      </p>
      <p className="absolute top-[calc(100vh-90px)] left-10 font-overpass text-neutral-light text-md leading-6">
        Ethereum/Arbitrum: <span className="text-primary">0x7385358Ec37eFe93E80Bde8f71D53469829c4848</span><br />
        Solana: <span className="text-primary">ESS8fnbD2KyogRh9Cg6i5tWkuy4JuzG9AnwWFygeWLZk</span>
      </p>
    </>
  );
}

function SellForm() {
  const [{ balance, provider, address }, setWallet] = useAtom(wallet);
  const [loading, setLoading] = useState(false);
  const [buyer, setBuyer] = useState('');
  const [price, setPrice] = useState('');
  const [contract, setContract] = useState('');
  const [error, setError] = useState({ where: '', message: '' });

  const deployContract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!buyer) {
      setError({ where: 'buyer', message: '*Required' });
      return;
    }

    if (!price) {
      setError({ where: 'price', message: '*Required' });
      return;
    }

    if (ethers.parseEther(price) > balance!) {
      setError({ where: 'price', message: 'Invalid balance' });
    }

    setLoading(true);

    const factory = new ethers.ContractFactory(
      SafeBuy.abi,
      SafeBuy.bytecode,
      await provider?.getSigner()
    );

    try {
      const _contract = await factory.deploy(buyer, ethers.parseEther(price), { value: ethers.parseEther(price) * BigInt(2) });
      setContract(await _contract.getAddress());
      await _contract.waitForDeployment();
      const newBalance = await provider?.getBalance(address!);
      console.log({ balance, newBalance })
      setWallet({ address, provider, balance: newBalance })
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false);
    }
  }

  if (contract) {
    return (
      <div className="h-56 flex flex-col justify-center items-center gap-4">
        <span className="font-overpass font-bold text-neutral-dark">SMART CONTRACT DEPLOYED!</span>
        <img src="success.png" alt="Success" className="w-20 h-20" />
        <div className="flex flex-col items-center px-4 text-center">
          <span className="font-overpass  text-neutral-dark">Send the address to your buyer so they can pay it!</span>
          <span className="font-overpass font-bold text-neutral-dark text-lg">{contract.toUpperCase()}</span>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col items-center gap-4 h-80 w-full"
      onSubmit={deployContract}
    >
      <label className="flex flex-col font-overpass w-4/5">
        <span className="font-bold">Who will buy it?</span>
        <input
          className="px-4 py-2 text-lg text-neutral-dark bg-secondary-1 border border-neutral-dark rounded"
          value={buyer}
          onChange={e => {
            if (error.where === 'buyer') {
              setError({ where: '', message: '' });
            }
            setBuyer(`0x${e.target.value.replace(/ /g, '').replace('0x', '')}`)
          }}
          placeholder="Buyer's address"
        />
        <span className="text-primary font-overpass font-bold">
          {error.where == 'buyer' ? error.message : ''}
        </span>
      </label>
      <label className="flex flex-col font-overpass w-4/5">
        <span className="font-bold">How much does it cost?</span>
        <input
          className="px-4 py-2 text-lg text-neutral-dark bg-secondary-1 border border-neutral-dark rounded"
          value={price}
          onChange={e => {
            if (error.where === 'price') {
              setError({ where: '', message: '' });
            }
            setPrice(e.target.value)
          }}
          placeholder="Item's price in ETH"
        />
        <span className="text-primary font-overpass font-bold">
          {error.where == 'price' ? error.message : ''}
        </span>
      </label>
      <p className="flex flex-col font-overpass w-4/5 font-medium">
        *In order to sell your item in SafeBuy, you need to pay twice the price, then, once the purchase is completed, you can withdraw three times the price (your amount + buyer price).
      </p>
      <button
        className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Sell it!'}
      </button>
    </form>
  );
}

const states = [
  'Created',
  'Purchased',
  'Received',
  'Canceled',
  'Inactive'
]

function BuyForm() {
  const [{ balance, provider, address }, setWallet] = useAtom(wallet);
  const [price, setPrice] = useState(0n);
  const [state, setState] = useState('');
  const [buyer, setBuyer] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [error, setError] = useState({ where: '', message: '' });
  const [withdraw, setWithdraw] = useState(0n);

  const searchContract = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const contract = new ethers.Contract(
      contractAddress,
      SafeBuy.abi,
      await provider?.getSigner()
    );

    try {
      const [_state,_price, _buyer, _seller, _withdraw] = await Promise.all([
        contract.state(),
        contract.price(),
        contract.buyer(),
        contract.seller(),
        contract.pendingWithdrawals(address),
      ]);

      if (![_buyer, _seller].includes(address)) {
        setError({ where: 'contract', message: 'You are not authorized in this contract' });
        setLoading(false);
        return
      }

      setState(states[Number(_state)]);
      setPrice(_price);
      setBuyer(_buyer);
      setWithdraw(_withdraw);

      contract.on('SaleCanceled', (event) => {
        console.log('SaleCanceled');
        setState('Canceled');

        event.removeListener();
      });

      contract.on('PurchaseConfirmed', (event) => {
        console.log('PurchaseConfirmed');
        setState('Purchased');
        
        event.removeListener();
      });
      
      contract.on('PurchaseReceived', (event) => {
        console.log('PurchaseReceived');
        setState('Received');

        event.removeListener();
      });
    } catch (err) {
      setError({ where: 'contract', message: 'Failed to find contract' });
      console.log(err)
    } finally {
      setLoading(false);
    }
  }

  const payPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (balance! < price * BigInt(2)) {
      setError({ where: 'buy', message: 'Not enough balance' });
      return;
    }

    setLoading(true);

    const contract = new ethers.Contract(
      contractAddress,
      SafeBuy.abi,
      await provider?.getSigner()
    );

    try {
      const tx = await contract.purchase({ value: price * BigInt(2) });
      await tx.wait();
      setWallet({ address, provider, balance: await provider?.getBalance(address!) });
      setState('Purchased');
    } catch (err) {
      console.log(err);
      setError({ where: 'buy', message: 'Failed to confirm purchase' });
    } finally {
      setLoading(false);
    }
  }

  const cancelPurchase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const contract = new ethers.Contract(
      contractAddress,
      SafeBuy.abi,
      await provider?.getSigner()
    );

    try {
      const tx = await contract.cancelSale();
      await tx.wait();
      setWithdraw(await contract.pendingWithdrawals(address));
      setState('Canceled');
    } catch (err) {
      console.log(err);
      setError({ where: 'cancel', message: 'Failed to cancel SafeBuy' });
    } finally {
      setLoading(false);
    }
  }

  const confirmReceipt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const contract = new ethers.Contract(
      contractAddress,
      SafeBuy.abi,
      await provider?.getSigner()
    );

    try {
      const tx = await contract.confirmReceipt();
      await tx.wait();
      setWithdraw(await contract.pendingWithdrawals(address));
      setState('Received');
    } catch (err) {
      console.log(err);
      setError({ where: 'cancel', message: 'Failed to confirm receipt SafeBuy' });
    } finally {
      setLoading(false);
    }
  }

  const withdrawValue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);

    const contract = new ethers.Contract(
      contractAddress,
      SafeBuy.abi,
      await provider?.getSigner()
    );

    try {
      const tx = await contract.withdraw();
      await tx.wait();
      setWallet({ address, provider, balance: await provider?.getBalance(address!) });
      setWithdraw(0n);
    } catch (err) {
      console.log(err);
      setError({ where: 'cancel', message: 'Failed to withdraw amount' });
    } finally {
      setLoading(false);
    }
  }

  switch (state) {
    case 'Created':
      if (address == buyer) {
        return (
          <form
            className="flex flex-col items-center justify-center gap-4 h-56 w-full"
            onSubmit={payPurchase}
          >
            <div className="flex flex-col gap-2 items-center">
              <span className="font-overpass font-bold text-xl">LET&lsquo;S PAY FOR YOUT ITEM!</span>
              <p className="flex flex-col font-overpass w-4/5">
                In order to pay for your item in SafeBuy, you need to pay twice the price, then, once the purchase is completed, you can withdraw half of it.
              </p>
            </div>
            <span className="font-overpass font-bold text-lg">Item price: <span className="font-medium">{ethers.formatEther(price)} ETH</span></span>
            <button
              className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
              disabled={loading}
            >
              {loading ? 'Loading...' : `Pay ${ethers.formatEther(price * BigInt(2))} ETH`}
            </button>
          </form>
        );
      }
      return (
        <form
          className="flex flex-col items-center justify-center gap-8 h-56 w-full"
          onSubmit={cancelPurchase}
        >
          <div className="flex flex-col gap-2 items-center">
            <span className="font-overpass font-bold text-xl">DO YOU WANT TO CANCEL THE SALE?</span>
            <p className="flex flex-col font-overpass w-4/5">
              The current SafeBuy is waiting for the buyer&lsquo;s payment, once that&lsquo;s done you can send them their item. Or... you cancel your sale if you want, then get your witdraw.
            </p>
          </div>
          <button
            className="bg-gray-600 rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Cancel it :('}
          </button>
        </form>
      );
    case 'Purchased':
      if (address == buyer) {
        return (
          <form
            className="flex flex-col items-center justify-center gap-6 h-56 w-full"
            onSubmit={confirmReceipt}
          >
            <div className="flex flex-col gap-2 items-center">
              <span className="font-overpass font-bold text-xl">HAVE YOU RECEIVED YOUR ITEM?</span>
              <p className="flex flex-col font-overpass w-4/5">
                Confirm that you have received your item&lsquo;s receipt so you can unlock yours and the sellers withdrawals!
              </p>
              <p className="flex flex-col font-overpass w-4/5 font-semibold">
                *Remember you&lsquo;re only getting half of what you payed for, as you payed twice the price for safety.
              </p>
            </div>
            <button
              className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
              disabled={loading}
            >
              {loading ? 'Loading...' : `I have my item!`}
            </button>
          </form>
        );
      }
      return (
        <div
          className="flex flex-col items-center justify-center gap-4 h-56 w-full"
        >
          <img src="shipping.png" alt="A shipping truck" className="w-20 h-20" />
          <div className="flex flex-col gap-4 items-center">
            <span className="font-overpass font-bold text-xl">PURCHASE CONFIRMED! SHIP THE ITEM!</span>
            <p className="flex flex-col font-overpass w-4/5">
              The buyer purchased the item! Now you have to send them their item and once they have confirm the receipt, both yours and the buyers withdrawals will be unlocked.
            </p>
          </div>
        </div>
      );
    case 'Received':
      if (withdraw > 0n) {
        return (
          <form
            className="flex flex-col items-center justify-center gap-6 h-56 w-full"
            onSubmit={withdrawValue}
          >
            <div className="flex flex-col gap-2 items-center">
              <span className="font-overpass font-bold text-xl">ALL DONE! CLAIM YOUR WITHDRAW!</span>
              <p className="flex flex-col font-overpass w-4/5">
                Thank you so much for using SafeBuy! Hope you have enjoyed it! Both parts have done their part and now you two may claim the correct amount:<br />
                <span className="text-center mt-2">Buyer: {ethers.formatEther(price)} ETH <br /></span>
                <span className="text-center -mb-2">Seller: {ethers.formatEther(price * BigInt(3))} ETH</span>
              </p>
            </div>
            <button
              className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
              disabled={loading}
            >
              {loading ? 'Loading...' : `Withdraw ${ethers.formatEther(withdraw)} ETH!`}
            </button>
          </form>
        );
      }
      return (
        <div className="flex flex-col items-center gap-4 h-56 w-full justify-center">
          <span className="font-overpass font-bold text-xl">ALL DONE! THANK YOU &lt;3!</span>
          <p className="font-overpass w-4/5">
            This SafeBuy is done!! Thank you for using and trusting it!
          </p>
          <img src="insurance.png" alt="A completed money contract" className="h-24 w-24" />
        </div>
      );
    case 'Canceled':
      if (address == buyer) {
        return (
          <div className="flex flex-col items-center gap-4 h-56 w-full justify-center">
            <span className="font-overpass font-bold text-xl">SAFEBUY CANCELED!</span>
            <p className="font-overpass w-4/5 text-center">
              Sorry, the seller canceled this SafeBuy :(
            </p>
            <img src="sad.png" alt="A sad face" className="h-24 w-24" />
          </div>
        );
      }
      return (
        <form
          className="flex flex-col items-center justify-center gap-6 h-56 w-full"
          onSubmit={withdrawValue}
        >
          <div className="flex flex-col gap-2 items-center w-full">
            <span className="font-overpass font-bold text-xl">SAFEBUY CANCELED!</span>
            <p className="flex flex-col font-overpass w-4/5 text-center">
              Sorry to hear you canceled your sale.
            </p>
            <img src="sad.png" alt="A sad face" className="w-20 h-20" />
          </div>
          <button
            className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
            disabled={loading}
          >
            {loading ? 'Loading...' : `Withdraw ${ethers.formatEther(withdraw)} ETH!`}
          </button>
        </form>
      );
    case 'Inactive':
      return (
        <div className="flex flex-col items-center gap-4 h-56 w-full justify-center">
          <span className="font-overpass font-bold text-xl">ALL DONE! THANK YOU &lt;3!</span>
          <p className="font-overpass w-4/5">
            This SafeBuy is done!! Thank you for using and trusting it!
          </p>
          <img src="insurance.png" alt="A completed money contract" className="h-24 w-24" />
        </div>
      );
    default:
      return (
        <form
          className="flex flex-col items-center gap-4 h-56 w-full justify-center"
          onSubmit={searchContract}
        >
          <label className="flex flex-col font-overpass w-4/5">
            <span className="font-bold">Which purchase you want to interact with?</span>
            <input
              className="px-4 py-2 text-lg text-neutral-dark bg-secondary-1 border border-neutral-dark rounded"
              value={contractAddress}
              onChange={e => {
                if (error.where === 'contract') {
                  setError({ where: '', message: '' });
                }
                setContractAddress(`0x${e.target.value.replace(/ /g, '').replace('0X', '').replace('0x', '')}`)
              }}
              placeholder="Contract's address"
            />
            <span className="text-primary font-overpass font-bold">
              {error.where == 'contract' ? error.message : ''}
            </span>
          </label>
          <button
            className="bg-primary rounded-lg py-3 w-4/5 font-overpass font-bold text-neutral-light"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Search it!'}
          </button>
        </form>
      );
  }
}

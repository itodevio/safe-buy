import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const SafePurchaseModule = buildModule("SafePurchaseModule", (m) => {
  const buyerAddress = "";

  const safePurchase = m.contract("SafePurchase", [buyerAddress, ethers.parseEther('0.1')], {
    value: ethers.parseEther('0.2'),
  });

  return { safePurchase };
});

export default SafePurchaseModule;

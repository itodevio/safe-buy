import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("SafePurchase", function() {
  async function deploySafePurchaseFixture() {
    const price = hre.ethers.parseEther('2');
    const [seller, buyer] = await hre.ethers.getSigners();

    const state = {
      created: 0,
      purchased: 1,
      received: 2,
      canceled: 3,
      inactive: 4,
    }

    const SafePurchase = await hre.ethers.getContractFactory("SafePurchase");
    const safePurchase = await SafePurchase.deploy(buyer, price, { value: price * BigInt(2) });

    return { safePurchase, price, seller, buyer, state };
  }

  describe("Deployment", function() {
    it("Should set the right seller", async function() {
      const { safePurchase, seller} = await loadFixture(deploySafePurchaseFixture);

      expect(await safePurchase.seller()).to.equal(seller.address);
    });

    it("Should set the right buyer", async function() {
      const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);

      expect(await safePurchase.buyer()).to.equal(buyer.address);
    });

    it("Should set the right price", async function() {
      const { safePurchase, price } = await loadFixture(deploySafePurchaseFixture);

      expect(await safePurchase.price()).to.equal(price);
    });

    it("Should set the right state", async function() {
      const { safePurchase, state } = await loadFixture(deploySafePurchaseFixture);

      expect(await safePurchase.state()).to.equal(state.created);
    });
    
    it("Should receive and store twice the price amount", async function() {
      const { safePurchase, price } = await loadFixture(deploySafePurchaseFixture);

      expect(await hre.ethers.provider.getBalance(safePurchase.target)).to.equal(price * BigInt(2));
    });

    it("Should revert if the msg value is not twice the price", async function() {
      const [_, buyer] = await hre.ethers.getSigners();
      const price = hre.ethers.parseEther('2');

      const SafePurchase = await hre.ethers.getContractFactory("SafePurchase");

      await expect(SafePurchase.deploy(buyer, price, { value: hre.ethers.parseEther('3')})).to.be
        .revertedWithCustomError(
          SafePurchase,
          "WrongValue"
        );
    });
  })

  describe("Cancel Sale", function() {
    describe("Validations", function() {
      it("Should revert if called from another account", async function() {
        const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);
  
        await expect(safePurchase.connect(buyer).cancelSale()).to.be
          .revertedWithCustomError(
            safePurchase, 
            "OnlySeller"
          );
      });
  
      it("Should revert if called in other state", async function() {
        const { safePurchase } = await loadFixture(deploySafePurchaseFixture);
  
        await safePurchase.cancelSale();

        await expect(safePurchase.cancelSale()).to.be
          .revertedWithCustomError(
            safePurchase,
            "InvalidState"
          );
      });
    });
    
    describe("State changes", function() {
      it("Should change the state to cancel if just created and the seller calls it", async function() {
        const { safePurchase, state } = await loadFixture(deploySafePurchaseFixture);
        await safePurchase.cancelSale()
        
        expect(await safePurchase.state()).to.equal(state.canceled);
      });
    });

    describe("Events", function() {
      it("Should emit an event", async function() {
        const { safePurchase } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.cancelSale()).to.emit(safePurchase, "SaleCanceled");
      })
    })
  });

  describe("Purchase", function() {
    describe("Validations", function() {
      it("Should revert if called from another account", async function() {
        const { safePurchase } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.purchase()).to.be
          .revertedWithCustomError(
            safePurchase,
            "OnlyBuyer"
          );
      });

      it("Should revert if called in other state", async function() {
        const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.cancelSale();

        await expect(safePurchase.connect(buyer).purchase()).to.be
          .revertedWithCustomError(
            safePurchase,
            "InvalidState"
          );
      });

      it("Should revert if not sent any value", async function() {
        const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.connect(buyer).purchase()).to.be
          .revertedWithCustomError(
            safePurchase,
            "WrongValue"
          );
      });
      
      it("Should revert if not sent the correct value", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.connect(buyer).purchase({ value: price })).to.be
          .revertedWithCustomError(
            safePurchase,
            "WrongValue"
          );
      });
    });

    describe("State changes", function() {
      it("Should change the state to purchased if just created and buyer calls it with the right value", async function() {
        const { safePurchase, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });

        expect(await safePurchase.state()).to.equal(state.purchased);
      });
    });

    describe("Events", function() {
      it("Should emit an event", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.connect(buyer).purchase({ value: price * BigInt(2) })).to
          .emit(safePurchase, "PurchaseConfirmed");
      });
    });
  });

  describe("Confirm Receipt", function() {
    describe("Validations", function() {
      it("Should revert if called from another account", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });

        await expect(safePurchase.confirmReceipt()).to.be
          .revertedWithCustomError(
            safePurchase,
            "OnlyBuyer"
          );
      });

      it("Should revert if called in other state", async function() {
        const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);

        await expect(safePurchase.connect(buyer).confirmReceipt()).to.be
          .revertedWithCustomError(
            safePurchase,
            "InvalidState"
          );
      });
    });

    describe("State changes", function() {
      it("Should change the state to received if purchased and buyer calls it", async function() {
        const { safePurchase, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        expect(await safePurchase.state()).to.equal(state.received);        
      });
      
      it("Should add both pendingWithdrawals if purchased and buyer calls it", async function() {
        const { safePurchase, seller, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        expect(await safePurchase.pendingWithdrawals(buyer.address)).to.equal(price);
        expect(await safePurchase.pendingWithdrawals(seller.address)).to.equal(price * BigInt(3));
      });
    });

    describe("Events", function() {
      it("Should emit an event", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });

        await expect(safePurchase.connect(buyer).confirmReceipt()).to
          .emit(
            safePurchase,
            "PurchaseReceived"
          );
      });
    });
  });

  describe("Withdrawals", function() {
    describe("Validations", function() {
      it("Should revert if called from other account", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        const singers = await hre.ethers.getSigners();
        const randomSigner = singers[2];
        
        await expect(safePurchase.connect(randomSigner).withdraw()).to.be
          .revertedWithCustomError(
            safePurchase,
            "OnlyMember"
          );
      });

      it("Should revert if called in other state", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });

        await expect(safePurchase.withdraw()).to.be
          .revertedWithCustomError(
            safePurchase,
            "InvalidState"
          );
      });

      it("Should revert if state is canceled and buyer calls it", async function() {
        const { safePurchase, buyer } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.cancelSale();

        await expect(safePurchase.connect(buyer).withdraw()).to.be
          .revertedWithCustomError(
            safePurchase,
            "OnlySeller"
          );
      });

      it("Should revert if the same user calls it twice and the other user doesn't", async function() {
        const { safePurchase, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        await safePurchase.withdraw();

        await expect(safePurchase.withdraw()).to.be
          .revertedWithCustomError(
            safePurchase,
            "NoPendingWithdraw"
          );
      });
    });

    describe("State changes", function() {
      it("Should not change the state to inactive if only the seller withdrawn", async function() {
        const { safePurchase, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();
        await safePurchase.withdraw();

        expect(await safePurchase.state()).to.equal(state.received);
      });

      it("Should not change the state to inactive if only the buyer withdrawn", async function() {
        const { safePurchase, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();
        await safePurchase.connect(buyer).withdraw();

        expect(await safePurchase.state()).to.equal(state.received);
      }); 

      it("Should change the state to inactive if both the seller and the buyer withdrawn", async function() {
        const { safePurchase, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();
        await safePurchase.withdraw();
        await safePurchase.connect(buyer).withdraw();

        expect(await safePurchase.state()).to.equal(state.inactive);
      });
      
      it("Should zero the callers pending withdraw", async function() {
        const { safePurchase, seller, buyer, price, state } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        await safePurchase.withdraw();
        expect(await safePurchase.pendingWithdrawals(seller.address)).to.equal(0);

        await safePurchase.connect(buyer).withdraw();
        expect(await safePurchase.pendingWithdrawals(buyer.address)).to.equal(0);
      });
    });

    describe("Transfers", function() {
      it("Should transfer the correct funds to the caller", async function() {
        const { safePurchase, seller, buyer, price } = await loadFixture(deploySafePurchaseFixture);

        await safePurchase.connect(buyer).purchase({ value: price * BigInt(2) });
        await safePurchase.connect(buyer).confirmReceipt();

        await expect(safePurchase.connect(buyer).withdraw()).to
          .changeEtherBalances(
            [buyer, safePurchase],
            [price, -price]
          );
        
        await expect(safePurchase.withdraw()).to
            .changeEtherBalances(
              [seller, safePurchase],
              [price * BigInt(3), -(price * BigInt(3))]
            );
      });
    });
  });
});

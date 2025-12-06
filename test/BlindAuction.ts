import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { BlindAuction, BlindAuction__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const duration = 3600;
  const factory = (await ethers.getContractFactory("BlindAuction")) as BlindAuction__factory;
  const contract = (await factory.deploy(duration)) as BlindAuction;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("BlindAuction", function () {
  let signers: Signers;
  let contract: BlindAuction;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Deployment", function () {
    it("should set beneficiary to deployer", async function () {
      expect(await contract.beneficiary()).to.eq(signers.deployer.address);
    });

    it("should set auction state to Open", async function () {
      expect(await contract.state()).to.eq(0);
    });

    it("should set end time correctly", async function () {
      const endTime = await contract.endTime();
      const currentTime = await time.latest();
      expect(endTime).to.be.greaterThan(currentTime);
    });
  });

  describe("Bidding", function () {
    it("should allow placing an encrypted bid", async function () {
      const bidAmount = 1000n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      const tx = await contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof);
      await tx.wait();

      expect(await contract.hasBid(signers.alice.address)).to.be.true;
    });

    it("should emit BidPlaced event", async function () {
      const bidAmount = 500n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await expect(contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof))
        .to.emit(contract, "BidPlaced")
        .withArgs(signers.alice.address);
    });

    it("should track highest bid", async function () {
      const aliceBid = 1000n;
      const bobBid = 1500n;

      const encryptedAliceBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(aliceBid)
        .encrypt();

      await contract.connect(signers.alice).bid(encryptedAliceBid.handles[0], encryptedAliceBid.inputProof);

      const encryptedBobBid = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add64(bobBid)
        .encrypt();

      await contract.connect(signers.bob).bid(encryptedBobBid.handles[0], encryptedBobBid.inputProof);

      expect(await contract.hasBid(signers.alice.address)).to.be.true;
      expect(await contract.hasBid(signers.bob.address)).to.be.true;
    });

    it("should not allow bidding twice", async function () {
      const bidAmount = 1000n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      const encryptedBid2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await expect(
        contract.connect(signers.alice).bid(encryptedBid2.handles[0], encryptedBid2.inputProof),
      ).to.be.revertedWith("Already placed a bid");
    });
  });

  describe("Ending Auction", function () {
    it("should allow ending auction after end time", async function () {
      await time.increase(3601);

      const tx = await contract.connect(signers.deployer).endAuction();
      await tx.wait();

      expect(await contract.state()).to.eq(1);
    });

    it("should not allow ending auction before end time", async function () {
      await expect(contract.connect(signers.deployer).endAuction()).to.be.revertedWith("Auction not yet ended");
    });

    it("should emit AuctionEnded event", async function () {
      await time.increase(3601);

      await expect(contract.connect(signers.deployer).endAuction())
        .to.emit(contract, "AuctionEnded")
        .withArgs(ethers.ZeroAddress);
    });
  });

  describe("Winner Management", function () {
    it("should allow beneficiary to set winner after auction ends", async function () {
      const bidAmount = 1000n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await time.increase(3601);
      await contract.connect(signers.deployer).endAuction();

      await contract.connect(signers.deployer).setWinner(signers.alice.address);

      expect(await contract.highestBidder()).to.eq(signers.alice.address);
      expect(await contract.winnerClaimed()).to.be.true;
    });

    it("should emit WinnerClaimed event", async function () {
      const bidAmount = 1000n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await time.increase(3601);
      await contract.connect(signers.deployer).endAuction();

      await expect(contract.connect(signers.deployer).setWinner(signers.alice.address))
        .to.emit(contract, "WinnerClaimed")
        .withArgs(signers.alice.address);
    });
  });

  describe("View Functions", function () {
    it("should return encrypted bid for the bidder", async function () {
      const bidAmount = 800n;

      const encryptedBid = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(bidAmount)
        .encrypt();

      await contract.connect(signers.alice).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      const myBid = await contract.connect(signers.alice).getMyBid();
      const decryptedBid = await fhevm.userDecryptEuint(FhevmType.euint64, myBid, contractAddress, signers.alice);

      expect(decryptedBid).to.eq(bidAmount);
    });

    it("should return remaining time correctly", async function () {
      const remainingTime = await contract.getRemainingTime();
      expect(remainingTime).to.be.greaterThan(0);

      await time.increase(3601);
      const remainingTimeAfter = await contract.getRemainingTime();
      expect(remainingTimeAfter).to.eq(0);
    });
  });
});

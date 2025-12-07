import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { TrustlessMatching, TrustlessMatching__factory } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("TrustlessMatching")) as TrustlessMatching__factory;
  const contract = (await factory.deploy()) as TrustlessMatching;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("TrustlessMatching", function () {
  let signers: Signers;
  let contract: TrustlessMatching;
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

  describe("Registration", function () {
    it("should allow user to register", async function () {
      const tx = await contract.connect(signers.alice).register();
      await tx.wait();

      expect(await contract.registered(signers.alice.address)).to.be.true;
    });

    it("should emit UserRegistered event", async function () {
      await expect(contract.connect(signers.alice).register())
        .to.emit(contract, "UserRegistered")
        .withArgs(signers.alice.address);
    });

    it("should not allow double registration", async function () {
      await contract.connect(signers.alice).register();

      await expect(contract.connect(signers.alice).register()).to.be.revertedWith("Already registered");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await contract.connect(signers.alice).register();
      await contract.connect(signers.bob).register();
    });

    it("should allow casting an encrypted vote", async function () {
      const voteLike = true;

      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .vote(signers.bob.address, encryptedVote.handles[0], encryptedVote.inputProof);
      await tx.wait();

      expect(await contract.hasVoted(signers.alice.address, signers.bob.address)).to.be.true;
    });

    it("should emit VoteCast event", async function () {
      const voteLike = true;

      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await expect(
        contract.connect(signers.alice).vote(signers.bob.address, encryptedVote.handles[0], encryptedVote.inputProof),
      )
        .to.emit(contract, "VoteCast")
        .withArgs(signers.alice.address, signers.bob.address);
    });

    it("should not allow voting for yourself", async function () {
      const voteLike = true;

      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await expect(
        contract.connect(signers.alice).vote(signers.alice.address, encryptedVote.handles[0], encryptedVote.inputProof),
      ).to.be.revertedWith("Cannot vote for yourself");
    });

    it("should not allow voting for unregistered user", async function () {
      const voteLike = true;

      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .vote(signers.deployer.address, encryptedVote.handles[0], encryptedVote.inputProof),
      ).to.be.revertedWith("Target not registered");
    });

    it("should not allow voting twice", async function () {
      const voteLike = true;

      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract
        .connect(signers.alice)
        .vote(signers.bob.address, encryptedVote.handles[0], encryptedVote.inputProof);

      const encryptedVote2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await expect(
        contract.connect(signers.alice).vote(signers.bob.address, encryptedVote2.handles[0], encryptedVote2.inputProof),
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("Matching", function () {
    beforeEach(async function () {
      await contract.connect(signers.alice).register();
      await contract.connect(signers.bob).register();
    });

    it("should check if both parties have voted", async function () {
      const voteLike = true;

      const aliceVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.alice).vote(signers.bob.address, aliceVote.handles[0], aliceVote.inputProof);

      const bothVotedBefore = await contract.connect(signers.alice).haveBothVoted(signers.bob.address);
      expect(bothVotedBefore).to.be.false;

      const bobVote = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.bob).vote(signers.alice.address, bobVote.handles[0], bobVote.inputProof);

      const bothVotedAfter = await contract.connect(signers.alice).haveBothVoted(signers.bob.address);
      expect(bothVotedAfter).to.be.true;
    });

    it("should get encrypted match result when both voted", async function () {
      const voteLike = true;

      const aliceVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.alice).vote(signers.bob.address, aliceVote.handles[0], aliceVote.inputProof);

      const bobVote = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.bob).vote(signers.alice.address, bobVote.handles[0], bobVote.inputProof);

      const tx = await contract.connect(signers.alice).getEncryptedMatchResult(signers.bob.address);
      const receipt = await tx.wait();

      expect(receipt).to.not.be.null;
      expect(receipt!.logs.length).to.be.greaterThan(0);
    });

    it("should emit MatchChecked event", async function () {
      const voteLike = true;

      const aliceVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.alice).vote(signers.bob.address, aliceVote.handles[0], aliceVote.inputProof);

      const bobVote = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addBool(voteLike)
        .encrypt();

      await contract.connect(signers.bob).vote(signers.alice.address, bobVote.handles[0], bobVote.inputProof);

      await expect(contract.connect(signers.alice).getEncryptedMatchResult(signers.bob.address))
        .to.emit(contract, "MatchChecked")
        .withArgs(signers.alice.address, signers.bob.address);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await contract.connect(signers.alice).register();
      await contract.connect(signers.bob).register();
    });

    it("should check if user voted for target", async function () {
      expect(await contract.connect(signers.alice).didIVote(signers.bob.address)).to.be.false;

      const voteLike = true;
      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract
        .connect(signers.alice)
        .vote(signers.bob.address, encryptedVote.handles[0], encryptedVote.inputProof);

      expect(await contract.connect(signers.alice).didIVote(signers.bob.address)).to.be.true;
    });

    it("should check if target voted for user", async function () {
      expect(await contract.connect(signers.alice).didTheyVote(signers.bob.address)).to.be.false;

      const voteLike = true;
      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addBool(voteLike)
        .encrypt();

      await contract
        .connect(signers.bob)
        .vote(signers.alice.address, encryptedVote.handles[0], encryptedVote.inputProof);

      expect(await contract.connect(signers.alice).didTheyVote(signers.bob.address)).to.be.true;
    });

    it("should get own encrypted vote", async function () {
      const voteLike = true;
      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(voteLike)
        .encrypt();

      await contract
        .connect(signers.alice)
        .vote(signers.bob.address, encryptedVote.handles[0], encryptedVote.inputProof);

      const myVote = await contract.connect(signers.alice).getMyVote(signers.bob.address);
      const decryptedVote = await fhevm.userDecryptEbool(myVote, contractAddress, signers.alice);

      expect(decryptedVote).to.eq(voteLike);
    });
  });
});

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AntiOverflow, AntiOverflow__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AntiOverflow")) as AntiOverflow__factory;
  const contract = (await factory.deploy()) as AntiOverflow;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AntiOverflow", function () {
  let signers: Signers;
  let contract: AntiOverflow;
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

  describe("Initial State", function () {
    it("should initialize with balance of 1000", async function () {
      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.deployer,
      );

      expect(decryptedBalance).to.eq(1000);
    });
  });

  describe("Anti-Pattern 1: Subtraction without underflow check", function () {
    it("withdrawBad should allow underflow", async function () {
      const withdrawAmount = 500;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(withdrawAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .withdrawBad(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 - withdrawAmount);
    });

    it("withdrawGood should prevent underflow", async function () {
      const withdrawAmount = 500;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(withdrawAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .withdrawGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 - withdrawAmount);
    });

    it("withdrawGood should prevent withdrawing more than balance", async function () {
      const withdrawAmount = 2000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(withdrawAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .withdrawGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000);
    });
  });

  describe("Anti-Pattern 2: Addition without overflow check", function () {
    it("depositBad should allow overflow", async function () {
      const depositAmount = 500;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(depositAmount)
        .encrypt();

      const tx = await contract.connect(signers.alice).depositBad(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 + depositAmount);
    });

    it("depositGood should prevent overflow", async function () {
      const depositAmount = 500;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(depositAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .depositGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 + depositAmount);
    });
  });

  describe("Anti-Pattern 3: Multiplication overflow", function () {
    it("multiplyBad should allow overflow", async function () {
      const factor = 2;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(factor)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .multiplyBad(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 * factor);
    });

    it("multiplyGood should limit factor to safe range", async function () {
      const factor = 100;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(factor)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .multiplyGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000 * factor);
    });

    it("multiplyGood should use 1 if factor too large", async function () {
      const factor = 5000000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(factor)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .multiplyGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(1000);
    });
  });

  describe("Reset Balance Helper", function () {
    it("should reset balance to new value", async function () {
      const newBalance = 5000;

      const tx = await contract.resetBalance(newBalance);
      await tx.wait();

      const encryptedBalance = await contract.getBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedBalance,
        contractAddress,
        signers.deployer,
      );

      expect(decryptedBalance).to.eq(newBalance);
    });
  });
});

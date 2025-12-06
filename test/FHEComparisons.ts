import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEComparisons, FHEComparisons__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEComparisons")) as FHEComparisons__factory;
  const contract = (await factory.deploy()) as FHEComparisons;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEComparisons", function () {
  let signers: Signers;
  let contract: FHEComparisons;
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

  describe("storeValue", function () {
    it("should store an encrypted value", async function () {
      const clearValue = 100;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).storeValue(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedStored = await contract.getStoredValue();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedStored,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });
  });

  describe("isEqual", function () {
    it("should return true when values are equal", async function () {
      const storedValue = 100;
      const inputValue = 100;

      const encryptedStored = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storedValue)
        .encrypt();

      await contract.connect(signers.alice).storeValue(encryptedStored.handles[0], encryptedStored.inputProof);

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(inputValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).isEqual(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComparisonResult();
      const decryptedResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
      expect(decryptedResult).to.be.true;
    });
  });

  describe("isNotEqual", function () {
    it("should return true when values are not equal", async function () {
      const storedValue = 100;
      const inputValue = 50;

      const encryptedStored = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storedValue)
        .encrypt();

      await contract.connect(signers.alice).storeValue(encryptedStored.handles[0], encryptedStored.inputProof);

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(inputValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).isNotEqual(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComparisonResult();
      const decryptedResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
      expect(decryptedResult).to.be.true;
    });
  });

  describe("isLessThan", function () {
    it("should return true when input is less than stored value", async function () {
      const storedValue = 100;
      const inputValue = 50;

      const encryptedStored = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storedValue)
        .encrypt();

      await contract.connect(signers.alice).storeValue(encryptedStored.handles[0], encryptedStored.inputProof);

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(inputValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).isLessThan(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComparisonResult();
      const decryptedResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
      expect(decryptedResult).to.be.true;
    });
  });

  describe("isGreaterThan", function () {
    it("should return true when input is greater than stored value", async function () {
      const storedValue = 50;
      const inputValue = 100;

      const encryptedStored = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storedValue)
        .encrypt();

      await contract.connect(signers.alice).storeValue(encryptedStored.handles[0], encryptedStored.inputProof);

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(inputValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .isGreaterThan(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComparisonResult();
      const decryptedResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, signers.alice);
      expect(decryptedResult).to.be.true;
    });
  });

  describe("max", function () {
    it("should return the maximum of two encrypted values", async function () {
      const clearA = 100;
      const clearB = 50;

      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .max(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );
      expect(decryptedResult).to.eq(Math.max(clearA, clearB));
    });
  });

  describe("min", function () {
    it("should return the minimum of two encrypted values", async function () {
      const clearA = 100;
      const clearB = 50;

      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .min(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );
      expect(decryptedResult).to.eq(Math.min(clearA, clearB));
    });
  });
});

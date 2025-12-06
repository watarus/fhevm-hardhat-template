import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEBitwise, FHEBitwise__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEBitwise")) as FHEBitwise__factory;
  const contract = (await factory.deploy()) as FHEBitwise;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEBitwise", function () {
  let signers: Signers;
  let contract: FHEBitwise;
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

  describe("bitwiseAnd", function () {
    it("should perform bitwise AND on two encrypted values", async function () {
      const clearA = 0b11110000;
      const clearB = 0b10101010;

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
        .bitwiseAnd(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA & clearB);
    });
  });

  describe("bitwiseOr", function () {
    it("should perform bitwise OR on two encrypted values", async function () {
      const clearA = 0b11110000;
      const clearB = 0b10101010;

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
        .bitwiseOr(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA | clearB);
    });
  });

  describe("bitwiseXor", function () {
    it("should perform bitwise XOR on two encrypted values", async function () {
      const clearA = 0b11110000;
      const clearB = 0b10101010;

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
        .bitwiseXor(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA ^ clearB);
    });
  });

  describe("bitwiseNot", function () {
    it("should perform bitwise NOT on an encrypted value", async function () {
      const clearValue = 0b11110000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).bitwiseNot(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(~clearValue >>> 0);
    });
  });

  describe("shiftLeft", function () {
    it("should shift left an encrypted value by plaintext amount", async function () {
      const clearValue = 0b00001111;
      const shiftAmount = 4;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .shiftLeft(encryptedInput.handles[0], encryptedInput.inputProof, shiftAmount);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearValue << shiftAmount);
    });
  });

  describe("shiftRight", function () {
    it("should shift right an encrypted value by plaintext amount", async function () {
      const clearValue = 0b11110000;
      const shiftAmount = 4;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .shiftRight(encryptedInput.handles[0], encryptedInput.inputProof, shiftAmount);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearValue >> shiftAmount);
    });
  });

  describe("rotateLeft", function () {
    it("should rotate left an encrypted value", async function () {
      const clearValue = 0b11110000;
      const rotateAmount = 4;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .rotateLeft(encryptedInput.handles[0], encryptedInput.inputProof, rotateAmount);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      const expected = ((clearValue << rotateAmount) | (clearValue >>> (32 - rotateAmount))) >>> 0;
      expect(clearResult).to.eq(expected);
    });
  });

  describe("extractBits", function () {
    it("should extract specific bits using a mask", async function () {
      const clearValue = 0b11111111;
      const mask = 0b11110000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .extractBits(encryptedInput.handles[0], encryptedInput.inputProof, mask);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearValue & mask);
    });
  });

  describe("setBits", function () {
    it("should set specific bits using OR with a mask", async function () {
      const clearValue = 0b00001111;
      const mask = 0b11110000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .setBits(encryptedInput.handles[0], encryptedInput.inputProof, mask);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearValue | mask);
    });
  });

  describe("toggleBits", function () {
    it("should toggle specific bits using XOR with a mask", async function () {
      const clearValue = 0b11111111;
      const mask = 0b11110000;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .toggleBits(encryptedInput.handles[0], encryptedInput.inputProof, mask);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearValue ^ mask);
    });
  });
});

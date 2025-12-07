import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEArithmetic, FHEArithmetic__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEArithmetic")) as FHEArithmetic__factory;
  const contract = (await factory.deploy()) as FHEArithmetic;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEArithmetic", function () {
  let signers: Signers;
  let contract: FHEArithmetic;
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

  describe("add", function () {
    it("should add two encrypted values correctly", async function () {
      const clearA = 100;
      const clearB = 50;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .add(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA + clearB);
    });
  });

  describe("sub", function () {
    it("should subtract two encrypted values correctly", async function () {
      const clearA = 100;
      const clearB = 30;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .sub(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA - clearB);
    });
  });

  describe("mul", function () {
    it("should multiply two encrypted values correctly", async function () {
      const clearA = 10;
      const clearB = 5;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .mul(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA * clearB);
    });
  });

  describe("addPlaintext", function () {
    it("should add encrypted value with plaintext constant", async function () {
      const clearA = 100;
      const plaintextB = 25;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .addPlaintext(encryptedInputA.handles[0], encryptedInputA.inputProof, plaintextB);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA + plaintextB);
    });
  });

  describe("mulPlaintext", function () {
    it("should multiply encrypted value by plaintext constant", async function () {
      const clearA = 10;
      const plaintextB = 7;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearA)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .mulPlaintext(encryptedInputA.handles[0], encryptedInputA.inputProof, plaintextB);
      await tx.wait();

      const encryptedResult = await contract.getResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.eq(clearA * plaintextB);
    });
  });
});

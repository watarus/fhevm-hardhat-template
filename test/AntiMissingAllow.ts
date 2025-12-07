import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AntiMissingAllow, AntiMissingAllow__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AntiMissingAllow")) as AntiMissingAllow__factory;
  const contract = (await factory.deploy()) as AntiMissingAllow;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AntiMissingAllow", function () {
  let signers: Signers;
  let contract: AntiMissingAllow;
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

  describe("Anti-Pattern 1: Missing FHE.allow", function () {
    it("storeDataBad should store data but user cannot decrypt", async function () {
      const clearData = 12345n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeDataBad(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("storeDataGood should allow user to decrypt", async function () {
      const clearData = 12345n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeDataGood(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(clearData);
    });
  });

  describe("Anti-Pattern 2: Missing allowThis", function () {
    it("storeWithoutAllowThis should store data", async function () {
      const clearData = 999n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeWithoutAllowThis(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("Anti-Pattern 3: Missing allow after computation", function () {
    it("computeAndForget should compute but result cannot be decrypted", async function () {
      const clearA = 100n;
      const clearB = 50n;

      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearA)
        .encrypt();

      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .computeAndForget(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      const receipt = await tx.wait();

      expect(receipt).to.not.be.null;
      expect(receipt!.logs.length).to.be.greaterThan(0);
    });

    it("computeAndAllow should allow decryption of result", async function () {
      const clearA = 100n;
      const clearB = 50n;

      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearA)
        .encrypt();

      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .computeAndAllow(encryptedA.handles[0], encryptedA.inputProof, encryptedB.handles[0], encryptedB.inputProof);
      await tx.wait();

      const encryptedResult = await contract.getLastComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );
      expect(decryptedResult).to.eq(clearA + clearB);
    });
  });

  describe("Anti-Pattern 4: Assuming permissions persist", function () {
    it("updateValueBad should update but permissions not granted", async function () {
      const initialData = 100n;
      const addValue = 50n;

      const encryptedInitial = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialData)
        .encrypt();

      await contract.connect(signers.alice).storeDataGood(encryptedInitial.handles[0], encryptedInitial.inputProof);

      const encryptedAdd = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).updateValueBad(encryptedAdd.handles[0], encryptedAdd.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("updateValueGood should grant fresh permissions", async function () {
      const initialData = 100n;
      const addValue = 50n;

      const encryptedInitial = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialData)
        .encrypt();

      await contract.connect(signers.alice).storeDataGood(encryptedInitial.handles[0], encryptedInitial.inputProof);

      const encryptedAdd = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .updateValueGood(encryptedAdd.handles[0], encryptedAdd.inputProof);
      await tx.wait();

      const encryptedBalance = await contract.connect(signers.alice).getMyBalance();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedBalance).to.eq(initialData + addValue);
    });
  });
});

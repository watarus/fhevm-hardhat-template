import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEAccessControl, FHEAccessControl__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEAccessControl")) as FHEAccessControl__factory;
  const contract = (await factory.deploy()) as FHEAccessControl;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEAccessControl", function () {
  let signers: Signers;
  let contract: FHEAccessControl;
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

  describe("Private Data", function () {
    it("should store and retrieve private data", async function () {
      const clearData = 12345n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storePrivateData(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedData = await contract.connect(signers.alice).getMyPrivateData();
      const decryptedData = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedData,
        contractAddress,
        signers.alice,
      );

      expect(decryptedData).to.eq(clearData);
    });

    it("should check if user has private data", async function () {
      const clearData = 999n;

      const hasDataBefore = await contract.connect(signers.alice).hasPrivateData();
      expect(hasDataBefore).to.be.false;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      await contract.connect(signers.alice).storePrivateData(encryptedInput.handles[0], encryptedInput.inputProof);

      const hasDataAfter = await contract.connect(signers.alice).hasPrivateData();
      expect(hasDataAfter).to.be.true;
    });
  });

  describe("Shared Secret", function () {
    it("should allow owner to set shared secret", async function () {
      const clearSecret = 777n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(clearSecret)
        .encrypt();

      const tx = await contract
        .connect(signers.deployer)
        .setSharedSecret(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const encryptedSecret = await contract.connect(signers.deployer).getSharedSecret();
      const decryptedSecret = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedSecret,
        contractAddress,
        signers.deployer,
      );

      expect(decryptedSecret).to.eq(clearSecret);
    });

    it("should grant and check shared access", async function () {
      const hasAccessBefore = await contract.hasSharedAccess(signers.alice.address);
      expect(hasAccessBefore).to.be.false;

      await contract.connect(signers.deployer).grantSharedAccess(signers.alice.address);

      const hasAccessAfter = await contract.hasSharedAccess(signers.alice.address);
      expect(hasAccessAfter).to.be.true;
    });

    it("should allow authorized user to get shared secret", async function () {
      const clearSecret = 555n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(clearSecret)
        .encrypt();

      await contract.connect(signers.deployer).setSharedSecret(encryptedInput.handles[0], encryptedInput.inputProof);
      await contract.connect(signers.deployer).grantSharedAccess(signers.alice.address);

      const encryptedSecret = await contract.connect(signers.alice).getSharedSecret();
      const decryptedSecret = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedSecret,
        contractAddress,
        signers.alice,
      );

      expect(decryptedSecret).to.eq(clearSecret);
    });

    it("should revoke shared access", async function () {
      await contract.connect(signers.deployer).grantSharedAccess(signers.alice.address);
      expect(await contract.hasSharedAccess(signers.alice.address)).to.be.true;

      await contract.connect(signers.deployer).revokeSharedAccess(signers.alice.address);
      expect(await contract.hasSharedAccess(signers.alice.address)).to.be.false;
    });
  });

  describe("Derived Data", function () {
    it("should add to private data and return result", async function () {
      const initialData = 100n;
      const addValue = 50n;

      const encryptedInitial = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialData)
        .encrypt();

      await contract.connect(signers.alice).storePrivateData(encryptedInitial.handles[0], encryptedInitial.inputProof);

      const encryptedAdd = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).addToMyData(encryptedAdd.handles[0], encryptedAdd.inputProof);
      await tx.wait();

      const encryptedResult = await contract.connect(signers.alice).getLastComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decryptedResult).to.eq(initialData + addValue);
    });
  });

  describe("Transfer of Ownership", function () {
    it("should transfer private data to another user", async function () {
      const clearData = 888n;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearData)
        .encrypt();

      await contract.connect(signers.alice).storePrivateData(encryptedInput.handles[0], encryptedInput.inputProof);

      const hasDataBefore = await contract.connect(signers.alice).hasPrivateData();
      expect(hasDataBefore).to.be.true;

      await contract.connect(signers.alice).transferData(signers.bob.address);

      const hasDataAfterAlice = await contract.connect(signers.alice).hasPrivateData();
      const hasDataAfterBob = await contract.connect(signers.bob).hasPrivateData();

      expect(hasDataAfterAlice).to.be.false;
      expect(hasDataAfterBob).to.be.true;

      const encryptedBobData = await contract.connect(signers.bob).getMyPrivateData();
      const decryptedBobData = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBobData,
        contractAddress,
        signers.bob,
      );

      expect(decryptedBobData).to.eq(clearData);
    });
  });
});

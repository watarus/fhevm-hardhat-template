import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEDecryption, FHEDecryption__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEDecryption")) as FHEDecryption__factory;
  const contract = (await factory.deploy()) as FHEDecryption;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEDecryption", function () {
  let signers: Signers;
  let contract: FHEDecryption;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2], charlie: ethSigners[3] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Pattern 1: User Decryption (Single Value)", function () {
    it("should store and retrieve private data", async function () {
      const clearValue = 123456789n;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeMyData(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.connect(signers.alice).getMyData();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should check if user has private data", async function () {
      expect(await contract.connect(signers.alice).hasPrivateData()).to.be.false;

      const clearValue = 999n;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeMyData(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      expect(await contract.connect(signers.alice).hasPrivateData()).to.be.true;
    });

    it("should revert when getting data without storing first", async function () {
      await expect(contract.connect(signers.alice).getMyData()).to.be.revertedWith("No data stored");
    });

    it("should emit PrivateDataStored event", async function () {
      const clearValue = 555n;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearValue)
        .encrypt();

      await expect(contract.connect(signers.alice).storeMyData(encryptedInput.handles[0], encryptedInput.inputProof))
        .to.emit(contract, "PrivateDataStored")
        .withArgs(signers.alice.address);
    });
  });

  describe("Pattern 2: User Decryption (Multiple Values)", function () {
    it("should compute and allow user to decrypt result", async function () {
      const clearValueA = 100;
      const clearValueB = 50;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueB)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );
      await tx.wait();

      expect(await contract.connect(signers.alice).canAccessResult()).to.be.true;

      const result = await contract.connect(signers.alice).getComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(FhevmType.euint32, result, contractAddress, signers.alice);

      expect(decryptedResult).to.eq(clearValueA + clearValueB);
    });

    it("should grant result access to another user", async function () {
      const clearValueA = 25;
      const clearValueB = 75;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueB)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      expect(await contract.connect(signers.bob).canAccessResult()).to.be.false;

      const grantTx = await contract.connect(signers.alice).grantResultAccess(signers.bob.address);
      await grantTx.wait();

      expect(await contract.connect(signers.bob).canAccessResult()).to.be.true;

      const result = await contract.connect(signers.bob).getComputationResult();
      const decryptedResult = await fhevm.userDecryptEuint(FhevmType.euint32, result, contractAddress, signers.bob);

      expect(decryptedResult).to.eq(clearValueA + clearValueB);
    });

    it("should revert when user without access tries to get result", async function () {
      await expect(contract.connect(signers.bob).getComputationResult()).to.be.revertedWith("No access to result");
    });

    it("should revert when unauthorized user tries to grant access", async function () {
      await expect(contract.connect(signers.bob).grantResultAccess(signers.charlie.address)).to.be.revertedWith(
        "You don't have access to grant",
      );
    });

    it("should revert when trying to grant access to user who already has it", async function () {
      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(20)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      await expect(contract.connect(signers.alice).grantResultAccess(signers.alice.address)).to.be.revertedWith(
        "User already has access",
      );
    });

    it("should emit ComputationPerformed event", async function () {
      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(15)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(35)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .computeAndAllow(
            encryptedInputA.handles[0],
            encryptedInputA.inputProof,
            encryptedInputB.handles[0],
            encryptedInputB.inputProof,
          ),
      ).to.emit(contract, "ComputationPerformed");
    });

    it("should emit AccessGranted event", async function () {
      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(40)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(60)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      await expect(contract.connect(signers.alice).grantResultAccess(signers.bob.address))
        .to.emit(contract, "AccessGranted")
        .withArgs(signers.bob.address, await contract.getResultCounter());
    });
  });

  describe("Pattern 3: Batch Decryption", function () {
    it("should store batch data with proper permissions", async function () {
      const clearValues = [10, 20, 30];
      const encryptedInputs = [];

      for (const value of clearValues) {
        const encrypted = await fhevm
          .createEncryptedInput(contractAddress, signers.alice.address)
          .add32(value)
          .encrypt();
        encryptedInputs.push(encrypted);
      }

      const handles = encryptedInputs.map((e) => e.handles[0]);
      const proofs = encryptedInputs.map((e) => e.inputProof);

      const tx = await contract.connect(signers.alice).storeBatchData(handles, proofs);
      await tx.wait();
    });

    it("should revert with array length mismatch", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(100)
        .encrypt();

      await expect(contract.connect(signers.alice).storeBatchData([encryptedInput.handles[0]], [])).to.be.revertedWith(
        "Array length mismatch",
      );
    });

    it("should revert with too many values", async function () {
      const tooMany = 11;
      const encryptedInputs = [];

      for (let i = 0; i < tooMany; i++) {
        const encrypted = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(i).encrypt();
        encryptedInputs.push(encrypted);
      }

      const handles = encryptedInputs.map((e) => e.handles[0]);
      const proofs = encryptedInputs.map((e) => e.inputProof);

      await expect(contract.connect(signers.alice).storeBatchData(handles, proofs)).to.be.revertedWith(
        "Too many values (max 10)",
      );
    });
  });

  describe("Pattern 4: Conditional Decryption Access", function () {
    it("should compute if authorized", async function () {
      const initialValue = 1000n;
      const addendValue = 500n;

      const initialInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(initialValue)
        .encrypt();

      await contract.connect(signers.alice).storeMyData(initialInput.handles[0], initialInput.inputProof);

      const addendInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(addendValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .computeIfAuthorized(addendInput.handles[0], addendInput.inputProof);
      await tx.wait();

      const updatedData = await contract.connect(signers.alice).getMyData();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        updatedData,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(initialValue + addendValue);
    });

    it("should revert if user has no private data", async function () {
      const addendInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(100n)
        .encrypt();

      await expect(
        contract.connect(signers.alice).computeIfAuthorized(addendInput.handles[0], addendInput.inputProof),
      ).to.be.revertedWith("Must have private data first");
    });
  });

  describe("Pattern 5: Public Result Pattern", function () {
    it("should increment both public and encrypted counters", async function () {
      const initialPublicCounter = await contract.publicCounter();
      expect(initialPublicCounter).to.eq(0);

      const tx1 = await contract.connect(signers.alice).incrementCounters();
      await tx1.wait();

      expect(await contract.publicCounter()).to.eq(1);
      expect(await contract.isAuthorized(signers.alice.address)).to.be.true;

      const encryptedCounter = await contract.connect(signers.alice).getEncryptedCounter();
      const decryptedCounter = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCounter,
        contractAddress,
        signers.alice,
      );
      expect(decryptedCounter).to.eq(1);

      const tx2 = await contract.connect(signers.bob).incrementCounters();
      await tx2.wait();

      expect(await contract.publicCounter()).to.eq(2);

      const encryptedCounter2 = await contract.connect(signers.bob).getEncryptedCounter();
      const decryptedCounter2 = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCounter2,
        contractAddress,
        signers.bob,
      );
      expect(decryptedCounter2).to.eq(2);
    });

    it("should authorize user to decrypt counter", async function () {
      const tx1 = await contract.connect(signers.alice).incrementCounters();
      await tx1.wait();

      expect(await contract.isAuthorized(signers.bob.address)).to.be.false;

      const authTx = await contract.connect(signers.alice).authorizeUser(signers.bob.address);
      await authTx.wait();

      expect(await contract.isAuthorized(signers.bob.address)).to.be.true;

      const encryptedCounter = await contract.connect(signers.bob).getEncryptedCounter();
      const decryptedCounter = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedCounter,
        contractAddress,
        signers.bob,
      );
      expect(decryptedCounter).to.eq(1);
    });

    it("should revert when unauthorized user tries to get encrypted counter", async function () {
      await contract.connect(signers.alice).incrementCounters();

      await expect(contract.connect(signers.bob).getEncryptedCounter()).to.be.revertedWith("Not authorized");
    });

    it("should revert when unauthorized user tries to authorize others", async function () {
      await expect(contract.connect(signers.bob).authorizeUser(signers.charlie.address)).to.be.revertedWith(
        "You're not authorized",
      );
    });
  });

  describe("Pattern 6: Decryption in Practice", function () {
    it("should submit encrypted vote", async function () {
      const vote = 1;
      const encryptedVote = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(vote)
        .encrypt();

      const tx = await contract.connect(signers.alice).submitVote(encryptedVote.handles[0], encryptedVote.inputProof);
      await tx.wait();
    });
  });

  describe("Helper Functions", function () {
    it("should correctly report hasPrivateData status", async function () {
      expect(await contract.connect(signers.alice).hasPrivateData()).to.be.false;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(777n)
        .encrypt();

      await contract.connect(signers.alice).storeMyData(encryptedInput.handles[0], encryptedInput.inputProof);

      expect(await contract.connect(signers.alice).hasPrivateData()).to.be.true;
    });

    it("should correctly report canAccessResult status", async function () {
      expect(await contract.connect(signers.alice).canAccessResult()).to.be.false;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(20)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      expect(await contract.connect(signers.alice).canAccessResult()).to.be.true;
    });

    it("should return correct result counter", async function () {
      expect(await contract.getResultCounter()).to.eq(0);

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(5)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(15)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      expect(await contract.getResultCounter()).to.eq(1);
    });
  });

  describe("Multiple Users Scenario", function () {
    it("should allow multiple users to have separate private data", async function () {
      const aliceValue = 100n;
      const bobValue = 200n;

      const aliceInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(aliceValue)
        .encrypt();

      const bobInput = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add64(bobValue).encrypt();

      await contract.connect(signers.alice).storeMyData(aliceInput.handles[0], aliceInput.inputProof);
      await contract.connect(signers.bob).storeMyData(bobInput.handles[0], bobInput.inputProof);

      const aliceData = await contract.connect(signers.alice).getMyData();
      const aliceDecrypted = await fhevm.userDecryptEuint(FhevmType.euint64, aliceData, contractAddress, signers.alice);
      expect(aliceDecrypted).to.eq(aliceValue);

      const bobData = await contract.connect(signers.bob).getMyData();
      const bobDecrypted = await fhevm.userDecryptEuint(FhevmType.euint64, bobData, contractAddress, signers.bob);
      expect(bobDecrypted).to.eq(bobValue);
    });

    it("should allow multiple users to share computation result", async function () {
      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(50)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(30)
        .encrypt();

      await contract
        .connect(signers.alice)
        .computeAndAllow(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );

      await contract.connect(signers.alice).grantResultAccess(signers.bob.address);
      await contract.connect(signers.alice).grantResultAccess(signers.charlie.address);

      const resultForBob = await contract.connect(signers.bob).getComputationResult();
      const bobDecrypted = await fhevm.userDecryptEuint(FhevmType.euint32, resultForBob, contractAddress, signers.bob);
      expect(bobDecrypted).to.eq(80);

      const resultForCharlie = await contract.connect(signers.charlie).getComputationResult();
      const charlieDecrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        resultForCharlie,
        contractAddress,
        signers.charlie,
      );
      expect(charlieDecrypted).to.eq(80);
    });
  });
});

import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEInputProof, FHEInputProof__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEInputProof")) as FHEInputProof__factory;
  const contract = (await factory.deploy()) as FHEInputProof;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("FHEInputProof", function () {
  let signers: Signers;
  let contract: FHEInputProof;
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

  describe("Basic Input Proof Examples", function () {
    it("should store and retrieve encrypted uint8", async function () {
      const clearValue = 42;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(clearValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).storeUint8(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint8();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should store and retrieve encrypted uint16", async function () {
      const clearValue = 1234;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add16(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeUint16(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint16();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint16,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should store and retrieve encrypted uint32", async function () {
      const clearValue = 123456;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeUint32(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should store and retrieve encrypted uint64", async function () {
      const clearValue = 9876543210n;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeUint64(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint64();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should store and retrieve encrypted bool", async function () {
      const clearValue = true;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addBool(clearValue)
        .encrypt();

      const tx = await contract.connect(signers.alice).storeBool(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredBool();
      const decryptedValue = await fhevm.userDecryptEbool(storedValue, contractAddress, signers.alice);

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should store and retrieve encrypted address", async function () {
      const clearValue = signers.bob.address;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .addAddress(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeAddress(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredAddress();
      const decryptedValue = await fhevm.userDecryptEaddress(storedValue, contractAddress, signers.alice);

      expect(decryptedValue.toLowerCase()).to.eq(clearValue.toLowerCase());
    });
  });

  describe("Advanced Patterns", function () {
    it("should process batch of encrypted values", async function () {
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

      const tx = await contract.connect(signers.alice).batchProcess(handles, proofs);
      await tx.wait();

      const batchSum = await contract.getBatchSum();
      const decryptedSum = await fhevm.userDecryptEuint(FhevmType.euint32, batchSum, contractAddress, signers.alice);

      const expectedSum = clearValues.reduce((a, b) => a + b, 0);
      expect(decryptedSum).to.eq(expectedSum);
    });

    it("should store value with range check (valid range)", async function () {
      const clearValue = 50;
      const minValue = 10;
      const maxValue = 100;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeWithRangeCheck(encryptedInput.handles[0], encryptedInput.inputProof, minValue, maxValue);
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should combine two inputs with addition", async function () {
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

      const operation = 0; // addition

      const tx = await contract
        .connect(signers.alice)
        .combineInputs(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
          operation,
        );
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValueA + clearValueB);
    });

    it("should combine two inputs with subtraction", async function () {
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

      const operation = 1; // subtraction

      const tx = await contract
        .connect(signers.alice)
        .combineInputs(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
          operation,
        );
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValueA - clearValueB);
    });

    it("should combine two inputs with multiplication", async function () {
      const clearValueA = 10;
      const clearValueB = 5;

      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueA)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValueB)
        .encrypt();

      const operation = 2; // multiplication

      const tx = await contract
        .connect(signers.alice)
        .combineInputs(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
          operation,
        );
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValueA * clearValueB);
    });

    it("should store multiple values with separate proofs", async function () {
      const clearValueA = 111;
      const clearValueB = 222;

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
        .storeMultipleCorrectly(
          encryptedInputA.handles[0],
          encryptedInputA.inputProof,
          encryptedInputB.handles[0],
          encryptedInputB.inputProof,
        );
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValueA + clearValueB);
    });

    it("should store with proper permissions", async function () {
      const clearValue = 999;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .storeWithProperPermissions(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });
  });

  describe("Type Conversion Examples", function () {
    it("should convert uint8 to uint32", async function () {
      const clearValue = 123;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add8(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .convertUint8ToUint32(encryptedInput.handles[0], encryptedInput.inputProof);
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue);
    });

    it("should multiply encrypted value by plaintext constant", async function () {
      const clearValue = 7;
      const multiplier = 6;

      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .multiplyByConstant(encryptedInput.handles[0], encryptedInput.inputProof, multiplier);
      await tx.wait();

      const storedValue = await contract.getStoredUint32();
      const decryptedValue = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        storedValue,
        contractAddress,
        signers.alice,
      );

      expect(decryptedValue).to.eq(clearValue * multiplier);
    });
  });

  describe("Event Emissions", function () {
    it("should emit EncryptedValueStored event when storing uint32", async function () {
      const clearValue = 777;
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await expect(contract.connect(signers.alice).storeUint32(encryptedInput.handles[0], encryptedInput.inputProof))
        .to.emit(contract, "EncryptedValueStored")
        .withArgs("euint32", signers.alice.address);
    });

    it("should emit BatchProcessed event with correct count", async function () {
      const clearValues = [5, 10, 15];
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

      await expect(contract.connect(signers.alice).batchProcess(handles, proofs))
        .to.emit(contract, "BatchProcessed")
        .withArgs(clearValues.length);
    });
  });

  describe("Error Cases", function () {
    it("should revert batch process with empty array", async function () {
      await expect(contract.connect(signers.alice).batchProcess([], [])).to.be.revertedWith("Empty batch");
    });

    it("should revert batch process with mismatched array lengths", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(100)
        .encrypt();

      await expect(contract.connect(signers.alice).batchProcess([encryptedInput.handles[0]], [])).to.be.revertedWith(
        "Length mismatch",
      );
    });

    it("should revert combineInputs with invalid operation", async function () {
      const encryptedInputA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();

      const encryptedInputB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(5)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .combineInputs(
            encryptedInputA.handles[0],
            encryptedInputA.inputProof,
            encryptedInputB.handles[0],
            encryptedInputB.inputProof,
            3,
          ),
      ).to.be.revertedWith("Invalid operation");
    });

    it("should revert storeWithRangeCheck with invalid range", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(50)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .storeWithRangeCheck(encryptedInput.handles[0], encryptedInput.inputProof, 100, 10),
      ).to.be.revertedWith("Invalid range");
    });
  });
});

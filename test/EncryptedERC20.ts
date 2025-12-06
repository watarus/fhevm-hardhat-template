import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedERC20, EncryptedERC20__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedERC20")) as EncryptedERC20__factory;
  const contract = (await factory.deploy("ConfidentialToken", "CTK", 1000000)) as EncryptedERC20;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("EncryptedERC20", function () {
  let signers: Signers;
  let contract: EncryptedERC20;
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
    it("should set token name and symbol", async function () {
      expect(await contract.name()).to.eq("ConfidentialToken");
      expect(await contract.symbol()).to.eq("CTK");
    });

    it("should set total supply", async function () {
      expect(await contract.totalSupply()).to.eq(1000000);
    });

    it("should mint initial supply to deployer", async function () {
      const encryptedBalance = await contract.connect(signers.deployer).balanceOf();
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.deployer,
      );

      expect(decryptedBalance).to.eq(1000000n);
    });
  });

  describe("Transfer", function () {
    it("should transfer encrypted amount to recipient", async function () {
      const transferAmount = 1000n;

      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(transferAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.deployer)
        .transfer(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      await tx.wait();

      const aliceBalance = await contract.connect(signers.alice).balanceOf();
      const decryptedAliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        aliceBalance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedAliceBalance).to.eq(transferAmount);

      const deployerBalance = await contract.connect(signers.deployer).balanceOf();
      const decryptedDeployerBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        deployerBalance,
        contractAddress,
        signers.deployer,
      );

      expect(decryptedDeployerBalance).to.eq(1000000n - transferAmount);
    });

    it("should emit Transfer event", async function () {
      const transferAmount = 500n;

      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(transferAmount)
        .encrypt();

      await expect(
        contract
          .connect(signers.deployer)
          .transfer(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof),
      )
        .to.emit(contract, "Transfer")
        .withArgs(signers.deployer.address, signers.alice.address);
    });
  });

  describe("Approve and Allowance", function () {
    it("should approve spender to transfer encrypted amount", async function () {
      const approvalAmount = 5000n;

      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(approvalAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.deployer)
        .approve(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof);
      await tx.wait();

      const encryptedAllowance = await contract.allowance(signers.deployer.address, signers.alice.address);
      const decryptedAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedAllowance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedAllowance).to.eq(approvalAmount);
    });

    it("should emit Approval event", async function () {
      const approvalAmount = 3000n;

      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(approvalAmount)
        .encrypt();

      await expect(
        contract
          .connect(signers.deployer)
          .approve(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof),
      )
        .to.emit(contract, "Approval")
        .withArgs(signers.deployer.address, signers.alice.address);
    });
  });

  describe("TransferFrom", function () {
    it("should transfer from owner to recipient using allowance", async function () {
      const approvalAmount = 5000n;
      const transferAmount = 2000n;

      const encryptedApproval = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address)
        .add64(approvalAmount)
        .encrypt();

      await contract
        .connect(signers.deployer)
        .approve(signers.alice.address, encryptedApproval.handles[0], encryptedApproval.inputProof);

      const encryptedTransfer = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(transferAmount)
        .encrypt();

      const tx = await contract
        .connect(signers.alice)
        .transferFrom(
          signers.deployer.address,
          signers.bob.address,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof,
        );
      await tx.wait();

      const bobBalance = await contract.connect(signers.bob).balanceOf();
      const decryptedBobBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bobBalance,
        contractAddress,
        signers.bob,
      );

      expect(decryptedBobBalance).to.eq(transferAmount);

      const encryptedAllowance = await contract.allowance(signers.deployer.address, signers.alice.address);
      const decryptedAllowance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedAllowance,
        contractAddress,
        signers.alice,
      );

      expect(decryptedAllowance).to.eq(approvalAmount - transferAmount);
    });
  });
});

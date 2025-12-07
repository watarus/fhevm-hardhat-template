#!/usr/bin/env ts-node
/**
 * FHEVM Example Hub CLI
 *
 * A command-line tool for scaffolding FHEVM example projects.
 *
 * Usage:
 *   npx ts-node scripts/cli.ts list                    - List available examples
 *   npx ts-node scripts/cli.ts scaffold <name>         - Create a new example project
 *   npx ts-node scripts/cli.ts generate-tests <name>   - Generate test file for an example
 *   npx ts-node scripts/cli.ts docs                    - Generate documentation
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Example definitions with metadata for documentation
interface ExampleDefinition {
  name: string;
  description: string;
  category: "basic" | "encryption" | "access-control" | "advanced" | "anti-pattern";
  contractFile: string;
  concepts: string[];
}

const EXAMPLES: ExampleDefinition[] = [
  {
    name: "counter",
    description: "Basic encrypted counter with increment/decrement operations",
    category: "basic",
    contractFile: "FHECounter.sol",
    concepts: ["euint32", "FHE.add", "FHE.sub", "FHE.allow", "inputProof"],
  },
  {
    name: "input-proof",
    description: "Complete guide to FHE.fromExternal() and input proofs for all encrypted types",
    category: "basic",
    contractFile: "FHEInputProof.sol",
    concepts: [
      "FHE.fromExternal",
      "input proofs",
      "euint8",
      "euint16",
      "euint32",
      "euint64",
      "ebool",
      "eaddress",
      "batch processing",
    ],
  },
  {
    name: "comparisons",
    description: "Encrypted comparison operations (eq, ne, lt, gt, le, ge)",
    category: "basic",
    contractFile: "FHEComparisons.sol",
    concepts: ["FHE.eq", "FHE.ne", "FHE.lt", "FHE.gt", "FHE.le", "FHE.ge", "ebool"],
  },
  {
    name: "arithmetic",
    description: "Encrypted arithmetic operations (add, sub, mul)",
    category: "basic",
    contractFile: "FHEArithmetic.sol",
    concepts: ["FHE.add", "FHE.sub", "FHE.mul"],
  },
  {
    name: "bitwise",
    description: "Encrypted bitwise operations (and, or, xor, shl, shr)",
    category: "basic",
    contractFile: "FHEBitwise.sol",
    concepts: ["FHE.and", "FHE.or", "FHE.xor", "FHE.shl", "FHE.shr"],
  },
  {
    name: "encryption",
    description: "Encryption patterns: asEuintX, fromExternal, batch operations",
    category: "encryption",
    contractFile: "FHEEncryption.sol",
    concepts: [
      "FHE.asEuint8",
      "FHE.asEuint16",
      "FHE.asEuint32",
      "FHE.asEuint64",
      "FHE.fromExternal",
      "batch encryption",
      "type casting",
    ],
  },
  {
    name: "decryption",
    description: "Decryption patterns: user decryption, multi-user access, conditional access",
    category: "encryption",
    contractFile: "FHEDecryption.sol",
    concepts: ["FHE.allow", "client-side decryption", "access control", "conditional decryption", "batch decryption"],
  },
  {
    name: "encrypted-erc20",
    description: "ERC20 token with encrypted balances",
    category: "encryption",
    contractFile: "EncryptedERC20.sol",
    concepts: ["euint64", "encrypted balances", "confidential transfers"],
  },
  {
    name: "access-control",
    description: "Access control patterns for encrypted data",
    category: "access-control",
    contractFile: "FHEAccessControl.sol",
    concepts: ["FHE.allow", "FHE.allowThis", "re-encryption", "permissions"],
  },
  {
    name: "blind-auction",
    description: "Sealed-bid auction where bids remain encrypted until reveal",
    category: "advanced",
    contractFile: "BlindAuction.sol",
    concepts: ["euint64", "FHE.select", "FHE.gt", "encrypted bids"],
  },
  {
    name: "trustless-matching",
    description: "Private matching (dating app style) - votes revealed only on mutual match",
    category: "advanced",
    contractFile: "TrustlessMatching.sol",
    concepts: ["ebool", "FHE.and", "encrypted votes", "conditional reveal"],
  },
  {
    name: "anti-missing-allow",
    description: "Anti-pattern: Missing FHE.allow causing access issues",
    category: "anti-pattern",
    contractFile: "AntiMissingAllow.sol",
    concepts: ["FHE.allow", "common mistakes", "access errors"],
  },
  {
    name: "anti-overflow",
    description: "Anti-pattern: Overflow/underflow without proper checks",
    category: "anti-pattern",
    contractFile: "AntiOverflow.sol",
    concepts: ["overflow", "underflow", "range checks"],
  },
];

function listExamples(): void {
  console.log("\n📚 Available FHEVM Examples\n");
  console.log("=".repeat(60));

  const categories = ["basic", "encryption", "access-control", "advanced", "anti-pattern"];

  for (const category of categories) {
    const categoryExamples = EXAMPLES.filter((e) => e.category === category);
    if (categoryExamples.length > 0) {
      console.log(`\n🏷️  ${category.toUpperCase()}\n`);
      for (const example of categoryExamples) {
        console.log(`  ${example.name}`);
        console.log(`    └─ ${example.description}`);
        console.log(`    └─ Concepts: ${example.concepts.join(", ")}`);
      }
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log("\nUsage: npx ts-node scripts/cli.ts scaffold <example-name>\n");
}

/**
 * Generate test file content based on contract analysis
 */
function generateTestContent(example: ExampleDefinition, contractPath: string): string {
  const contractName = example.contractFile.replace(".sol", "");
  const contractVarName = contractName.charAt(0).toLowerCase() + contractName.slice(1);

  // Read contract to extract functions for test generation
  let contractContent = "";
  try {
    contractContent = fs.readFileSync(contractPath, "utf-8");
  } catch (error) {
    // Contract read failure is fatal - test generation cannot proceed without contract content
    console.error(
      `❌ Failed to read contract file for test generation: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Provide specific error messages based on error code
    if (error instanceof Error && "code" in error) {
      const nodeError = error as NodeJS.ErrnoException;
      switch (nodeError.code) {
        case "ENOENT":
          console.error(`   Contract file not found at: ${contractPath}`);
          console.error(`   Please ensure the contract file exists before generating tests.`);
          break;
        case "EACCES":
          console.error(`   Permission denied reading: ${contractPath}`);
          console.error(`   Please check file permissions and try again.`);
          break;
        case "EISDIR":
          console.error(`   Path is a directory, not a file: ${contractPath}`);
          break;
        default:
          console.error(`   Error code: ${nodeError.code}`);
      }
    }
    process.exit(1);
  }

  // Extract function signatures from contract
  const functionPattern = /function\s+(\w+)\s*\([^)]*\)\s+external/g;
  const functions: string[] = [];
  let match;
  while ((match = functionPattern.exec(contractContent)) !== null) {
    functions.push(match[1]);
  }

  // Generate test template based on category
  return generateTestTemplate(example, contractName, contractVarName, functions);
}

/**
 * Generate test template based on example category
 */
function generateTestTemplate(
  example: ExampleDefinition,
  contractName: string,
  contractVarName: string,
  _functions: string[],
): string {
  const hasEncryption = example.concepts.some((c) => c.includes("euint") || c.includes("ebool"));

  let testContent = `import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ${contractName}, ${contractName}__factory } from "../types";
import { expect } from "chai";`;

  if (hasEncryption) {
    testContent += `
import { FhevmType } from "@fhevm/hardhat-plugin";`;
  }

  testContent += `

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("${contractName}")) as ${contractName}__factory;
  const ${contractVarName}Contract = (await factory.deploy()) as ${contractName};
  const ${contractVarName}ContractAddress = await ${contractVarName}Contract.getAddress();

  return { ${contractVarName}Contract, ${contractVarName}ContractAddress };
}

describe("${contractName}", function () {
  let signers: Signers;
  let ${contractVarName}Contract: ${contractName};
  let ${contractVarName}ContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(\`This hardhat test suite cannot run on Sepolia Testnet\`);
      this.skip();
    }

    ({ ${contractVarName}Contract, ${contractVarName}ContractAddress } = await deployFixture());
  });

  it("should deploy successfully", async function () {
    expect(await ${contractVarName}Contract.getAddress()).to.be.properAddress;
  });
`;

  // Generate specific test cases based on category
  if (example.category === "basic") {
    testContent += generateBasicTests(example, contractVarName);
  } else if (example.category === "encryption") {
    testContent += generateEncryptionTests(contractVarName);
  } else if (example.category === "access-control") {
    testContent += generateAccessControlTests(contractVarName);
  } else if (example.category === "advanced") {
    testContent += generateAdvancedTests(example, contractVarName);
  } else if (example.category === "anti-pattern") {
    testContent += generateAntiPatternTests(example);
  }

  testContent += `});
`;

  return testContent;
}

/**
 * Generate test cases for basic examples
 */
function generateBasicTests(example: ExampleDefinition, contractVarName: string): string {
  let tests = "";

  // Add encryption/decryption test if applicable
  if (example.concepts.some((c) => c.includes("euint"))) {
    tests += `
  it("should handle encrypted values correctly", async function () {
    // Create encrypted input
    const clearValue = 42;
    const encryptedInput = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    // TODO: Add contract interaction with encrypted value
    // Example: await ${contractVarName}Contract.connect(signers.alice).someFunction(encryptedInput.handles[0], encryptedInput.inputProof);
  });
`;
  }

  // Add operation-specific tests
  if (example.concepts.includes("FHE.add")) {
    tests += `
  it("should perform encrypted addition", async function () {
    const a = 10;
    const b = 20;

    const encryptedA = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(a)
      .encrypt();

    const encryptedB = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(b)
      .encrypt();

    // TODO: Call contract's add function and verify result
  });
`;
  }

  if (example.concepts.includes("FHE.eq") || example.concepts.includes("FHE.ne")) {
    tests += `
  it("should perform encrypted comparison", async function () {
    const value1 = 100;
    const value2 = 200;

    const encrypted1 = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(value1)
      .encrypt();

    const encrypted2 = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(value2)
      .encrypt();

    // TODO: Call contract's comparison function and verify result
  });
`;
  }

  return tests;
}

/**
 * Generate test cases for encryption examples
 */
function generateEncryptionTests(contractVarName: string): string {
  return `
  it("should handle encrypted transfers", async function () {
    // TODO: Test encrypted balance transfers
    const amount = 1000;
    const encryptedAmount = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add64(amount)
      .encrypt();

    // Add transfer logic here
  });

  it("should maintain balance privacy", async function () {
    // TODO: Verify that balances remain encrypted and private
  });

  it("should allow authorized decryption", async function () {
    // TODO: Test that authorized users can decrypt their own balances
  });
`;
}

/**
 * Generate test cases for access control examples
 */
function generateAccessControlTests(contractVarName: string): string {
  return `
  it("should grant access with FHE.allow", async function () {
    // TODO: Test FHE.allow functionality
    const value = 42;
    const encryptedValue = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add32(value)
      .encrypt();

    // Store value and verify access control
  });

  it("should deny access to unauthorized users", async function () {
    // TODO: Test that unauthorized users cannot access encrypted data
  });

  it("should allow re-encryption for authorized users", async function () {
    // TODO: Test re-encryption permissions
  });
`;
}

/**
 * Generate test cases for advanced examples
 */
function generateAdvancedTests(example: ExampleDefinition, contractVarName: string): string {
  if (example.name.includes("auction")) {
    return `
  it("should accept encrypted bids", async function () {
    const bidAmount = 1000;
    const encryptedBid = await fhevm
      .createEncryptedInput(${contractVarName}ContractAddress, signers.alice.address)
      .add64(bidAmount)
      .encrypt();

    // TODO: Submit bid and verify
  });

  it("should determine winner correctly", async function () {
    // TODO: Test winner determination logic
  });

  it("should keep bids private until reveal", async function () {
    // TODO: Verify bid privacy
  });
`;
  }

  return `
  it("should handle complex encrypted operations", async function () {
    // TODO: Add test cases for advanced functionality
  });
`;
}

/**
 * Generate test cases for anti-pattern examples
 */
function generateAntiPatternTests(example: ExampleDefinition): string {
  if (example.name.includes("missing-allow")) {
    return `
  it("should demonstrate missing FHE.allow issue", async function () {
    // TODO: Test that demonstrates the anti-pattern
    // This should show what happens when FHE.allow is missing
  });

  it("should show correct pattern with FHE.allow", async function () {
    // TODO: Show the correct implementation for comparison
  });
`;
  }

  if (example.name.includes("overflow")) {
    return `
  it("should demonstrate overflow vulnerability", async function () {
    // TODO: Test that demonstrates overflow issue
  });

  it("should show proper overflow protection", async function () {
    // TODO: Show the correct pattern with overflow checks
  });
`;
  }

  return `
  it("should demonstrate the anti-pattern", async function () {
    // TODO: Add test demonstrating the anti-pattern
  });

  it("should show the correct pattern", async function () {
    // TODO: Show the correct implementation
  });
`;
}

/**
 * Generate test file for a specific example
 */
function generateTests(exampleName: string, outputDir?: string): void {
  const example = EXAMPLES.find((e) => e.name === exampleName);

  if (!example) {
    console.error(`❌ Unknown example: ${exampleName}`);
    console.log("\nAvailable examples:");
    EXAMPLES.forEach((e) => console.log(`  - ${e.name}`));
    process.exit(1);
  }

  const baseDir = path.resolve(__dirname, "..");
  const contractPath = path.join(baseDir, "contracts", example.contractFile);
  const testFileName = example.contractFile.replace(".sol", ".ts");

  const testDir = outputDir || path.join(baseDir, "test");
  const testPath = path.join(testDir, testFileName);

  console.log(`\n🧪 Generating test file for "${example.name}"...`);

  // Check if test file already exists
  if (fs.existsSync(testPath)) {
    console.error(`❌ Test file already exists: ${testPath}`);
    console.log("\nPlease remove the existing file or choose a different output directory.");
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    try {
      fs.mkdirSync(testDir, { recursive: true });
    } catch (error) {
      console.error(`❌ Failed to create output directory: ${error instanceof Error ? error.message : String(error)}`);

      // Provide specific error messages based on error code
      if (error instanceof Error && "code" in error) {
        const nodeError = error as NodeJS.ErrnoException;
        switch (nodeError.code) {
          case "EACCES":
            console.error(`   Permission denied creating: ${testDir}`);
            console.error(`   Please check directory permissions and try again.`);
            break;
          case "ENOSPC":
            console.error(`   No space left on device.`);
            console.error(`   Please free up disk space and try again.`);
            break;
          case "EROFS":
            console.error(`   Read-only file system.`);
            console.error(`   Cannot create directory on read-only file system.`);
            break;
          default:
            console.error(`   Error code: ${nodeError.code}`);
        }
      }
      process.exit(1);
    }
  }

  // Generate test content
  const testContent = generateTestContent(example, contractPath);

  try {
    fs.writeFileSync(testPath, testContent);
    console.log(`✅ Test file generated: ${testPath}\n`);
    console.log("Next steps:");
    console.log("  1. Review the generated test file");
    console.log("  2. Complete the TODO sections with specific test logic");
    console.log("  3. Run tests with: npm run test\n");
  } catch (error) {
    console.error(`❌ Failed to write test file: ${error instanceof Error ? error.message : String(error)}`);

    // Provide specific error messages based on error code
    if (error instanceof Error && "code" in error) {
      const nodeError = error as NodeJS.ErrnoException;
      switch (nodeError.code) {
        case "EACCES":
          console.error(`   Permission denied writing to: ${testPath}`);
          console.error(`   Please check file permissions and try again.`);
          break;
        case "ENOSPC":
          console.error(`   No space left on device.`);
          console.error(`   Please free up disk space and try again.`);
          break;
        case "EROFS":
          console.error(`   Read-only file system.`);
          console.error(`   Cannot write file on read-only file system.`);
          break;
        case "EISDIR":
          console.error(`   Path is a directory, not a file: ${testPath}`);
          break;
        default:
          console.error(`   Error code: ${nodeError.code}`);
      }
    }
    console.error(`   Path: ${testPath}`);
    process.exit(1);
  }
}

function scaffoldExample(exampleName: string, outputDir?: string): void {
  const example = EXAMPLES.find((e) => e.name === exampleName);

  if (!example) {
    console.error(`❌ Unknown example: ${exampleName}`);
    console.log("\nAvailable examples:");
    EXAMPLES.forEach((e) => console.log(`  - ${e.name}`));
    process.exit(1);
  }

  const targetDir = outputDir || `fhevm-example-${exampleName}`;
  const absoluteTargetDir = path.resolve(targetDir);

  console.log(`\n🚀 Scaffolding "${example.name}" example...`);
  console.log(`   Target: ${absoluteTargetDir}\n`);

  // Create directory structure
  if (fs.existsSync(absoluteTargetDir)) {
    console.error(`❌ Directory already exists: ${absoluteTargetDir}`);
    process.exit(1);
  }

  try {
    fs.mkdirSync(absoluteTargetDir, { recursive: true });
    fs.mkdirSync(path.join(absoluteTargetDir, "contracts"));
    fs.mkdirSync(path.join(absoluteTargetDir, "test"));
    fs.mkdirSync(path.join(absoluteTargetDir, "deploy"));
    fs.mkdirSync(path.join(absoluteTargetDir, "tasks"));
  } catch (error) {
    console.error(`❌ Failed to create directory structure: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Check that you have write permissions in the target directory");
    console.log("  - Ensure the parent directory exists and is accessible");
    console.log(`  - Try creating the directory manually: mkdir -p "${absoluteTargetDir}"`);
    process.exit(1);
  }

  // Copy base config files
  const baseDir = path.resolve(__dirname, "..");
  const filesToCopy = [
    "hardhat.config.ts",
    "tsconfig.json",
    "package.json",
    ".eslintrc.yml",
    ".eslintignore",
    ".prettierrc.yml",
    ".prettierignore",
    ".solhint.json",
    ".solhintignore",
    ".solcover.js",
    ".gitignore",
  ];

  for (const file of filesToCopy) {
    const src = path.join(baseDir, file);
    const dest = path.join(absoluteTargetDir, file);
    if (fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, dest);
      } catch (error) {
        console.error(`❌ Failed to copy ${file}: ${error instanceof Error ? error.message : String(error)}`);
        console.log("\nPossible fixes:");
        console.log("  - Check that you have read permissions for the source file");
        console.log("  - Check that you have write permissions for the destination");
        console.log(`  - Source: ${src}`);
        console.log(`  - Destination: ${dest}`);
        process.exit(1);
      }
    } else {
      console.warn(`⚠️  Configuration file not found (skipping): ${file}`);
    }
  }

  // Copy contract file
  const contractSrc = path.join(baseDir, "contracts", example.contractFile);
  const contractDest = path.join(absoluteTargetDir, "contracts", example.contractFile);
  if (fs.existsSync(contractSrc)) {
    try {
      fs.copyFileSync(contractSrc, contractDest);
    } catch (error) {
      console.error(`❌ Failed to copy contract file: ${error instanceof Error ? error.message : String(error)}`);
      console.log("\nPossible fixes:");
      console.log("  - Check that you have read permissions for the contract file");
      console.log("  - Check that you have write permissions for the destination");
      console.log(`  - Source: ${contractSrc}`);
      console.log(`  - Destination: ${contractDest}`);
      process.exit(1);
    }
  } else {
    console.warn(`⚠️  Contract file not found: ${contractSrc}`);
    console.warn("    The scaffolded project may be incomplete without the main contract file.");
  }

  // Copy test file if exists, otherwise generate one
  const testFileName = example.contractFile.replace(".sol", ".ts");
  const testSrc = path.join(baseDir, "test", testFileName);
  const testDest = path.join(absoluteTargetDir, "test", testFileName);
  if (fs.existsSync(testSrc)) {
    try {
      fs.copyFileSync(testSrc, testDest);
      console.log(`  ✅ Copied existing test file`);
    } catch (error) {
      console.error(`❌ Failed to copy test file: ${error instanceof Error ? error.message : String(error)}`);
      console.log("\nPossible fixes:");
      console.log("  - Check file permissions");
      console.log(`  - Source: ${testSrc}`);
      console.log(`  - Destination: ${testDest}`);
      process.exit(1);
    }
  } else {
    // Generate test file if it doesn't exist
    console.log(`  🧪 Generating test file...`);
    try {
      const testContent = generateTestContent(example, contractSrc);
      fs.writeFileSync(testDest, testContent);
      console.log(`  ✅ Test file generated`);
    } catch (error) {
      console.warn(`  ⚠️  Failed to generate test file: ${error instanceof Error ? error.message : String(error)}`);
      console.warn("     You can generate it later using: npx ts-node scripts/cli.ts generate-tests " + exampleName);
    }
  }

  // Copy tasks/accounts.ts (required by hardhat.config.ts)
  const accountsSrc = path.join(baseDir, "tasks", "accounts.ts");
  const accountsDest = path.join(absoluteTargetDir, "tasks", "accounts.ts");
  if (fs.existsSync(accountsSrc)) {
    try {
      fs.copyFileSync(accountsSrc, accountsDest);
    } catch (error) {
      console.warn(`⚠️  Failed to copy tasks/accounts.ts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Copy deploy file if exists
  const deploySrc = path.join(baseDir, "deploy", "deploy.ts");
  const deployDest = path.join(absoluteTargetDir, "deploy", "deploy.ts");
  if (fs.existsSync(deploySrc)) {
    try {
      // Read and modify deploy script for this contract
      let deployContent = fs.readFileSync(deploySrc, "utf-8");
      const contractName = example.contractFile.replace(".sol", "");
      deployContent = deployContent.replace(/FHECounter/g, contractName);
      deployContent = deployContent.replace(/fheCounter/g, contractName.toLowerCase());
      fs.writeFileSync(deployDest, deployContent);
    } catch (error) {
      console.error(`❌ Failed to process deploy file: ${error instanceof Error ? error.message : String(error)}`);
      console.log("\nPossible fixes:");
      console.log("  - Check that you have read permissions for the deploy template");
      console.log("  - Check that you have write permissions for the destination");
      console.log(`  - Source: ${deploySrc}`);
      console.log(`  - Destination: ${deployDest}`);
      process.exit(1);
    }
  }

  // Update package.json
  const pkgPath = path.join(absoluteTargetDir, "package.json");
  try {
    const pkgContent = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgContent);
    pkg.name = `fhevm-example-${exampleName}`;
    pkg.description = example.description;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  } catch (error) {
    console.error(`❌ Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Ensure package.json was copied correctly");
    console.log("  - Check that the package.json contains valid JSON");
    console.log("  - Verify file permissions");
    console.log(`  - Path: ${pkgPath}`);
    process.exit(1);
  }

  // Update hardhat.config.ts to remove FHECounter task import
  const configPath = path.join(absoluteTargetDir, "hardhat.config.ts");
  try {
    let configContent = fs.readFileSync(configPath, "utf-8");
    configContent = configContent.replace(/import "\.\/tasks\/FHECounter";\n?/g, "");
    fs.writeFileSync(configPath, configContent);
  } catch (error) {
    console.error(`❌ Failed to update hardhat.config.ts: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Ensure hardhat.config.ts was copied correctly");
    console.log("  - Check file permissions");
    console.log(`  - Path: ${configPath}`);
    process.exit(1);
  }

  // Generate README
  generateReadme(example, absoluteTargetDir);

  console.log("✅ Scaffolding complete!\n");
  console.log("Next steps:");
  console.log(`  cd ${targetDir}`);
  console.log("  npm install");
  console.log("  npm run compile");
  console.log("  npm run test\n");
}

function generateReadme(example: ExampleDefinition, targetDir: string): void {
  const contractName = example.contractFile.replace(".sol", "");

  const readme = `# FHEVM Example: ${example.name}

${example.description}

## Category

\`${example.category}\`

## Concepts Demonstrated

${example.concepts.map((c) => `- \`${c}\``).join("\n")}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests (local mock)
npm run test

# Deploy to Sepolia
npm run deploy:sepolia
\`\`\`

## Contract: ${contractName}

See \`contracts/${example.contractFile}\` for the implementation.

## Testing

\`\`\`bash
# Run all tests
npm run test

# Run tests on Sepolia (requires MNEMONIC and INFURA_API_KEY)
npm run test:sepolia
\`\`\`

## Learn More

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity API](https://docs.zama.ai/fhevm/references/api)
- [Zama Discord](https://discord.gg/zama)

---

Generated by [FHEVM Example Hub CLI](https://github.com/zama-ai/fhevm-hardhat-template)
`;

  try {
    fs.writeFileSync(path.join(targetDir, "README.md"), readme);
  } catch (error) {
    console.error(`❌ Failed to generate README.md: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Check that you have write permissions in the target directory");
    console.log(`  - Path: ${path.join(targetDir, "README.md")}`);
    process.exit(1);
  }
}

function generateDocs(): void {
  console.log("\n📖 Generating documentation...\n");

  const contractsDir = path.resolve(__dirname, "..", "contracts");
  const docsDir = path.resolve(__dirname, "..", "docs");

  try {
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
  } catch (error) {
    console.error(`❌ Failed to create docs directory: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Check that you have write permissions in the project directory");
    console.log(`  - Path: ${docsDir}`);
    process.exit(1);
  }

  // Generate index
  let indexContent = "# FHEVM Examples Documentation\n\n";
  indexContent += "This documentation is auto-generated from NatSpec comments.\n\n";
  indexContent += "## Examples\n\n";

  for (const example of EXAMPLES) {
    const contractPath = path.join(contractsDir, example.contractFile);
    if (fs.existsSync(contractPath)) {
      try {
        const content = fs.readFileSync(contractPath, "utf-8");
        const docContent = extractNatSpec(content, example);

        const docPath = path.join(docsDir, `${example.name}.md`);
        fs.writeFileSync(docPath, docContent);

        indexContent += `- [${example.name}](./${example.name}.md) - ${example.description}\n`;
        console.log(`  ✅ ${example.name}.md`);
      } catch (error) {
        console.error(
          `❌ Failed to process ${example.contractFile}: ${error instanceof Error ? error.message : String(error)}`,
        );
        console.log("\nPossible fixes:");
        console.log("  - Check that you have read permissions for the contract file");
        console.log("  - Check that you have write permissions for the docs directory");
        console.log(`  - Contract path: ${contractPath}`);
        console.log(`  - Docs directory: ${docsDir}`);
        process.exit(1);
      }
    }
  }

  try {
    fs.writeFileSync(path.join(docsDir, "README.md"), indexContent);
    console.log("\n✅ Documentation generated in docs/");

    // Run prettier to format the generated docs
    console.log("📝 Formatting with prettier...");
    try {
      execSync('npx prettier --write "docs/**/*.md"', { stdio: "ignore" });
      console.log("✅ Formatting complete\n");
    } catch {
      console.log("⚠️  Prettier formatting skipped (not available)\n");
    }
  } catch (error) {
    console.error(`❌ Failed to write docs index: ${error instanceof Error ? error.message : String(error)}`);
    console.log("\nPossible fixes:");
    console.log("  - Check that you have write permissions in the docs directory");
    console.log(`  - Path: ${path.join(docsDir, "README.md")}`);
    process.exit(1);
  }
}

function extractNatSpec(solidityCode: string, example: ExampleDefinition): string {
  const contractName = example.contractFile.replace(".sol", "");

  let doc = `# ${contractName}\n\n`;
  doc += `${example.description}\n\n`;
  doc += `## Category: ${example.category}\n\n`;
  doc += `## Concepts\n\n`;
  doc += example.concepts.map((c) => `- \`${c}\``).join("\n");
  doc += "\n\n## Source Code\n\n";
  doc += "```solidity\n";
  doc += solidityCode;
  doc += "\n```\n";

  // Extract NatSpec comments
  const natspecRegex = /\/\/\/\s*@(\w+)\s+(.+)/g;
  let match;
  const natspec: { [key: string]: string[] } = {};

  while ((match = natspecRegex.exec(solidityCode)) !== null) {
    const tag = match[1];
    const value = match[2];
    if (!natspec[tag]) {
      natspec[tag] = [];
    }
    natspec[tag].push(value);
  }

  if (Object.keys(natspec).length > 0) {
    doc += "\n## NatSpec Documentation\n\n";
    for (const [tag, values] of Object.entries(natspec)) {
      doc += `### @${tag}\n\n`;
      values.forEach((v) => {
        doc += `- ${v}\n`;
      });
      doc += "\n";
    }
  }

  return doc;
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "list":
    listExamples();
    break;
  case "scaffold":
    if (!args[1]) {
      console.error("❌ Please specify an example name");
      console.log("Usage: npx ts-node scripts/cli.ts scaffold <example-name>");
      process.exit(1);
    }
    scaffoldExample(args[1], args[2]);
    break;
  case "generate-tests":
    if (!args[1]) {
      console.error("❌ Please specify an example name");
      console.log("Usage: npx ts-node scripts/cli.ts generate-tests <example-name> [output-dir]");
      process.exit(1);
    }
    generateTests(args[1], args[2]);
    break;
  case "docs":
    generateDocs();
    break;
  default:
    console.log(`
FHEVM Example Hub CLI

Usage:
  npx ts-node scripts/cli.ts list                    - List available examples
  npx ts-node scripts/cli.ts scaffold <name>         - Create a new example project
  npx ts-node scripts/cli.ts generate-tests <name>   - Generate test file for an example
  npx ts-node scripts/cli.ts docs                    - Generate documentation
`);
}

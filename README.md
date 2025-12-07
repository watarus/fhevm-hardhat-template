# FHEVM Example Hub

A comprehensive collection of FHEVM (Fully Homomorphic Encryption Virtual Machine) examples built with Hardhat. Each
example demonstrates one clear concept with automated scaffolding, tests, and documentation.

## Quick Start

```bash
# Install dependencies
npm install

# Compile all contracts
npm run compile

# Run tests
npm run test

# Deploy to Sepolia
npm run deploy:sepolia
```

## CLI Tool

The Example Hub includes a CLI for scaffolding standalone example projects:

```bash
# List available examples
npx ts-node scripts/cli.ts list

# Scaffold a new example project
npx ts-node scripts/cli.ts scaffold trustless-matching

# Generate documentation from contracts
npx ts-node scripts/cli.ts docs
```

## Available Examples

### Basic Operations

| Example       | Description                                | Concepts                                             |
| ------------- | ------------------------------------------ | ---------------------------------------------------- |
| `counter`     | Encrypted counter with increment/decrement | `euint32`, `FHE.add`, `FHE.sub`, `inputProof`        |
| `comparisons` | Encrypted comparison operations            | `FHE.eq`, `FHE.ne`, `FHE.lt`, `FHE.gt`, `ebool`      |
| `arithmetic`  | Encrypted arithmetic operations            | `FHE.add`, `FHE.sub`, `FHE.mul`                      |
| `bitwise`     | Encrypted bitwise operations               | `FHE.and`, `FHE.or`, `FHE.xor`, `FHE.shl`, `FHE.shr` |

### Encryption Patterns

| Example           | Description                   | Concepts                          |
| ----------------- | ----------------------------- | --------------------------------- |
| `encrypted-erc20` | ERC20 with encrypted balances | `euint64`, confidential transfers |

### Access Control

| Example          | Description             | Concepts                                  |
| ---------------- | ----------------------- | ----------------------------------------- |
| `access-control` | Access control patterns | `FHE.allow`, `FHE.allowThis`, permissions |

### Advanced Patterns

| Example              | Description                    | Concepts                               |
| -------------------- | ------------------------------ | -------------------------------------- |
| `blind-auction`      | Sealed-bid auction             | `FHE.select`, `FHE.gt`, encrypted bids |
| `trustless-matching` | Private voting/matching system | `ebool`, `FHE.and`, conditional reveal |

### Anti-Patterns (Common Mistakes)

| Example              | Description               | Concepts                      |
| -------------------- | ------------------------- | ----------------------------- |
| `anti-missing-allow` | Missing FHE.allow issues  | Access errors, permissions    |
| `anti-overflow`      | Overflow/underflow issues | Range checks, safe arithmetic |

## Project Structure

```
├── contracts/           # Solidity contracts
│   ├── FHECounter.sol
│   ├── FHEComparisons.sol
│   ├── FHEArithmetic.sol
│   ├── FHEBitwise.sol
│   ├── EncryptedERC20.sol
│   ├── FHEAccessControl.sol
│   ├── BlindAuction.sol
│   ├── TrustlessMatching.sol
│   ├── AntiMissingAllow.sol
│   └── AntiOverflow.sol
├── test/                # Test files
├── deploy/              # Deployment scripts
├── tasks/               # Hardhat tasks
├── scripts/             # CLI and utilities
│   └── cli.ts           # Example Hub CLI
├── docs/                # Auto-generated documentation
└── hardhat.config.ts    # Hardhat configuration
```

## Key FHEVM Concepts

### Encrypted Types

- `ebool` - Encrypted boolean
- `euint8`, `euint16`, `euint32`, `euint64` - Encrypted unsigned integers
- `eaddress` - Encrypted address

### FHE Operations

```solidity
// Arithmetic
FHE.add(a, b)  // Addition
FHE.sub(a, b)  // Subtraction
FHE.mul(a, b)  // Multiplication

// Comparison (returns ebool)
FHE.eq(a, b)   // Equal
FHE.ne(a, b)   // Not equal
FHE.lt(a, b)   // Less than
FHE.gt(a, b)   // Greater than
FHE.le(a, b)   // Less or equal
FHE.ge(a, b)   // Greater or equal

// Bitwise
FHE.and(a, b)  // Bitwise AND
FHE.or(a, b)   // Bitwise OR
FHE.xor(a, b)  // Bitwise XOR
FHE.not(a)     // Bitwise NOT
FHE.shl(a, n)  // Shift left
FHE.shr(a, n)  // Shift right

// Conditional
FHE.select(condition, ifTrue, ifFalse)  // Ternary selection

// Access Control (CRITICAL!)
FHE.allowThis(value)     // Allow contract to use value
FHE.allow(value, user)   // Allow user to decrypt value
```

### Input Handling

```solidity
// Accept encrypted input from user
function processInput(externalEuint32 encryptedValue, bytes calldata inputProof) external {
  euint32 value = FHE.fromExternal(encryptedValue, inputProof);
  // Use value...
}
```

## Testing

```bash
# Run all tests (local mock)
npm run test

# Run tests on Sepolia
npm run test:sepolia
```

## Deployment

```bash
# Set up environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Deploy to Sepolia
npm run deploy:sepolia
```

## Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity API](https://docs.zama.ai/fhevm/references/api)
- [Zama Discord](https://discord.gg/zama)
- [Zama GitHub](https://github.com/zama-ai)

## License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Zama team**

# FHEVM Encryption Patterns

This guide explains the various ways to encrypt data in FHEVM smart contracts.

## Table of Contents

1. [Overview](#overview)
2. [Encryption Methods](#encryption-methods)
3. [Data Types](#data-types)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)
6. [Security Considerations](#security-considerations)

## Overview

FHEVM provides two primary methods for encrypting data:

1. **On-Chain Encryption** (`FHE.asEuintX`): Encrypt plaintext values directly in the smart contract
2. **Client-Side Encryption** (`FHE.fromExternal`): Encrypt values client-side and submit them with proofs

## Encryption Methods

### Method 1: On-Chain Encryption (asEuintX)

```solidity
function encryptOnChain(uint32 plainValue) external {
  // Encrypt plaintext value on-chain
  euint32 encrypted = FHE.asEuint32(plainValue);

  // Grant permissions
  FHE.allowThis(encrypted);
  FHE.allow(encrypted, msg.sender);
}
```

**When to use:**

- Initializing contract with known constants
- The plaintext value is already public
- Testing and development

**⚠️ Security Warning:** The plaintext value is visible in the transaction data! Anyone can see what you encrypted.

### Method 2: Client-Side Encryption (fromExternal) - RECOMMENDED

```solidity
function encryptFromClient(externalEuint32 encryptedValue, bytes calldata inputProof) external {
  // Verify and import client-encrypted value
  euint32 verified = FHE.fromExternal(encryptedValue, inputProof);

  // Grant permissions
  FHE.allowThis(verified);
  FHE.allow(verified, msg.sender);
}
```

**When to use:**

- **Always prefer this method for sensitive data**
- User balances, private information, votes
- Any data that should remain confidential

**Client-side (using fhevmjs):**

```javascript
import { createInstance } from "fhevmjs";

// Create FHEVM instance
const instance = await createInstance({ chainId, publicKey });

// Encrypt a value
const input = instance.createEncryptedInput(contractAddress, userAddress);
input.add32(42); // Encrypt the number 42
const encryptedInput = await input.encrypt();

// Call contract with encrypted value and proof
await contract.encryptFromClient(encryptedInput.handles[0], encryptedInput.inputProof);
```

## Data Types

FHEVM supports encrypted integers of various sizes:

| Type       | Plaintext Equivalent | Range                          | Use Case                         |
| ---------- | -------------------- | ------------------------------ | -------------------------------- |
| `euint8`   | `uint8`              | 0 - 255                        | Flags, small counts, percentages |
| `euint16`  | `uint16`             | 0 - 65,535                     | Medium counts, prices            |
| `euint32`  | `uint32`             | 0 - 4,294,967,295              | Large counts, timestamps         |
| `euint64`  | `uint64`             | 0 - 18,446,744,073,709,551,615 | Balances, large values           |
| `euint128` | `uint128`            | 0 - 2^128-1                    | Very large balances              |
| `euint256` | `uint256`            | 0 - 2^256-1                    | Maximum precision                |

**Example:**

```solidity
// Different sizes for different use cases
euint8 private _voteChoice;      // 0-255 is enough for vote options
euint32 private _userId;         // Up to 4 billion users
euint64 private _tokenBalance;   // Large token amounts
```

## Best Practices

### 1. Always Grant Permissions

After creating an encrypted value, you MUST grant permissions:

```solidity
euint32 value = FHE.asEuint32(42);

// REQUIRED: Let the contract use this value
FHE.allowThis(value);

// REQUIRED: Let the user decrypt this value
FHE.allow(value, msg.sender);
```

Without `FHE.allow()`, users cannot decrypt their own data!

### 2. Choose the Right Size

Use the smallest encrypted type that fits your data:

```solidity
// ❌ BAD: Wastes gas
euint256 private _percentage; // Only needs 0-100

// ✅ GOOD: Right-sized
euint8 private _percentage; // 0-255 is perfect
```

### 3. Prefer Client-Side Encryption

```solidity
// ❌ AVOID: Plaintext visible on-chain
function setBalance(uint64 amount) external {
  _balance = FHE.asEuint64(amount); // amount is public!
}

// ✅ PREFER: Encrypted client-side
function setBalance(externalEuint64 encrypted, bytes calldata proof) external {
  _balance = FHE.fromExternal(encrypted, proof); // secure!
}
```

## Common Patterns

### Pattern 1: User Balance

```solidity
mapping(address => euint64) private _balances;

function setBalance(externalEuint64 encrypted, bytes calldata proof) external {
    euint64 balance = FHE.fromExternal(encrypted, proof);
    _balances[msg.sender] = balance;

    FHE.allowThis(balance);
    FHE.allow(balance, msg.sender);
}
```

### Pattern 2: Batch Encryption

```solidity
function batchEncrypt(externalEuint32[] calldata values, bytes[] calldata proofs) external {
  require(values.length == proofs.length, "Length mismatch");

  for (uint256 i = 0; i < values.length; i++) {
    euint32 verified = FHE.fromExternal(values[i], proofs[i]);
    FHE.allowThis(verified);
    FHE.allow(verified, msg.sender);
    // Store or process verified
  }
}
```

### Pattern 3: Type Casting

```solidity
// Upcast: smaller type to larger type
euint8 small = FHE.asEuint8(10);
euint32 large = FHE.asEuint32(small); // Safe upcast
```

### Pattern 4: Initialization with Constants

```solidity
constructor() {
    // Initialize with public constant
    _totalSupply = FHE.asEuint64(1000000);
    FHE.allowThis(_totalSupply);
}
```

## Security Considerations

### 1. Transaction Data is Public

When using `FHE.asEuintX()`:

```solidity
// ⚠️ WARNING: Anyone can see that you encrypted "12345"
_secretValue = FHE.asEuint32(12345);
```

The number `12345` appears in plaintext in the transaction data on the blockchain!

### 2. Input Validation

Always validate inputs when accepting encrypted values:

```solidity
function storeValue(externalEuint32 encrypted, bytes calldata proof) external {
  // fromExternal automatically validates the proof
  euint32 verified = FHE.fromExternal(encrypted, proof);

  // Can add additional business logic validation
  // (but can't check the encrypted value directly)

  _values[msg.sender] = verified;
}
```

### 3. Permission Management

Remember:

- `FHE.allowThis(value)` - Let the contract operate on the value
- `FHE.allow(value, user)` - Let the user decrypt the value
- Permissions are **permanent** - once granted, cannot be revoked

### 4. Gas Costs

Encrypted operations are more expensive than plaintext:

- Encrypting values has gas overhead
- Larger encrypted types (euint256) cost more than smaller ones (euint8)
- Batch operations can save gas compared to individual calls

## Complete Example

See `contracts/FHEEncryption.sol` for a full implementation demonstrating:

- All encryption methods
- All data types
- Batch encryption
- User balance management
- Type casting
- Best practices

## Next Steps

- Learn about [Decryption Patterns](./decryption.md)
- See [Access Control](./access-control.md) for permission management
- Check [Arithmetic Operations](./arithmetic.md) for working with encrypted values

## Additional Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [fhevmjs Library](https://docs.zama.ai/fhevm/getting_started/connect)
- [FHEVM Solidity API](https://docs.zama.ai/fhevm/references/api)

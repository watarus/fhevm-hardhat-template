# FHEVM Decryption Patterns

This guide explains how to decrypt encrypted data in FHEVM and manage decryption access.

## Table of Contents

1. [Overview](#overview)
2. [Decryption Methods](#decryption-methods)
3. [Access Control](#access-control)
4. [Decryption Patterns](#decryption-patterns)
5. [Client-Side Decryption](#client-side-decryption)
6. [Best Practices](#best-practices)

## Overview

In FHEVM, there are two types of decryption:

1. **User Decryption (Private)**: Users decrypt their own data client-side using their private key
2. **Public Decryption**: Encrypted values can be revealed to everyone (less common)

**Important:** Smart contracts cannot see decrypted values directly. All decryption happens client-side!

## Decryption Methods

### User Decryption Flow

```
1. Smart Contract: Store encrypted value + FHE.allow(value, user)
                    ↓
2. User calls view function to get encrypted value
                    ↓
3. Client (fhevmjs): Decrypt using user's private key
                    ↓
4. User sees plaintext value
```

### Step 1: Grant Decryption Permission

```solidity
function storeData(externalEuint64 encrypted, bytes calldata proof) external {
  euint64 data = FHE.fromExternal(encrypted, proof);

  _userData[msg.sender] = data;

  // CRITICAL: Grant decryption permission
  FHE.allowThis(data);
  FHE.allow(data, msg.sender); // ← This allows user to decrypt!
}
```

### Step 2: Retrieve Encrypted Value

```solidity
function getMyData() external view returns (euint64) {
  return _userData[msg.sender];
}
```

### Step 3: Decrypt Client-Side (JavaScript)

```javascript
import { createInstance } from "fhevmjs";

// Create instance with contract's public key
const instance = await createInstance({ chainId, publicKey });

// Get encrypted value from contract
const encryptedValue = await contract.getMyData();

// Decrypt using user's private key
const decryptedValue = await instance.decrypt(contractAddress, encryptedValue);

console.log("Decrypted value:", decryptedValue);
```

## Access Control

### Pattern 1: Single User Access

Only the owner can decrypt:

```solidity
mapping(address => euint64) private _privateData;

function storeMyData(externalEuint64 encrypted, bytes calldata proof) external {
    euint64 data = FHE.fromExternal(encrypted, proof);
    _privateData[msg.sender] = data;

    FHE.allowThis(data);
    FHE.allow(data, msg.sender);  // Only msg.sender can decrypt
}

function getMyData() external view returns (euint64) {
    return _privateData[msg.sender];
}
```

### Pattern 2: Multi-User Access

Multiple users can decrypt the same value:

```solidity
euint32 private _sharedSecret;
mapping(address => bool) public hasAccess;

function grantAccess(address user) external onlyOwner {
    FHE.allow(_sharedSecret, user);  // Grant decryption to user
    hasAccess[user] = true;
}

function getSharedSecret() external view returns (euint32) {
    require(hasAccess[msg.sender], "No access");
    return _sharedSecret;
}
```

**Important:** `FHE.allow()` is permanent! You cannot revoke decryption access once granted.

### Pattern 3: Conditional Access

Grant access based on conditions:

```solidity
function computeIfAuthorized(externalEuint64 input, bytes calldata proof) external returns (euint64) {
  require(isAuthorized[msg.sender], "Not authorized");

  euint64 value = FHE.fromExternal(input, proof);
  euint64 result = FHE.add(_userData[msg.sender], value);

  // Grant access to the result
  FHE.allowThis(result);
  FHE.allow(result, msg.sender);

  return result;
}
```

## Decryption Patterns

### Pattern 1: Simple User Data

```solidity
// Contract
function storeBalance(externalEuint64 encrypted, bytes calldata proof) external {
  euint64 balance = FHE.fromExternal(encrypted, proof);
  _balances[msg.sender] = balance;

  FHE.allowThis(balance);
  FHE.allow(balance, msg.sender);
}

function getBalance() external view returns (euint64) {
  return _balances[msg.sender];
}
```

```javascript
// Client
const encryptedBalance = await contract.getBalance();
const balance = await instance.decrypt(contractAddress, encryptedBalance);
```

### Pattern 2: Computed Results

```solidity
function addToBalance(externalEuint64 amount, bytes calldata proof) external returns (euint64) {
  euint64 addAmount = FHE.fromExternal(amount, proof);
  euint64 newBalance = FHE.add(_balances[msg.sender], addAmount);

  _balances[msg.sender] = newBalance;

  // IMPORTANT: New computed value needs new permissions!
  FHE.allowThis(newBalance);
  FHE.allow(newBalance, msg.sender);

  return newBalance;
}
```

**Key Point:** Every new encrypted value from a computation needs fresh `FHE.allow()` calls!

### Pattern 3: Batch Decryption

Retrieve multiple encrypted values:

```solidity
struct EncryptedStats {
    euint32 count;
    euint64 total;
    euint32 average;
}

mapping(address => EncryptedStats) private _stats;

function getMyStats() external view returns (
    euint32 count,
    euint64 total,
    euint32 average
) {
    EncryptedStats memory stats = _stats[msg.sender];
    return (stats.count, stats.total, stats.average);
}
```

```javascript
// Client: Decrypt all values
const [count, total, average] = await contract.getMyStats();

const decryptedCount = await instance.decrypt(contractAddress, count);
const decryptedTotal = await instance.decrypt(contractAddress, total);
const decryptedAverage = await instance.decrypt(contractAddress, average);
```

### Pattern 4: Time-Delayed Decryption

Reveal encrypted values after a condition:

```solidity
mapping(address => euint8) private _votes;
bool public votingEnded;
address public admin;

function submitVote(externalEuint8 vote, bytes calldata proof) external {
    require(!votingEnded, "Voting ended");

    euint8 encryptedVote = FHE.fromExternal(vote, proof);
    _votes[msg.sender] = encryptedVote;

    // Only voter can decrypt during voting
    FHE.allowThis(encryptedVote);
    FHE.allow(encryptedVote, msg.sender);
}

function endVoting() external onlyAdmin {
    votingEnded = true;
}

function revealVotes(address voter) external view returns (euint8) {
    require(votingEnded, "Voting not ended");

    // After voting ends, anyone can request encrypted votes
    // (They still need permission to decrypt - grant in endVoting)
    return _votes[voter];
}
```

### Pattern 5: Selective Sharing

User controls who can decrypt their data:

```solidity
mapping(address => euint64) private _privateData;
mapping(address => mapping(address => bool)) private _sharedWith;

function shareWith(address recipient) external {
    require(FHE.isInitialized(_privateData[msg.sender]), "No data");

    // Grant decryption access
    FHE.allow(_privateData[msg.sender], recipient);
    _sharedWith[msg.sender][recipient] = true;
}

function getSharedData(address owner) external view returns (euint64) {
    require(_sharedWith[owner][msg.sender], "Not shared with you");
    return _privateData[owner];
}
```

## Client-Side Decryption

### Complete Example (JavaScript/TypeScript)

```javascript
import { createInstance } from "fhevmjs";
import { ethers } from "ethers";

// 1. Setup
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const signer = provider.getSigner();
const contract = new ethers.Contract(address, abi, signer);

// 2. Create FHEVM instance
const instance = await createInstance({
  chainId: await provider.getNetwork().then((n) => n.chainId),
  publicKey: await contract.getPublicKey(), // If contract provides it
});

// 3. Get encrypted value from contract
const encryptedBalance = await contract.getBalance();

// 4. Decrypt
const decryptedBalance = await instance.decrypt(contract.address, encryptedBalance);

console.log("Your balance:", decryptedBalance);
```

### Handling Multiple Values

```javascript
// Parallel decryption
const [count, total, avg] = await contract.getStats();

const [decCount, decTotal, decAvg] = await Promise.all([
  instance.decrypt(contractAddress, count),
  instance.decrypt(contractAddress, total),
  instance.decrypt(contractAddress, avg),
]);

console.log(`Count: ${decCount}, Total: ${decTotal}, Average: ${decAvg}`);
```

### Error Handling

```javascript
try {
  const encrypted = await contract.getMyData();
  const decrypted = await instance.decrypt(contractAddress, encrypted);
  console.log("Decrypted:", decrypted);
} catch (error) {
  if (error.message.includes("No access")) {
    console.error("You do not have permission to decrypt this value");
  } else {
    console.error("Decryption failed:", error);
  }
}
```

## Best Practices

### 1. Always Grant Permissions

```solidity
// ❌ BAD: User cannot decrypt!
euint32 result = FHE.add(a, b);
_result = result;
// Missing FHE.allow(result, msg.sender)!

// ✅ GOOD: User can decrypt
euint32 result = FHE.add(a, b);
_result = result;
FHE.allowThis(result);
FHE.allow(result, msg.sender);
```

### 2. Track Access in State

```solidity
// Keep track of who has access
mapping(address => bool) public hasAccess;

function grantAccess(address user) external {
    FHE.allow(_sharedData, user);
    hasAccess[user] = true;  // Track in state
}
```

### 3. Remember: No Revocation

Once `FHE.allow()` is called, that access is permanent!

```solidity
// ⚠️ This doesn't actually revoke decryption!
function revokeAccess(address user) external {
  hasAccess[user] = false; // Only removes state tracking
  // User can still decrypt if they cached the encrypted value!
}

// ✅ To truly revoke, create a new encrypted value
function rotateSecret() external onlyOwner {
  _sharedSecret = FHE.asEuint32(newValue);
  FHE.allowThis(_sharedSecret);
  // Only grant to authorized users
}
```

### 4. Check Initialization

```solidity
function getData() external view returns (euint64) {
  require(FHE.isInitialized(_data[msg.sender]), "No data stored");
  return _data[msg.sender];
}
```

### 5. Handle View Functions Correctly

```solidity
// ✅ GOOD: Return encrypted value
function getBalance() external view returns (euint64) {
  return _balances[msg.sender];
}

// ❌ IMPOSSIBLE: Cannot return decrypted value from contract
// Contracts can't decrypt! Only users can (client-side)
function getBalanceDecrypted() external view returns (uint64) {
  // This is NOT possible in FHEVM!
  return decrypt(_balances[msg.sender]); // ← Doesn't exist!
}
```

## Comparison: When to Use Each Pattern

| Pattern           | Use Case                   | Access Control             |
| ----------------- | -------------------------- | -------------------------- |
| Single User       | Private user data          | One user can decrypt       |
| Multi-User        | Shared secrets, group data | Multiple users can decrypt |
| Conditional       | Earned access, role-based  | Access based on conditions |
| Time-Delayed      | Sealed auctions, votes     | Access after time/event    |
| Selective Sharing | User-controlled sharing    | User grants access         |

## Complete Example

See `contracts/FHEDecryption.sol` for a full implementation demonstrating:

- All decryption patterns
- Access control strategies
- Batch decryption
- Conditional access
- Best practices

## Next Steps

- Learn about [Encryption Patterns](./encryption.md)
- See [Access Control Patterns](../contracts/FHEAccessControl.sol)
- Understand [FHEVM Operations](./operations.md)

## Additional Resources

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [fhevmjs Guide](https://docs.zama.ai/fhevm/getting_started/connect)
- [Re-encryption Guide](https://docs.zama.ai/fhevm/guides/reencryption)

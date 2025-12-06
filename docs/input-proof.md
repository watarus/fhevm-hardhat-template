# FHE Input Proofs - Complete Guide

## What are Input Proofs?

Input proofs are cryptographic proofs that validate encrypted inputs in FHEVM. They ensure that the encrypted value
submitted by a client corresponds to what the user claims, preventing malicious users from submitting invalid encrypted
data.

## Why Are Input Proofs Needed?

Without input proofs, a malicious user could:

- Submit arbitrary encrypted data that doesn't correspond to any valid plaintext
- Claim an encrypted value represents one number while it actually represents another
- Break the security and correctness of your smart contract

Input proofs provide cryptographic assurance that:

1. The encrypted value is properly formed
2. The user knows the plaintext value
3. The encrypted value matches what the user claims

## Basic Pattern

The fundamental pattern for using input proofs in FHEVM is:

```solidity
function processInput(externalEuint32 inputValue, bytes calldata inputProof) external {
  // Convert external encrypted input to on-chain encrypted value
  euint32 encrypted = FHE.fromExternal(inputValue, inputProof);

  // Use the encrypted value
  // ...

  // Grant permissions for decryption
  FHE.allowThis(encrypted); // Contract can access
  FHE.allow(encrypted, msg.sender); // Sender can decrypt
}
```

## Key Concepts

### External vs Internal Encrypted Types

- **External types** (`externalEuint32`, `externalEbool`, etc.): Handles to client-side encrypted data
- **Internal types** (`euint32`, `ebool`, etc.): On-chain encrypted values stored in contract state

The conversion happens via `FHE.fromExternal(externalValue, proof)`.

### Available Encrypted Types

| Type       | Description              | Range                           |
| ---------- | ------------------------ | ------------------------------- |
| `euint8`   | 8-bit unsigned integer   | 0 to 255                        |
| `euint16`  | 16-bit unsigned integer  | 0 to 65,535                     |
| `euint32`  | 32-bit unsigned integer  | 0 to 4,294,967,295              |
| `euint64`  | 64-bit unsigned integer  | 0 to 18,446,744,073,709,551,615 |
| `euint128` | 128-bit unsigned integer | 0 to 2^128 - 1                  |
| `euint256` | 256-bit unsigned integer | 0 to 2^256 - 1                  |
| `ebool`    | Boolean                  | true or false                   |
| `eaddress` | Ethereum address         | 160-bit address                 |

## Client-Side Workflow

1. **User encrypts data**: The user encrypts their plaintext value using FHEVM client libraries
2. **Generate proof**: The client library generates a cryptographic proof
3. **Submit transaction**: Both the encrypted value and proof are sent to the contract
4. **Contract validates**: `FHE.fromExternal()` validates the proof and converts to internal type

## Common Patterns

### Single Input

```solidity
function storeValue(externalEuint32 inputValue, bytes calldata inputProof) external {
  euint32 encrypted = FHE.fromExternal(inputValue, inputProof);
  storedValue = encrypted;
  FHE.allowThis(encrypted);
  FHE.allow(encrypted, msg.sender);
}
```

### Multiple Inputs

**IMPORTANT**: Each encrypted value needs its own proof!

```solidity
function addTwoValues(
  externalEuint32 inputA,
  bytes calldata proofA,
  externalEuint32 inputB,
  bytes calldata proofB
) external {
  euint32 a = FHE.fromExternal(inputA, proofA);
  euint32 b = FHE.fromExternal(inputB, proofB);

  euint32 sum = FHE.add(a, b);

  FHE.allowThis(sum);
  FHE.allow(sum, msg.sender);
}
```

### Batch Processing

```solidity
function batchProcess(externalEuint32[] calldata values, bytes[] calldata proofs) external {
  require(values.length == proofs.length, "Length mismatch");

  euint32 sum = FHE.fromExternal(values[0], proofs[0]);

  for (uint256 i = 1; i < values.length; i++) {
    euint32 value = FHE.fromExternal(values[i], proofs[i]);
    sum = FHE.add(sum, value);
  }

  result = sum;
  FHE.allowThis(result);
  FHE.allow(result, msg.sender);
}
```

### Range Validation

```solidity
function storeWithRangeCheck(
  externalEuint32 inputValue,
  bytes calldata inputProof,
  uint32 minValue,
  uint32 maxValue
) external {
  euint32 value = FHE.fromExternal(inputValue, inputProof);

  // Encrypted comparison
  ebool isAboveMin = FHE.ge(value, minValue);
  ebool isBelowMax = FHE.le(value, maxValue);
  ebool isValid = FHE.and(isAboveMin, isBelowMax);

  // Conditional update
  storedValue = FHE.select(isValid, value, storedValue);

  FHE.allowThis(storedValue);
  FHE.allow(storedValue, msg.sender);
}
```

### Mixing Encrypted and Plaintext

```solidity
function multiplyByConstant(externalEuint32 inputValue, bytes calldata inputProof, uint32 multiplier) external {
  euint32 encrypted = FHE.fromExternal(inputValue, inputProof);

  // Can directly use plaintext constant
  euint32 result = FHE.mul(encrypted, multiplier);

  FHE.allowThis(result);
  FHE.allow(result, msg.sender);
}
```

## Common Mistakes

### ❌ Missing Input Proof

```solidity
// WRONG: This won't compile
function store(externalEuint32 inputValue) external {
  euint32 encrypted = FHE.fromExternal(inputValue); // Missing proof!
}
```

### ❌ Reusing Proofs

```solidity
// WRONG: Each value needs its own proof
function storeTwo(externalEuint32 inputA, externalEuint32 inputB, bytes calldata sharedProof) external {
  euint32 a = FHE.fromExternal(inputA, sharedProof); // OK
  euint32 b = FHE.fromExternal(inputB, sharedProof); // FAILS!
}
```

**Why?** Each proof is cryptographically bound to its specific encrypted value. Proofs cannot be reused.

### ❌ Missing Permissions

```solidity
// WRONG: Caller can't decrypt the result
function store(externalEuint32 inputValue, bytes calldata inputProof) external {
  euint32 encrypted = FHE.fromExternal(inputValue, inputProof);
  storedValue = encrypted;
  FHE.allowThis(encrypted); // Contract can access
  // Missing: FHE.allow(encrypted, msg.sender);
}
```

### ❌ Wrong External Type

```solidity
// WRONG: Type mismatch
function store(externalEuint32 inputValue, bytes calldata inputProof) external {
  euint64 encrypted = FHE.fromExternal(inputValue, inputProof); // Type mismatch!
}
```

**Fix**: Use type conversion:

```solidity
function store(externalEuint32 inputValue, bytes calldata inputProof) external {
  euint32 encrypted32 = FHE.fromExternal(inputValue, inputProof);
  euint64 encrypted64 = FHE.asEuint64(encrypted32); // Convert
}
```

## Best Practices

1. **Always validate proofs**: Never skip the proof parameter in `FHE.fromExternal()`

2. **One proof per value**: Each encrypted input needs its own unique proof

3. **Grant appropriate permissions**: Use `FHE.allow()` for all addresses that need to decrypt

4. **Use the right type**: Choose the smallest encrypted type that fits your data range

5. **Validate inputs**: Use encrypted comparisons to validate ranges when needed

6. **Handle batch operations efficiently**: Process multiple inputs in a single transaction when possible

7. **Mix plaintext when possible**: Use plaintext constants instead of encrypting them

## Security Considerations

### Input Proof Validation

Input proofs provide cryptographic security guarantees:

- **Soundness**: Invalid proofs will be rejected
- **Completeness**: Valid proofs will be accepted
- **Zero-knowledge**: Proofs reveal nothing about the plaintext

### Gas Costs

Input proof validation has gas costs:

- Each `FHE.fromExternal()` call incurs validation overhead
- Batch processing can amortize costs across multiple values
- Use appropriate encrypted types to minimize computation costs

### Type Safety

Always match external and internal types:

- `externalEuint32` → `euint32`
- `externalEbool` → `ebool`
- `externalEaddress` → `eaddress`

Use explicit type conversion when needed:

```solidity
euint32 small = FHE.fromExternal(input8, proof8);
euint64 large = FHE.asEuint64(small);
```

## Example Use Cases

### Private Voting

```solidity
function vote(externalEbool choice, bytes calldata proof) external {
  ebool encryptedVote = FHE.fromExternal(choice, proof);
  votes[msg.sender] = encryptedVote;
  FHE.allowThis(encryptedVote);
}
```

### Confidential Transfers

```solidity
function transfer(address to, externalEuint64 amount, bytes calldata proof) external {
  euint64 encAmount = FHE.fromExternal(amount, proof);
  // ... transfer logic
}
```

### Private Auction Bids

```solidity
function bid(externalEuint64 bidAmount, bytes calldata proof) external {
  euint64 encBid = FHE.fromExternal(bidAmount, proof);
  bids[msg.sender] = encBid;
  FHE.allowThis(encBid);
}
```

### Encrypted Matching

```solidity
function submitPreference(externalEaddress preferredAddress, bytes calldata proof) external {
  eaddress encPreference = FHE.fromExternal(preferredAddress, proof);
  preferences[msg.sender] = encPreference;
  FHE.allowThis(encPreference);
}
```

## Reference

For complete working examples, see:

- `contracts/FHEInputProof.sol` - Comprehensive input proof examples
- `contracts/FHEArithmetic.sol` - Arithmetic operations with input proofs
- `contracts/EncryptedERC20.sol` - Real-world token implementation

## Learn More

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Solidity API](https://docs.zama.ai/fhevm/references/api)
- [Input Proof Generation (Client)](https://docs.zama.ai/fhevm/guides/inputs)

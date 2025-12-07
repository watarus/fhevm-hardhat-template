# AntiMissingAllow

Anti-pattern: Missing FHE.allow causing access issues

## Category: anti-pattern

## Concepts

- `FHE.allow`
- `common mistakes`
- `access errors`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Anti-Pattern: Missing FHE.allow
/// @author FHEVM Example Hub
/// @notice Demonstrates the common mistake of forgetting FHE.allow
/// @dev This contract shows INCORRECT patterns - DO NOT copy these!
/// @custom:warning This is an educational anti-pattern example
contract AntiMissingAllow is ZamaEthereumConfig {
  mapping(address => euint64) private _balances;
  euint64 private _totalEncrypted;

  // ============================================
  // ANTI-PATTERN 1: Forgetting FHE.allow entirely
  // ============================================

  /// @notice BAD: Stores data but forgets to allow user
  /// @dev The user will NOT be able to decrypt this value!
  function storeDataBad(externalEuint64 data, bytes calldata inputProof) external {
    euint64 encrypted = FHE.fromExternal(data, inputProof);
    _balances[msg.sender] = encrypted;

    // BUG: Missing FHE.allow(encrypted, msg.sender)
    // The user cannot decrypt their own balance!
    FHE.allowThis(encrypted); // Only contract can access
  }

  /// @notice GOOD: Correctly allows user to decrypt
  function storeDataGood(externalEuint64 data, bytes calldata inputProof) external {
    euint64 encrypted = FHE.fromExternal(data, inputProof);
    _balances[msg.sender] = encrypted;

    FHE.allowThis(encrypted);
    FHE.allow(encrypted, msg.sender); // CORRECT: User can decrypt
  }

  // ============================================
  // ANTI-PATTERN 2: Forgetting allowThis
  // ============================================

  /// @notice BAD: Allows user but forgets allowThis
  /// @dev Contract cannot perform operations on this value!
  function storeWithoutAllowThis(externalEuint64 data, bytes calldata inputProof) external {
    euint64 encrypted = FHE.fromExternal(data, inputProof);
    _balances[msg.sender] = encrypted;

    // BUG: Missing FHE.allowThis(encrypted)
    // Contract cannot use this value in computations!
    FHE.allow(encrypted, msg.sender);
  }

  /// @notice This will FAIL because allowThis wasn't called
  function tryToAddBad(address user, externalEuint64 addend, bytes calldata inputProof) external {
    euint64 toAdd = FHE.fromExternal(addend, inputProof);

    // This will fail if _balances[user] was stored without allowThis
    _balances[user] = FHE.add(_balances[user], toAdd);

    FHE.allowThis(_balances[user]);
    FHE.allow(_balances[user], user);
  }

  // ============================================
  // ANTI-PATTERN 3: Forgetting to allow after computation
  // ============================================

  /// @notice BAD: Computes new value but doesn't allow it
  /// @dev Result cannot be decrypted by anyone!
  function computeAndForget(
    externalEuint64 a,
    bytes calldata proofA,
    externalEuint64 b,
    bytes calldata proofB
  ) external returns (euint64) {
    euint64 encA = FHE.fromExternal(a, proofA);
    euint64 encB = FHE.fromExternal(b, proofB);

    euint64 result = FHE.add(encA, encB);

    // BUG: result is a NEW encrypted value!
    // It needs its own allow() calls
    // Without them, no one can decrypt the result

    return result; // Returned but useless - no one can decrypt!
  }

  /// @notice GOOD: Properly allows computed result
  function computeAndAllow(
    externalEuint64 a,
    bytes calldata proofA,
    externalEuint64 b,
    bytes calldata proofB
  ) external returns (euint64) {
    euint64 encA = FHE.fromExternal(a, proofA);
    euint64 encB = FHE.fromExternal(b, proofB);

    euint64 result = FHE.add(encA, encB);

    // CORRECT: Allow the new result
    FHE.allowThis(result);
    FHE.allow(result, msg.sender);

    return result;
  }

  // ============================================
  // ANTI-PATTERN 4: Assuming allow persists through operations
  // ============================================

  /// @notice BAD: Assumes old permissions carry to new value
  /// @dev Each new encrypted value needs fresh permissions!
  function updateValueBad(externalEuint64 addend, bytes calldata inputProof) external {
    euint64 toAdd = FHE.fromExternal(addend, inputProof);

    // Original _balances[msg.sender] had permissions
    euint64 newBalance = FHE.add(_balances[msg.sender], toAdd);
    _balances[msg.sender] = newBalance;

    // BUG: Assuming old permissions carry over
    // newBalance is a DIFFERENT encrypted value!
    // It needs NEW allow() calls!
  }

  /// @notice GOOD: Grants fresh permissions to new value
  function updateValueGood(externalEuint64 addend, bytes calldata inputProof) external {
    euint64 toAdd = FHE.fromExternal(addend, inputProof);

    euint64 newBalance = FHE.add(_balances[msg.sender], toAdd);
    _balances[msg.sender] = newBalance;

    // CORRECT: New value needs new permissions
    FHE.allowThis(newBalance);
    FHE.allow(newBalance, msg.sender);
  }

  // ============================================
  // HELPER: Get balance (to test anti-patterns)
  // ============================================

  function getMyBalance() external view returns (euint64) {
    return _balances[msg.sender];
  }
}
```

## NatSpec Documentation

### @title

- Anti-Pattern: Missing FHE.allow

### @author

- FHEVM Example Hub

### @notice

- Demonstrates the common mistake of forgetting FHE.allow
- BAD: Stores data but forgets to allow user
- GOOD: Correctly allows user to decrypt
- BAD: Allows user but forgets allowThis
- This will FAIL because allowThis wasn't called
- BAD: Computes new value but doesn't allow it
- GOOD: Properly allows computed result
- BAD: Assumes old permissions carry to new value
- GOOD: Grants fresh permissions to new value

### @dev

- This contract shows INCORRECT patterns - DO NOT copy these!
- The user will NOT be able to decrypt this value!
- Contract cannot perform operations on this value!
- Result cannot be decrypted by anyone!
- Each new encrypted value needs fresh permissions!

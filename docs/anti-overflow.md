# AntiOverflow

Anti-pattern: Overflow/underflow without proper checks

## Category: anti-pattern

## Concepts

- `overflow`
- `underflow`
- `range checks`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* solhint-disable use-natspec */

import { FHE, euint32, externalEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Anti-Pattern: Overflow/Underflow Without Checks
/// @author FHEVM Example Hub
/// @notice Demonstrates overflow/underflow issues in encrypted arithmetic
/// @dev Shows both INCORRECT and CORRECT patterns for range safety
/// @custom:warning This is an educational anti-pattern example
contract AntiOverflow is ZamaEthereumConfig {
  euint32 private _balance;

  constructor() {
    _balance = FHE.asEuint32(1000);
    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  // ============================================
  // ANTI-PATTERN 1: Subtraction without underflow check
  // ============================================

  /// @notice BAD: Subtracts without checking if result would underflow
  /// @dev If amount > balance, result wraps around (huge number)!
  function withdrawBad(externalEuint32 amount, bytes calldata inputProof) external {
    euint32 withdrawAmount = FHE.fromExternal(amount, inputProof);

    // BUG: No check if balance >= withdrawAmount
    // If withdrawing more than balance, result wraps to ~4 billion!
    _balance = FHE.sub(_balance, withdrawAmount);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  /// @notice GOOD: Checks balance before subtracting
  /// @dev Uses FHE.select to conditionally subtract
  function withdrawGood(externalEuint32 amount, bytes calldata inputProof) external {
    euint32 withdrawAmount = FHE.fromExternal(amount, inputProof);

    // CORRECT: Check if we have enough balance (encrypted)
    ebool hasEnough = FHE.ge(_balance, withdrawAmount);

    // If not enough, withdraw 0 instead
    euint32 safeAmount = FHE.select(hasEnough, withdrawAmount, FHE.asEuint32(0));

    _balance = FHE.sub(_balance, safeAmount);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  // ============================================
  // ANTI-PATTERN 2: Addition without overflow check
  // ============================================

  /// @notice BAD: Adds without checking for overflow
  /// @dev If result > max uint32, wraps around to small number
  function depositBad(externalEuint32 amount, bytes calldata inputProof) external {
    euint32 depositAmount = FHE.fromExternal(amount, inputProof);

    // BUG: No check for overflow
    // Adding to near-max value wraps around!
    _balance = FHE.add(_balance, depositAmount);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  /// @notice GOOD: Checks for overflow before adding
  /// @dev Ensures result won't exceed max value
  function depositGood(externalEuint32 amount, bytes calldata inputProof) external {
    euint32 depositAmount = FHE.fromExternal(amount, inputProof);

    // CORRECT: Check if addition would overflow
    // max_uint32 - balance >= amount means no overflow
    euint32 maxUint32 = FHE.asEuint32(type(uint32).max);
    euint32 headroom = FHE.sub(maxUint32, _balance);
    ebool wouldOverflow = FHE.gt(depositAmount, headroom);

    // If would overflow, deposit 0 instead
    euint32 safeAmount = FHE.select(wouldOverflow, FHE.asEuint32(0), depositAmount);

    _balance = FHE.add(_balance, safeAmount);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  // ============================================
  // ANTI-PATTERN 3: Multiplication overflow
  // ============================================

  /// @notice BAD: Multiplies without overflow check
  function multiplyBad(externalEuint32 factor, bytes calldata inputProof) external {
    euint32 multiplier = FHE.fromExternal(factor, inputProof);

    // BUG: Multiplication can easily overflow
    // 1000 * 5_000_000 = 5_000_000_000 > max_uint32!
    _balance = FHE.mul(_balance, multiplier);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  /// @notice GOOD: Uses bounds checking for multiplication
  /// @dev Since division is not supported, we limit the multiplier to safe range
  function multiplyGood(externalEuint32 factor, bytes calldata inputProof) external {
    euint32 multiplier = FHE.fromExternal(factor, inputProof);

    // APPROACH: Limit factor to a safe maximum
    // For uint32 balance starting at 1000, factor up to 4,000,000 is safe
    // max_uint32 / 1000 ≈ 4,294,967
    uint32 maxSafeFactor = 4000000;
    ebool factorTooLarge = FHE.gt(multiplier, FHE.asEuint32(maxSafeFactor));

    // If factor too large, use 1 instead (no change)
    euint32 one = FHE.asEuint32(1);
    euint32 safeFactor = FHE.select(factorTooLarge, one, multiplier);

    _balance = FHE.mul(_balance, safeFactor);

    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }

  // ============================================
  // PATTERN: Using wider types to avoid overflow
  // ============================================

  /// @notice Alternative: Use euint64 for intermediate calculations
  /// @dev Prevents overflow by using larger type
  // Note: This requires importing euint64
  // function safeMultiplyWithWiderType(...) { ... }

  // ============================================
  // HELPERS
  // ============================================

  function getBalance() external view returns (euint32) {
    return _balance;
  }

  function resetBalance(uint32 newBalance) external {
    _balance = FHE.asEuint32(newBalance);
    FHE.allowThis(_balance);
    FHE.allow(_balance, msg.sender);
  }
}
```

## NatSpec Documentation

### @title

- Anti-Pattern: Overflow/Underflow Without Checks

### @author

- FHEVM Example Hub

### @notice

- Demonstrates overflow/underflow issues in encrypted arithmetic
- BAD: Subtracts without checking if result would underflow
- GOOD: Checks balance before subtracting
- BAD: Adds without checking for overflow
- GOOD: Checks for overflow before adding
- BAD: Multiplies without overflow check
- GOOD: Uses bounds checking for multiplication
- Alternative: Use euint64 for intermediate calculations

### @dev

- Shows both INCORRECT and CORRECT patterns for range safety
- If amount > balance, result wraps around (huge number)!
- Uses FHE.select to conditionally subtract
- If result > max uint32, wraps around to small number
- Ensures result won't exceed max value
- Since division is not supported, we limit the multiplier to safe range
- Prevents overflow by using larger type

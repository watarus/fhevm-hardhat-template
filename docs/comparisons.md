# FHEComparisons

Encrypted comparison operations (eq, ne, lt, gt, le, ge)

## Category: basic

## Concepts

- `FHE.eq`
- `FHE.ne`
- `FHE.lt`
- `FHE.gt`
- `FHE.le`
- `FHE.ge`
- `ebool`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Comparison Operations Example
/// @author FHEVM Example Hub
/// @notice Demonstrates encrypted comparison operations using FHEVM
/// @dev Shows how to use eq, ne, lt, gt, le, ge operations on encrypted values
contract FHEComparisons is ZamaEthereumConfig {
  euint32 private _storedValue;
  ebool private _comparisonResult;
  euint32 private _computationResult;

  /// @notice Store an encrypted value for comparison
  /// @param inputValue The encrypted value to store
  /// @param inputProof The input proof
  function storeValue(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _storedValue = encryptedValue;
    FHE.allowThis(_storedValue);
    FHE.allow(_storedValue, msg.sender);
  }

  /// @notice Get the stored encrypted value
  /// @return The stored encrypted value
  function getStoredValue() external view returns (euint32) {
    return _storedValue;
  }

  /// @notice Get the last comparison result
  /// @return The encrypted boolean result
  function getComparisonResult() external view returns (ebool) {
    return _comparisonResult;
  }

  /// @notice Get the last computation result (for max/min)
  /// @return The encrypted computation result
  function getComputationResult() external view returns (euint32) {
    return _computationResult;
  }

  /// @notice Check if input equals stored value (encrypted equality)
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isEqual(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.eq(_storedValue, encryptedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Check if input is not equal to stored value
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isNotEqual(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.ne(_storedValue, encryptedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Check if input is less than stored value
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isLessThan(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.lt(encryptedValue, _storedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Check if input is greater than stored value
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isGreaterThan(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.gt(encryptedValue, _storedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Check if input is less than or equal to stored value
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isLessOrEqual(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.le(encryptedValue, _storedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Check if input is greater than or equal to stored value
  /// @param inputValue The encrypted value to compare
  /// @param inputProof The input proof
  function isGreaterOrEqual(externalEuint32 inputValue, bytes calldata inputProof) external {
    euint32 encryptedValue = FHE.fromExternal(inputValue, inputProof);
    _comparisonResult = FHE.ge(encryptedValue, _storedValue);
    FHE.allowThis(_comparisonResult);
    FHE.allow(_comparisonResult, msg.sender);
  }

  /// @notice Compare two encrypted inputs and return the maximum
  /// @param a First encrypted value
  /// @param proofA Proof for first value
  /// @param b Second encrypted value
  /// @param proofB Proof for second value
  function max(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
    euint32 encA = FHE.fromExternal(a, proofA);
    euint32 encB = FHE.fromExternal(b, proofB);

    // FHE.select(condition, ifTrue, ifFalse)
    ebool aIsGreater = FHE.gt(encA, encB);
    _computationResult = FHE.select(aIsGreater, encA, encB);

    FHE.allowThis(_computationResult);
    FHE.allow(_computationResult, msg.sender);
  }

  /// @notice Compare two encrypted inputs and return the minimum
  /// @param a First encrypted value
  /// @param proofA Proof for first value
  /// @param b Second encrypted value
  /// @param proofB Proof for second value
  function min(externalEuint32 a, bytes calldata proofA, externalEuint32 b, bytes calldata proofB) external {
    euint32 encA = FHE.fromExternal(a, proofA);
    euint32 encB = FHE.fromExternal(b, proofB);

    ebool aIsLess = FHE.lt(encA, encB);
    _computationResult = FHE.select(aIsLess, encA, encB);

    FHE.allowThis(_computationResult);
    FHE.allow(_computationResult, msg.sender);
  }
}
```

## NatSpec Documentation

### @title

- FHE Comparison Operations Example

### @author

- FHEVM Example Hub

### @notice

- Demonstrates encrypted comparison operations using FHEVM
- Store an encrypted value for comparison
- Get the stored encrypted value
- Get the last comparison result
- Get the last computation result (for max/min)
- Check if input equals stored value (encrypted equality)
- Check if input is not equal to stored value
- Check if input is less than stored value
- Check if input is greater than stored value
- Check if input is less than or equal to stored value
- Check if input is greater than or equal to stored value
- Compare two encrypted inputs and return the maximum
- Compare two encrypted inputs and return the minimum

### @dev

- Shows how to use eq, ne, lt, gt, le, ge operations on encrypted values

### @param

- inputValue The encrypted value to store
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- inputValue The encrypted value to compare
- inputProof The input proof
- a First encrypted value
- proofA Proof for first value
- b Second encrypted value
- proofB Proof for second value
- a First encrypted value
- proofA Proof for first value
- b Second encrypted value
- proofB Proof for second value

### @return

- The stored encrypted value
- The encrypted boolean result
- The encrypted computation result

# FHECounter

Basic encrypted counter with increment/decrement operations

## Category: basic

## Concepts

- `euint32`
- `FHE.add`
- `FHE.sub`
- `FHE.allow`
- `inputProof`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A simple FHE counter contract
/// @author fhevm-hardhat-template
/// @notice A very basic example contract showing how to work with encrypted data using FHEVM.
contract FHECounter is ZamaEthereumConfig {
  euint32 private _count;

  /// @notice Returns the current count
  /// @return The current encrypted count
  function getCount() external view returns (euint32) {
    return _count;
  }

  /// @notice Increments the counter by a specified encrypted value.
  /// @param inputEuint32 the encrypted input value
  /// @param inputProof the input proof
  /// @dev This example omits overflow/underflow checks for simplicity and readability.
  /// In a production contract, proper range checks should be implemented.
  function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    _count = FHE.add(_count, encryptedEuint32);

    FHE.allowThis(_count);
    FHE.allow(_count, msg.sender);
  }

  /// @notice Decrements the counter by a specified encrypted value.
  /// @param inputEuint32 the encrypted input value
  /// @param inputProof the input proof
  /// @dev This example omits overflow/underflow checks for simplicity and readability.
  /// In a production contract, proper range checks should be implemented.
  function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    _count = FHE.sub(_count, encryptedEuint32);

    FHE.allowThis(_count);
    FHE.allow(_count, msg.sender);
  }
}
```

## NatSpec Documentation

### @title

- A simple FHE counter contract

### @author

- fhevm-hardhat-template

### @notice

- A very basic example contract showing how to work with encrypted data using FHEVM.
- Returns the current count
- Increments the counter by a specified encrypted value.
- Decrements the counter by a specified encrypted value.

### @return

- The current encrypted count

### @param

- inputEuint32 the encrypted input value
- inputProof the input proof
- inputEuint32 the encrypted input value
- inputProof the input proof

### @dev

- This example omits overflow/underflow checks for simplicity and readability.
- This example omits overflow/underflow checks for simplicity and readability.

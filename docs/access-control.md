# FHEAccessControl

Access control patterns for encrypted data

## Category: access-control

## Concepts

- `FHE.allow`
- `FHE.allowThis`
- `re-encryption`
- `permissions`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Access Control Patterns
/// @author FHEVM Example Hub
/// @notice Demonstrates access control patterns for encrypted data
/// @dev Shows proper use of FHE.allow, FHE.allowThis, and permission management
/// @custom:concept Access control is crucial in FHE. Without proper allow() calls,
///                 users cannot decrypt their own data!
contract FHEAccessControl is ZamaEthereumConfig {
  /// @notice Private encrypted data per user
  mapping(address user => euint64 data) private _privateData;

  /// @notice Shared encrypted data with specific access
  euint64 private _sharedSecret;

  /// @notice Users with access to shared secret
  mapping(address user => bool hasAccess) public hasSharedAccess;

  /// @notice Owner of the contract
  address public owner;

  /// @notice Last computation result
  mapping(address user => euint64 result) private _lastComputationResult;

  /// @notice Event emitted when private data is stored
  /// @param user Address of the user storing data
  event PrivateDataStored(address indexed user);

  /// @notice Event emitted when shared access is granted
  /// @param user Address granted access
  event SharedAccessGranted(address indexed user);

  /// @notice Event emitted when shared access is revoked
  /// @param user Address whose access is revoked
  event SharedAccessRevoked(address indexed user);

  /// @notice Constructor initializes the contract with owner and shared secret
  constructor() {
    owner = msg.sender;
    // Initialize shared secret
    _sharedSecret = FHE.asEuint64(0);
    FHE.allowThis(_sharedSecret);
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
  }

  // ============================================
  // PATTERN 1: Private Data (User-Only Access)
  // ============================================

  /// @notice Store private encrypted data (only you can access)
  /// @param encryptedData Your encrypted data
  /// @param inputProof Input proof
  /// @dev CORRECT: FHE.allow grants access ONLY to msg.sender
  function storePrivateData(externalEuint64 encryptedData, bytes calldata inputProof) external {
    euint64 data = FHE.fromExternal(encryptedData, inputProof);

    _privateData[msg.sender] = data;

    // CRITICAL: Grant permissions
    // 1. allowThis - lets the contract operate on this value
    // 2. allow(user) - lets the user decrypt this value
    FHE.allowThis(data);
    FHE.allow(data, msg.sender);

    emit PrivateDataStored(msg.sender);
  }

  /// @notice Get your private encrypted data
  /// @return Your encrypted data (only you can decrypt)
  /// @dev Only the address that stored it can decrypt
  function getMyPrivateData() external view returns (euint64) {
    return _privateData[msg.sender];
  }

  // ============================================
  // PATTERN 2: Shared Data (Multi-User Access)
  // ============================================

  /// @notice Update the shared secret (owner only)
  /// @param encryptedSecret New encrypted secret
  /// @param inputProof Input proof
  /// @dev Owner must re-grant access to existing users after update
  function setSharedSecret(externalEuint64 encryptedSecret, bytes calldata inputProof) external onlyOwner {
    euint64 secret = FHE.fromExternal(encryptedSecret, inputProof);

    _sharedSecret = secret;

    // Allow contract and owner
    FHE.allowThis(_sharedSecret);
    FHE.allow(_sharedSecret, owner);
  }

  /// @notice Grant a user access to the shared secret
  /// @param user Address to grant access
  /// @dev PATTERN: Call FHE.allow for each user who should have access
  function grantSharedAccess(address user) external onlyOwner {
    require(!hasSharedAccess[user], "Already has access");

    // Grant decryption permission to the user
    FHE.allow(_sharedSecret, user);
    hasSharedAccess[user] = true;

    emit SharedAccessGranted(user);
  }

  /// @notice Revoke access (note: can't actually revoke FHE permission)
  /// @param user Address to revoke
  /// @dev WARNING: FHE.allow is permanent! Must rotate secret to truly revoke.
  function revokeSharedAccess(address user) external onlyOwner {
    require(hasSharedAccess[user], "No access to revoke");

    // NOTE: We can't actually revoke FHE permission once granted!
    // We only update our tracking. To truly revoke, you must:
    // 1. Create a new encrypted value
    // 2. Only grant access to authorized users
    hasSharedAccess[user] = false;

    emit SharedAccessRevoked(user);
  }

  /// @notice Get the shared secret (if you have access)
  /// @return The encrypted shared secret
  function getSharedSecret() external view returns (euint64) {
    require(hasSharedAccess[msg.sender] || msg.sender == owner, "No access");
    return _sharedSecret;
  }

  // ============================================
  // PATTERN 3: Derived Data Access
  // ============================================

  /// @notice Add to private data and return result
  /// @param addend Encrypted value to add
  /// @param inputProof Input proof
  /// @dev PATTERN: New encrypted values from operations need fresh allow() calls
  function addToMyData(externalEuint64 addend, bytes calldata inputProof) external {
    require(FHE.isInitialized(_privateData[msg.sender]), "No data stored");

    euint64 addValue = FHE.fromExternal(addend, inputProof);

    // Compute new value
    euint64 result = FHE.add(_privateData[msg.sender], addValue);

    // Store the new value
    _privateData[msg.sender] = result;
    _lastComputationResult[msg.sender] = result;

    // CRITICAL: The result is a NEW encrypted value!
    // Must grant permissions again
    FHE.allowThis(result);
    FHE.allow(result, msg.sender);
  }

  // ============================================
  // PATTERN 4: Transfer of Ownership
  // ============================================

  /// @notice Transfer your private data to another user
  /// @param recipient Address to transfer to
  /// @return data The transferred encrypted data
  /// @dev After transfer, both sender and recipient can decrypt (FHE limitation)
  function transferData(address recipient) external returns (euint64 data) {
    require(FHE.isInitialized(_privateData[msg.sender]), "No data to transfer");
    require(recipient != address(0), "Invalid address");

    data = _privateData[msg.sender];

    // Store for new owner first
    _privateData[recipient] = data;

    // CRITICAL: Grant permissions to recipient
    FHE.allowThis(data);
    FHE.allow(data, recipient);

    // Clear sender's data to uninitialized state
    // Using assembly to set to zero value (uninitialized)
    // solhint-disable-next-line no-inline-assembly
    assembly {
      let slot := _privateData.slot
      mstore(0x00, caller())
      mstore(0x20, slot)
      let hash := keccak256(0x00, 0x40)
      sstore(hash, 0)
    }
    // Note: msg.sender still has decryption access (can't revoke)
    // This is a limitation of FHE - consider using fresh values for true transfer
  }

  // ============================================
  // HELPER: Check if data exists
  // ============================================

  /// @notice Check if you have private data stored
  /// @return True if you have data stored
  function hasPrivateData() external view returns (bool) {
    return FHE.isInitialized(_privateData[msg.sender]);
  }

  /// @notice Get the last computation result
  /// @return The encrypted computation result
  function getLastComputationResult() external view returns (euint64) {
    return _lastComputationResult[msg.sender];
  }
}
```

## NatSpec Documentation

### @title

- FHE Access Control Patterns

### @author

- FHEVM Example Hub

### @notice

- Demonstrates access control patterns for encrypted data
- Private encrypted data per user
- Shared encrypted data with specific access
- Users with access to shared secret
- Owner of the contract
- Last computation result
- Event emitted when private data is stored
- Event emitted when shared access is granted
- Event emitted when shared access is revoked
- Constructor initializes the contract with owner and shared secret
- Store private encrypted data (only you can access)
- Get your private encrypted data
- Update the shared secret (owner only)
- Grant a user access to the shared secret
- Revoke access (note: can't actually revoke FHE permission)
- Get the shared secret (if you have access)
- Add to private data and return result
- Transfer your private data to another user
- Check if you have private data stored
- Get the last computation result

### @dev

- Shows proper use of FHE.allow, FHE.allowThis, and permission management
- CORRECT: FHE.allow grants access ONLY to msg.sender
- Only the address that stored it can decrypt
- Owner must re-grant access to existing users after update
- PATTERN: Call FHE.allow for each user who should have access
- WARNING: FHE.allow is permanent! Must rotate secret to truly revoke.
- PATTERN: New encrypted values from operations need fresh allow() calls
- After transfer, both sender and recipient can decrypt (FHE limitation)

### @param

- user Address of the user storing data
- user Address granted access
- user Address whose access is revoked
- encryptedData Your encrypted data
- inputProof Input proof
- encryptedSecret New encrypted secret
- inputProof Input proof
- user Address to grant access
- user Address to revoke
- addend Encrypted value to add
- inputProof Input proof
- recipient Address to transfer to

### @return

- Your encrypted data (only you can decrypt)
- The encrypted shared secret
- data The transferred encrypted data
- True if you have data stored
- The encrypted computation result

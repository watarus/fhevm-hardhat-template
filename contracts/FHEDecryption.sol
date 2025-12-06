// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint8,
    euint32,
    euint64,
    externalEuint8,
    externalEuint32,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Decryption Patterns
/// @author FHEVM Example Hub
/// @notice Demonstrates various decryption patterns in FHEVM
/// @dev Shows user decryption (private) and public decryption patterns
/// @custom:concept Decryption in FHEVM requires proper access control via FHE.allow()
/// @custom:concept Users decrypt values client-side using fhevmjs and their private key
/// @custom:concept Contract cannot see decrypted values directly - it only sees encrypted data
contract FHEDecryption is ZamaEthereumConfig {
    // ============================================
    // Storage
    // ============================================

    /// @notice User private data (only owner can decrypt)
    mapping(address user => euint64 data) private _privateData;

    /// @notice Shared computation result (multiple users can decrypt)
    euint32 private _computationResult;

    /// @notice Users with access to computation result
    mapping(address user => bool hasAccess) public hasResultAccess;

    /// @notice Counter for computation results
    uint256 private _resultCounter;

    /// @notice Event emitted when private data is stored
    /// @param user User who stored the data
    event PrivateDataStored(address indexed user);

    /// @notice Event emitted when computation is performed
    /// @param resultId ID of the computation result
    event ComputationPerformed(uint256 indexed resultId);

    /// @notice Event emitted when access is granted
    /// @param user User granted access
    /// @param resultId Result they can access
    event AccessGranted(address indexed user, uint256 indexed resultId);

    // ============================================
    // PATTERN 1: User Decryption (Single Value)
    // ============================================

    /// @notice Store your private encrypted value
    /// @param encryptedValue Your encrypted value
    /// @param inputProof Proof for the encrypted value
    /// @dev After calling this, you can decrypt the value client-side using fhevmjs
    /// @custom:concept Client-side decryption flow:
    ///   1. Call this function to store encrypted value with FHE.allow(value, msg.sender)
    ///   2. Client uses fhevmjs.createEIP712() to create decryption request
    ///   3. Client calls contract's view function to get encrypted value
    ///   4. Client uses fhevmjs.decrypt() to decrypt the value locally
    function storeMyData(externalEuint64 encryptedValue, bytes calldata inputProof) external {
        euint64 verified = FHE.fromExternal(encryptedValue, inputProof);

        _privateData[msg.sender] = verified;

        // CRITICAL: FHE.allow grants decryption rights to msg.sender
        // Without this, the user CANNOT decrypt their own data!
        FHE.allowThis(verified);
        FHE.allow(verified, msg.sender);

        emit PrivateDataStored(msg.sender);
    }

    /// @notice Get your private encrypted value
    /// @return Your encrypted value (decrypt client-side using fhevmjs)
    /// @dev To decrypt client-side:
    ///   const encrypted = await contract.getMyData();
    ///   const decrypted = await instance.decrypt(contractAddress, encrypted);
    /// @custom:concept The contract returns encrypted data; only YOUR client can decrypt it
    function getMyData() external view returns (euint64) {
        require(FHE.isInitialized(_privateData[msg.sender]), "No data stored");
        return _privateData[msg.sender];
    }

    // ============================================
    // PATTERN 2: User Decryption (Multiple Values)
    // ============================================

    /// @notice Perform computation and grant access to result
    /// @param a First encrypted operand
    /// @param proofA Proof for first operand
    /// @param b Second encrypted operand
    /// @param proofB Proof for second operand
    /// @return The encrypted result (you can decrypt this client-side)
    /// @dev Demonstrates granting decryption access for a newly computed value
    function computeAndAllow(
        externalEuint32 a,
        bytes calldata proofA,
        externalEuint32 b,
        bytes calldata proofB
    ) external returns (euint32) {
        euint32 valueA = FHE.fromExternal(a, proofA);
        euint32 valueB = FHE.fromExternal(b, proofB);

        // Perform encrypted computation
        euint32 result = FHE.add(valueA, valueB);

        // Store result
        _computationResult = result;
        ++_resultCounter;

        // PATTERN: Grant decryption access to the caller
        // This allows them to decrypt the result client-side
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        hasResultAccess[msg.sender] = true;

        emit ComputationPerformed(_resultCounter);

        return result;
    }

    /// @notice Grant another user access to decrypt the computation result
    /// @param user Address to grant access
    /// @dev PATTERN: Granting decryption access to additional users
    /// @custom:concept Once FHE.allow is called, that user can decrypt this value forever
    /// @custom:concept There is NO way to revoke decryption access - you must create a new encrypted value
    function grantResultAccess(address user) external {
        require(hasResultAccess[msg.sender], "You don't have access to grant");
        require(!hasResultAccess[user], "User already has access");

        // Grant decryption permission
        FHE.allow(_computationResult, user);
        hasResultAccess[user] = true;

        emit AccessGranted(user, _resultCounter);
    }

    /// @notice Get the computation result (if you have access)
    /// @return The encrypted result (decrypt client-side)
    /// @dev Multiple users can call this and each decrypt it with their own key
    function getComputationResult() external view returns (euint32) {
        require(hasResultAccess[msg.sender], "No access to result");
        return _computationResult;
    }

    // ============================================
    // PATTERN 3: Batch Decryption
    // ============================================

    /// @notice Store multiple encrypted values for a user
    /// @param values Array of encrypted values
    /// @param proofs Array of proofs
    /// @dev All values can be retrieved and decrypted in batch client-side
    function storeBatchData(externalEuint32[] calldata values, bytes[] calldata proofs) external {
        require(values.length == proofs.length, "Array length mismatch");
        require(values.length <= 10, "Too many values (max 10)");

        for (uint256 i = 0; i < values.length; ++i) {
            euint32 verified = FHE.fromExternal(values[i], proofs[i]);

            // In a real contract, you'd store these in a mapping or array
            // For this example, we'll just grant access
            FHE.allowThis(verified);
            FHE.allow(verified, msg.sender);
        }
    }

    // ============================================
    // PATTERN 4: Conditional Decryption Access
    // ============================================

    /// @notice Compute sum and grant access only if user has private data
    /// @param addend Encrypted value to add to your private data
    /// @param inputProof Proof for the addend
    /// @return The encrypted sum (can decrypt if you have private data)
    /// @dev Demonstrates conditional access based on state
    function computeIfAuthorized(externalEuint64 addend, bytes calldata inputProof) external returns (euint64) {
        // Check authorization
        require(FHE.isInitialized(_privateData[msg.sender]), "Must have private data first");

        euint64 addValue = FHE.fromExternal(addend, inputProof);

        // Compute with user's private data
        euint64 sum = FHE.add(_privateData[msg.sender], addValue);

        // Update user's data
        _privateData[msg.sender] = sum;

        // Grant decryption access to updated value
        FHE.allowThis(sum);
        FHE.allow(sum, msg.sender);

        return sum;
    }

    // ============================================
    // PATTERN 5: Public Result Pattern
    // ============================================

    /// @notice Public counter (everyone can know the count)
    uint256 public publicCounter;

    /// @notice Encrypted counter (only authorized users can decrypt)
    euint32 private _encryptedCounter;

    /// @notice Users authorized to decrypt the encrypted counter
    mapping(address user => bool authorized) public isAuthorized;

    /// @notice Increment both public and encrypted counters
    /// @dev Shows parallel tracking of public and encrypted state
    /// @custom:concept Sometimes you want a public value for transparency + encrypted for privacy
    function incrementCounters() external {
        // Increment public counter (everyone can see)
        ++publicCounter;

        // Increment encrypted counter (only authorized can decrypt)
        if (FHE.isInitialized(_encryptedCounter)) {
            _encryptedCounter = FHE.add(_encryptedCounter, 1);
        } else {
            _encryptedCounter = FHE.asEuint32(1);
        }

        FHE.allowThis(_encryptedCounter);

        // Auto-grant access to caller if not already authorized
        if (!isAuthorized[msg.sender]) {
            FHE.allow(_encryptedCounter, msg.sender);
            isAuthorized[msg.sender] = true;
        }
    }

    /// @notice Get encrypted counter (if authorized)
    /// @return The encrypted counter value
    /// @dev Compare with publicCounter to verify encrypted operations
    function getEncryptedCounter() external view returns (euint32) {
        require(isAuthorized[msg.sender], "Not authorized");
        return _encryptedCounter;
    }

    /// @notice Authorize a user to decrypt the encrypted counter
    /// @param user Address to authorize
    function authorizeUser(address user) external {
        require(isAuthorized[msg.sender], "You're not authorized");

        if (FHE.isInitialized(_encryptedCounter)) {
            FHE.allow(_encryptedCounter, user);
        }
        isAuthorized[user] = true;
    }

    // ============================================
    // PATTERN 6: Decryption in Practice
    // ============================================

    /// @notice Example: Private vote that can be decrypted after voting ends
    /// @param encryptedVote Your encrypted vote (0 or 1)
    /// @param inputProof Proof for the vote
    /// @dev This demonstrates how to handle values that should be decryptable later
    function submitVote(externalEuint8 encryptedVote, bytes calldata inputProof) external {
        euint8 vote = FHE.fromExternal(encryptedVote, inputProof);

        // In real implementation, you'd aggregate votes
        // For now, just demonstrate access pattern

        // Grant access to contract and voter
        FHE.allowThis(vote);
        FHE.allow(vote, msg.sender);

        // Later, when voting ends, you could grant access to an admin address
        // to decrypt and tally results
    }

    // ============================================
    // Helper Functions
    // ============================================

    /// @notice Check if you have private data stored
    /// @return True if you have data
    function hasPrivateData() external view returns (bool) {
        return FHE.isInitialized(_privateData[msg.sender]);
    }

    /// @notice Check if you have access to computation result
    /// @return True if you have access
    function canAccessResult() external view returns (bool) {
        return hasResultAccess[msg.sender];
    }

    /// @notice Get the current result counter
    /// @return Number of computations performed
    function getResultCounter() external view returns (uint256) {
        return _resultCounter;
    }
}

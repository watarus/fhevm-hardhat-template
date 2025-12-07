// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint8,
    euint16,
    euint32,
    euint64,
    ebool,
    eaddress,
    externalEuint8,
    externalEuint16,
    externalEuint32,
    externalEuint64,
    externalEbool,
    externalEaddress
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Input Proof Example
/// @author FHEVM Example Hub
/// @notice Comprehensive guide to using FHE.fromExternal() with input proofs
/// @dev Demonstrates all encrypted input types and common patterns
/// @custom:concept Input proofs are cryptographic proofs that validate encrypted inputs
/// @custom:concept They ensure that the encrypted value corresponds to what the user claims
/// @custom:concept Without input proofs, malicious users could submit invalid encrypted data
/// @custom:concept The external* types (externalEuint32, etc.) are handles to client-side encrypted data
/// @custom:concept FHE.fromExternal() converts external handles + proofs into on-chain encrypted values
contract FHEInputProof is ZamaEthereumConfig {
    // ============================================
    // STORAGE
    // ============================================

    /// @notice Stored encrypted values of different types
    euint8 private _storedUint8;
    euint16 private _storedUint16;
    euint32 private _storedUint32;
    euint64 private _storedUint64;
    ebool private _storedBool;
    eaddress private _storedAddress;

    /// @notice Batch processing result
    euint32 private _batchSum;

    // ============================================
    // EVENTS
    // ============================================

    /// @notice Emitted when an encrypted value is stored
    /// @param valueType The type of value stored (e.g., "euint32", "ebool")
    /// @param sender The address that stored the value
    event EncryptedValueStored(string valueType, address indexed sender);

    /// @notice Emitted when batch processing completes
    /// @param count Number of values processed
    event BatchProcessed(uint256 count);

    // ============================================
    // BASIC INPUT PROOF EXAMPLES
    // ============================================

    /// @notice Store an encrypted 8-bit unsigned integer
    /// @param inputValue External encrypted input handle from client
    /// @param inputProof Cryptographic proof validating the encrypted input
    /// @dev This is the basic pattern: FHE.fromExternal(externalValue, proof)
    /// @custom:concept euint8 stores encrypted values from 0 to 255
    /// @custom:concept The client encrypts the value and generates a proof
    /// @custom:concept The contract validates the proof and stores the encrypted value
    function storeUint8(externalEuint8 inputValue, bytes calldata inputProof) external {
        // Convert external encrypted input to on-chain encrypted value
        _storedUint8 = FHE.fromExternal(inputValue, inputProof);

        // Grant permissions for future access
        FHE.allowThis(_storedUint8); // Contract can access
        FHE.allow(_storedUint8, msg.sender); // Sender can decrypt

        emit EncryptedValueStored("euint8", msg.sender);
    }

    /// @notice Store an encrypted 16-bit unsigned integer
    /// @param inputValue External encrypted input handle
    /// @param inputProof Cryptographic proof
    /// @custom:concept euint16 stores encrypted values from 0 to 65535
    function storeUint16(externalEuint16 inputValue, bytes calldata inputProof) external {
        _storedUint16 = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedUint16);
        FHE.allow(_storedUint16, msg.sender);

        emit EncryptedValueStored("euint16", msg.sender);
    }

    /// @notice Store an encrypted 32-bit unsigned integer
    /// @param inputValue External encrypted input handle
    /// @param inputProof Cryptographic proof
    /// @custom:concept euint32 stores encrypted values from 0 to 4,294,967,295
    /// @custom:concept This is the most commonly used encrypted integer type
    function storeUint32(externalEuint32 inputValue, bytes calldata inputProof) external {
        _storedUint32 = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }

    /// @notice Store an encrypted 64-bit unsigned integer
    /// @param inputValue External encrypted input handle
    /// @param inputProof Cryptographic proof
    /// @custom:concept euint64 is ideal for large values like token balances
    /// @custom:concept Can store values from 0 to 18,446,744,073,709,551,615
    function storeUint64(externalEuint64 inputValue, bytes calldata inputProof) external {
        _storedUint64 = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedUint64);
        FHE.allow(_storedUint64, msg.sender);

        emit EncryptedValueStored("euint64", msg.sender);
    }

    /// @notice Store an encrypted boolean value
    /// @param inputValue External encrypted boolean handle
    /// @param inputProof Cryptographic proof
    /// @custom:concept ebool stores encrypted true/false values
    /// @custom:concept Useful for private voting, flags, and conditional logic
    function storeBool(externalEbool inputValue, bytes calldata inputProof) external {
        _storedBool = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedBool);
        FHE.allow(_storedBool, msg.sender);

        emit EncryptedValueStored("ebool", msg.sender);
    }

    /// @notice Store an encrypted address
    /// @param inputValue External encrypted address handle
    /// @param inputProof Cryptographic proof
    /// @custom:concept eaddress stores encrypted Ethereum addresses
    /// @custom:concept Useful for private beneficiaries, anonymous recipients, etc.
    function storeAddress(externalEaddress inputValue, bytes calldata inputProof) external {
        _storedAddress = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedAddress);
        FHE.allow(_storedAddress, msg.sender);

        emit EncryptedValueStored("eaddress", msg.sender);
    }

    // ============================================
    // GETTERS
    // ============================================

    /// @notice Get stored encrypted uint8
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredUint8() external view returns (euint8) {
        return _storedUint8;
    }

    /// @notice Get stored encrypted uint16
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredUint16() external view returns (euint16) {
        return _storedUint16;
    }

    /// @notice Get stored encrypted uint32
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredUint32() external view returns (euint32) {
        return _storedUint32;
    }

    /// @notice Get stored encrypted uint64
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredUint64() external view returns (euint64) {
        return _storedUint64;
    }

    /// @notice Get stored encrypted bool
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredBool() external view returns (ebool) {
        return _storedBool;
    }

    /// @notice Get stored encrypted address
    /// @return The encrypted value (only authorized addresses can decrypt)
    function getStoredAddress() external view returns (eaddress) {
        return _storedAddress;
    }

    // ============================================
    // ADVANCED PATTERNS
    // ============================================

    /// @notice Process multiple encrypted inputs in a single transaction
    /// @param values Array of external encrypted values
    /// @param proofs Array of corresponding input proofs
    /// @dev Demonstrates batch processing of encrypted inputs
    /// @custom:concept Batch processing reduces transaction overhead
    /// @custom:concept Each value needs its own proof - proofs cannot be reused
    function batchProcess(externalEuint32[] calldata values, bytes[] calldata proofs) external {
        require(values.length == proofs.length, "Length mismatch");
        require(values.length > 0, "Empty batch");

        // Initialize sum with first value
        euint32 sum = FHE.fromExternal(values[0], proofs[0]);

        // Process remaining values
        for (uint256 i = 1; i < values.length; ++i) {
            euint32 value = FHE.fromExternal(values[i], proofs[i]);
            sum = FHE.add(sum, value);
        }

        _batchSum = sum;
        FHE.allowThis(_batchSum);
        FHE.allow(_batchSum, msg.sender);

        emit BatchProcessed(values.length);
    }

    /// @notice Get the result of batch processing
    /// @return The encrypted sum of all batch-processed values
    function getBatchSum() external view returns (euint32) {
        return _batchSum;
    }

    /// @notice Demonstrates input validation and conditional storage
    /// @param inputValue External encrypted value
    /// @param inputProof Proof for the value
    /// @param minValue Minimum acceptable value (plaintext)
    /// @param maxValue Maximum acceptable value (plaintext)
    /// @dev Only stores the value if it's within the specified range
    /// @custom:concept Combines input proofs with range validation
    /// @custom:concept Uses FHE.select to conditionally update storage
    function storeWithRangeCheck(
        externalEuint32 inputValue,
        bytes calldata inputProof,
        uint32 minValue,
        uint32 maxValue
    ) external {
        require(minValue <= maxValue, "Invalid range");

        euint32 value = FHE.fromExternal(inputValue, inputProof);

        // Check if value is within range (encrypted comparison)
        ebool isAboveMin = FHE.ge(value, minValue);
        ebool isBelowMax = FHE.le(value, maxValue);
        ebool isValid = FHE.and(isAboveMin, isBelowMax);

        // Conditionally update: if valid, use new value; otherwise, keep old value
        _storedUint32 = FHE.select(isValid, value, _storedUint32);

        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }

    /// @notice Demonstrates combining two encrypted inputs with operation
    /// @param inputA First external encrypted value
    /// @param proofA Proof for first value
    /// @param inputB Second external encrypted value
    /// @param proofB Proof for second value
    /// @param operation Operation to perform: 0=add, 1=sub, 2=mul
    /// @dev Shows how to handle multiple inputs with different operations
    /// @custom:concept Each encrypted input needs its own proof
    /// @custom:concept Proofs are specific to the encrypted value and cannot be reused
    function combineInputs(
        externalEuint32 inputA,
        bytes calldata proofA,
        externalEuint32 inputB,
        bytes calldata proofB,
        uint8 operation
    ) external {
        require(operation <= 2, "Invalid operation");

        // Convert both external inputs to on-chain encrypted values
        euint32 a = FHE.fromExternal(inputA, proofA);
        euint32 b = FHE.fromExternal(inputB, proofB);

        euint32 result;
        if (operation == 0) {
            result = FHE.add(a, b);
        } else if (operation == 1) {
            result = FHE.sub(a, b);
        } else {
            result = FHE.mul(a, b);
        }

        _storedUint32 = result;
        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }

    // ============================================
    // COMMON MISTAKES AND HOW TO AVOID THEM
    // ============================================

    /// @notice ❌ WRONG: Missing input proof validation
    /// @dev This function is commented out because it shows an anti-pattern
    /// @custom:concept NEVER skip input proof validation
    /// @custom:concept Without proofs, users can submit invalid encrypted data
    /*
    function storeUint32WithoutProof(externalEuint32 inputValue) external {
        // ❌ WRONG: This will fail - FHE.fromExternal requires both arguments
        _storedUint32 = FHE.fromExternal(inputValue);
    }
    */

    /// @notice ❌ WRONG: Reusing the same proof for multiple values
    /// @dev This function demonstrates why proof reuse fails
    /// @custom:concept Each proof is cryptographically bound to its specific encrypted value
    /// @custom:concept Attempting to reuse a proof will cause the transaction to revert
    /*
    function storeMultipleWithSameProof(
        externalEuint32 inputA,
        externalEuint32 inputB,
        bytes calldata sharedProof
    ) external {
        // ❌ WRONG: Each value needs its own proof
        euint32 a = FHE.fromExternal(inputA, sharedProof); // This might work
        euint32 b = FHE.fromExternal(inputB, sharedProof); // ❌ This will fail!
    }
    */

    /// @notice ✅ CORRECT: Each value gets its own proof
    /// @param inputA First encrypted value
    /// @param proofA Proof for first value
    /// @param inputB Second encrypted value
    /// @param proofB Proof for second value
    /// @custom:concept Always pass separate proofs for separate encrypted values
    function storeMultipleCorrectly(
        externalEuint32 inputA,
        bytes calldata proofA,
        externalEuint32 inputB,
        bytes calldata proofB
    ) external {
        // ✅ CORRECT: Each value has its own proof
        euint32 a = FHE.fromExternal(inputA, proofA);
        euint32 b = FHE.fromExternal(inputB, proofB);

        _storedUint32 = FHE.add(a, b);
        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }

    /// @notice ❌ WRONG: Forgetting to call FHE.allow after storing
    /// @dev This shows the anti-pattern - caller won't be able to decrypt the result
    /// @custom:concept Always call FHE.allow to grant decryption permissions
    /*
    function storeWithoutAllow(externalEuint32 inputValue, bytes calldata inputProof) external {
        _storedUint32 = FHE.fromExternal(inputValue, inputProof);
        FHE.allowThis(_storedUint32); // Contract can access
        // ❌ MISSING: FHE.allow(_storedUint32, msg.sender);
        // Caller won't be able to decrypt this value!
    }
    */

    /// @notice ✅ CORRECT: Always grant appropriate permissions
    /// @param inputValue External encrypted value
    /// @param inputProof Input proof
    /// @custom:concept Grant permissions to all addresses that need to decrypt
    function storeWithProperPermissions(externalEuint32 inputValue, bytes calldata inputProof) external {
        _storedUint32 = FHE.fromExternal(inputValue, inputProof);

        // ✅ CORRECT: Grant permissions appropriately
        FHE.allowThis(_storedUint32); // Contract can use in computations
        FHE.allow(_storedUint32, msg.sender); // Sender can decrypt

        emit EncryptedValueStored("euint32", msg.sender);
    }

    // ============================================
    // TYPE CONVERSION EXAMPLES
    // ============================================

    /// @notice Convert between encrypted types
    /// @param input8 An encrypted 8-bit value
    /// @param proof8 Proof for the 8-bit value
    /// @dev Demonstrates type conversion from euint8 to euint32
    /// @custom:concept FHEVM supports casting between compatible encrypted types
    /// @custom:concept Smaller types can be safely cast to larger types
    function convertUint8ToUint32(externalEuint8 input8, bytes calldata proof8) external {
        euint8 small = FHE.fromExternal(input8, proof8);

        // Convert euint8 to euint32
        euint32 large = FHE.asEuint32(small);

        _storedUint32 = large;
        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }

    /// @notice Mix encrypted inputs with plaintext constants
    /// @param inputValue External encrypted value
    /// @param inputProof Input proof
    /// @param multiplier Plaintext constant to multiply by
    /// @dev Shows that FHE operations can mix encrypted and plaintext values
    /// @custom:concept FHEVM operations can combine encrypted values with plaintext constants
    /// @custom:concept This is more efficient than encrypting the constant
    function multiplyByConstant(externalEuint32 inputValue, bytes calldata inputProof, uint32 multiplier) external {
        euint32 encrypted = FHE.fromExternal(inputValue, inputProof);

        // ✅ CORRECT: Can directly multiply encrypted value by plaintext constant
        _storedUint32 = FHE.mul(encrypted, multiplier);

        FHE.allowThis(_storedUint32);
        FHE.allow(_storedUint32, msg.sender);

        emit EncryptedValueStored("euint32", msg.sender);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    FHE,
    euint8,
    euint16,
    euint32,
    euint64,
    externalEuint8,
    externalEuint16,
    externalEuint32,
    externalEuint64
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Encryption Patterns
/// @author FHEVM Example Hub
/// @notice Demonstrates various encryption patterns and data types in FHEVM
/// @dev Shows how to encrypt values using different methods: asEuintX, fromExternal
/// @custom:concept FHEVM supports encrypted integers of different sizes (8, 16, 32, 64, 128, 256 bits)
/// @custom:concept Values can be encrypted on-chain (asEuintX) or client-side and imported (fromExternal)
contract FHEEncryption is ZamaEthereumConfig {
    // ============================================
    // Storage: Encrypted values of different sizes
    // ============================================

    /// @notice Encrypted 8-bit unsigned integer (0-255)
    euint8 private _value8;

    /// @notice Encrypted 16-bit unsigned integer (0-65535)
    euint16 private _value16;

    /// @notice Encrypted 32-bit unsigned integer (0-4,294,967,295)
    euint32 private _value32;

    /// @notice Encrypted 64-bit unsigned integer (0-18,446,744,073,709,551,615)
    euint64 private _value64;

    /// @notice Array of encrypted values for batch operations
    euint32[] private _batchValues;

    /// @notice Mapping of user addresses to their encrypted balances
    mapping(address user => euint64 balance) private _userBalances;

    /// @notice Event emitted when a value is encrypted
    /// @param user Address that encrypted the value
    /// @param valueType Type of encrypted value (8, 16, 32, 64)
    event ValueEncrypted(address indexed user, uint8 valueType);

    /// @notice Event emitted when batch encryption is performed
    /// @param user Address that performed batch encryption
    /// @param count Number of values encrypted
    event BatchEncrypted(address indexed user, uint256 count);

    // ============================================
    // PATTERN 1: On-Chain Encryption (asEuintX)
    // ============================================

    /// @notice Encrypt a plaintext value on-chain to euint8
    /// @param plainValue Plaintext value to encrypt (0-255)
    /// @dev This encrypts the value ON THE BLOCKCHAIN - anyone can see the plaintext input!
    /// @dev Use this ONLY when the plaintext is public or when initializing with known constants
    /// @custom:security WARNING: The plaintext value is visible in the transaction!
    function encryptOnChain8(uint8 plainValue) external {
        // FHE.asEuint8 converts a plaintext uint8 to an encrypted euint8
        _value8 = FHE.asEuint8(plainValue);

        // Grant permissions so the contract and caller can use this value
        FHE.allowThis(_value8);
        FHE.allow(_value8, msg.sender);

        emit ValueEncrypted(msg.sender, 8);
    }

    /// @notice Encrypt a plaintext value on-chain to euint16
    /// @param plainValue Plaintext value to encrypt (0-65535)
    /// @dev See encryptOnChain8 for security warnings
    function encryptOnChain16(uint16 plainValue) external {
        _value16 = FHE.asEuint16(plainValue);
        FHE.allowThis(_value16);
        FHE.allow(_value16, msg.sender);

        emit ValueEncrypted(msg.sender, 16);
    }

    /// @notice Encrypt a plaintext value on-chain to euint32
    /// @param plainValue Plaintext value to encrypt (0-4,294,967,295)
    /// @dev See encryptOnChain8 for security warnings
    function encryptOnChain32(uint32 plainValue) external {
        _value32 = FHE.asEuint32(plainValue);
        FHE.allowThis(_value32);
        FHE.allow(_value32, msg.sender);

        emit ValueEncrypted(msg.sender, 32);
    }

    /// @notice Encrypt a plaintext value on-chain to euint64
    /// @param plainValue Plaintext value to encrypt (0-18,446,744,073,709,551,615)
    /// @dev See encryptOnChain8 for security warnings
    function encryptOnChain64(uint64 plainValue) external {
        _value64 = FHE.asEuint64(plainValue);
        FHE.allowThis(_value64);
        FHE.allow(_value64, msg.sender);

        emit ValueEncrypted(msg.sender, 64);
    }

    // ============================================
    // PATTERN 2: Client-Side Encryption (fromExternal)
    // ============================================

    /// @notice Import a client-encrypted value (euint8)
    /// @param encryptedValue Encrypted value from client (using fhevmjs)
    /// @param inputProof Zero-knowledge proof that the encryption is valid
    /// @dev PREFERRED METHOD: Value is encrypted client-side, so plaintext never touches blockchain
    /// @dev The client must use fhevmjs library to create the encrypted value and proof
    /// @custom:concept The inputProof ensures the encrypted value was created correctly
    function encryptFromClient8(externalEuint8 encryptedValue, bytes calldata inputProof) external {
        // FHE.fromExternal verifies the proof and imports the encrypted value
        euint8 verified = FHE.fromExternal(encryptedValue, inputProof);

        _value8 = verified;

        // Grant permissions
        FHE.allowThis(_value8);
        FHE.allow(_value8, msg.sender);

        emit ValueEncrypted(msg.sender, 8);
    }

    /// @notice Import a client-encrypted value (euint16)
    /// @param encryptedValue Encrypted value from client
    /// @param inputProof Zero-knowledge proof
    /// @dev See encryptFromClient8 for details
    function encryptFromClient16(externalEuint16 encryptedValue, bytes calldata inputProof) external {
        euint16 verified = FHE.fromExternal(encryptedValue, inputProof);
        _value16 = verified;
        FHE.allowThis(_value16);
        FHE.allow(_value16, msg.sender);

        emit ValueEncrypted(msg.sender, 16);
    }

    /// @notice Import a client-encrypted value (euint32)
    /// @param encryptedValue Encrypted value from client
    /// @param inputProof Zero-knowledge proof
    /// @dev See encryptFromClient8 for details
    function encryptFromClient32(externalEuint32 encryptedValue, bytes calldata inputProof) external {
        euint32 verified = FHE.fromExternal(encryptedValue, inputProof);
        _value32 = verified;
        FHE.allowThis(_value32);
        FHE.allow(_value32, msg.sender);

        emit ValueEncrypted(msg.sender, 32);
    }

    /// @notice Import a client-encrypted value (euint64)
    /// @param encryptedValue Encrypted value from client
    /// @param inputProof Zero-knowledge proof
    /// @dev See encryptFromClient8 for details
    function encryptFromClient64(externalEuint64 encryptedValue, bytes calldata inputProof) external {
        euint64 verified = FHE.fromExternal(encryptedValue, inputProof);
        _value64 = verified;
        FHE.allowThis(_value64);
        FHE.allow(_value64, msg.sender);

        emit ValueEncrypted(msg.sender, 64);
    }

    // ============================================
    // PATTERN 3: Batch Encryption
    // ============================================

    /// @notice Encrypt multiple values at once (on-chain)
    /// @param plainValues Array of plaintext values to encrypt
    /// @dev Useful for initializing multiple values in one transaction
    /// @custom:security WARNING: All plaintext values are visible in the transaction!
    function batchEncryptOnChain(uint32[] calldata plainValues) external {
        // Clear existing array
        delete _batchValues;

        // Encrypt each value and store
        for (uint256 i = 0; i < plainValues.length; ++i) {
            euint32 encrypted = FHE.asEuint32(plainValues[i]);
            FHE.allowThis(encrypted);
            FHE.allow(encrypted, msg.sender);
            _batchValues.push(encrypted);
        }

        emit BatchEncrypted(msg.sender, plainValues.length);
    }

    /// @notice Encrypt multiple values from client (more secure)
    /// @param encryptedValues Array of client-encrypted values
    /// @param inputProofs Array of proofs (one per encrypted value)
    /// @dev PREFERRED: Values are encrypted client-side
    /// @dev All arrays must have the same length
    function batchEncryptFromClient(externalEuint32[] calldata encryptedValues, bytes[] calldata inputProofs) external {
        require(encryptedValues.length == inputProofs.length, "Array length mismatch");

        // Clear existing array
        delete _batchValues;

        // Verify and store each encrypted value
        for (uint256 i = 0; i < encryptedValues.length; ++i) {
            euint32 verified = FHE.fromExternal(encryptedValues[i], inputProofs[i]);
            FHE.allowThis(verified);
            FHE.allow(verified, msg.sender);
            _batchValues.push(verified);
        }

        emit BatchEncrypted(msg.sender, encryptedValues.length);
    }

    // ============================================
    // PATTERN 4: User Balance Management
    // ============================================

    /// @notice Set your encrypted balance (from client)
    /// @param encryptedBalance Your encrypted balance
    /// @param inputProof Proof for the encrypted balance
    /// @dev Demonstrates typical pattern for user-owned encrypted data
    function setMyBalance(externalEuint64 encryptedBalance, bytes calldata inputProof) external {
        euint64 verified = FHE.fromExternal(encryptedBalance, inputProof);

        _userBalances[msg.sender] = verified;

        // Grant permissions: contract and user
        FHE.allowThis(verified);
        FHE.allow(verified, msg.sender);
    }

    /// @notice Initialize your balance with a plaintext value
    /// @param plainBalance Plaintext balance to encrypt
    /// @dev Less secure - use setMyBalance instead when possible
    /// @custom:security WARNING: Plaintext value is visible!
    function initializeBalance(uint64 plainBalance) external {
        euint64 encrypted = FHE.asEuint64(plainBalance);

        _userBalances[msg.sender] = encrypted;

        FHE.allowThis(encrypted);
        FHE.allow(encrypted, msg.sender);
    }

    // ============================================
    // PATTERN 5: Type Casting Between Sizes
    // ============================================

    /// @notice Cast euint8 to euint32
    /// @param value8 Client-encrypted 8-bit value
    /// @param inputProof Proof for the value
    /// @dev Demonstrates upcasting (smaller type to larger type)
    /// @custom:concept FHE supports casting between different encrypted integer sizes
    function castUp8to32(externalEuint8 value8, bytes calldata inputProof) external {
        euint8 verified8 = FHE.fromExternal(value8, inputProof);

        // Cast euint8 to euint32
        euint32 casted32 = FHE.asEuint32(verified8);

        _value32 = casted32;

        FHE.allowThis(_value32);
        FHE.allow(_value32, msg.sender);

        emit ValueEncrypted(msg.sender, 32);
    }

    // ============================================
    // View Functions
    // ============================================

    /// @notice Get the stored encrypted 8-bit value
    /// @return The encrypted euint8 value
    /// @dev Only the user who encrypted it can decrypt
    function getValue8() external view returns (euint8) {
        return _value8;
    }

    /// @notice Get the stored encrypted 16-bit value
    /// @return The encrypted euint16 value
    function getValue16() external view returns (euint16) {
        return _value16;
    }

    /// @notice Get the stored encrypted 32-bit value
    /// @return The encrypted euint32 value
    function getValue32() external view returns (euint32) {
        return _value32;
    }

    /// @notice Get the stored encrypted 64-bit value
    /// @return The encrypted euint64 value
    function getValue64() external view returns (euint64) {
        return _value64;
    }

    /// @notice Get all batch encrypted values
    /// @return Array of encrypted values
    function getBatchValues() external view returns (euint32[] memory) {
        return _batchValues;
    }

    /// @notice Get a specific batch value by index
    /// @param index Index in the batch array
    /// @return The encrypted value at that index
    function getBatchValue(uint256 index) external view returns (euint32) {
        require(index < _batchValues.length, "Index out of bounds");
        return _batchValues[index];
    }

    /// @notice Get your encrypted balance
    /// @return Your encrypted balance (euint64)
    function getMyBalance() external view returns (euint64) {
        return _userBalances[msg.sender];
    }

    /// @notice Check if you have a balance set
    /// @return True if balance is initialized
    function hasBalance() external view returns (bool) {
        return FHE.isInitialized(_userBalances[msg.sender]);
    }
}

# EncryptedERC20

ERC20 token with encrypted balances

## Category: encryption

## Concepts

- `euint64`
- `encrypted balances`
- `confidential transfers`

## Source Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted ERC20 - Confidential Token
/// @author FHEVM Example Hub
/// @notice An ERC20-like token with encrypted balances
/// @dev Demonstrates encrypted state management and confidential transfers
/// @custom:concept Balances are encrypted. Only the owner can see their balance.
///                 Transfers are confidential - amounts are never revealed.
contract EncryptedERC20 is ZamaEthereumConfig {
  /// @notice Token name
  string public name;

  /// @notice Token symbol
  string public symbol;

  /// @notice Token decimals
  uint8 public constant DECIMALS = 18;

  /// @notice Total supply (plaintext - public)
  uint256 public totalSupply;

  /// @notice Encrypted balances
  mapping(address account => euint64 balance) private _balances;

  /// @notice Encrypted allowances
  mapping(address owner => mapping(address spender => euint64 amount)) private _allowances;

  /// @notice Event emitted when tokens are transferred
  /// @param from Address tokens are transferred from
  /// @param to Address tokens are transferred to
  event Transfer(address indexed from, address indexed to);

  /// @notice Event emitted when allowance is approved
  /// @param owner Address of the token owner
  /// @param spender Address approved to spend tokens
  event Approval(address indexed owner, address indexed spender);

  /// @notice Event emitted when tokens are minted
  /// @param to Address receiving the minted tokens
  event Mint(address indexed to);

  /// @notice Create the token with initial supply to deployer
  /// @param _name Token name
  /// @param _symbol Token symbol
  /// @param initialSupply Initial supply (plaintext, converted to encrypted)
  constructor(string memory _name, string memory _symbol, uint64 initialSupply) {
    name = _name;
    symbol = _symbol;
    totalSupply = initialSupply;

    // Mint initial supply to deployer as encrypted balance
    _balances[msg.sender] = FHE.asEuint64(initialSupply);
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);

    emit Mint(msg.sender);
  }

  /// @notice Get your encrypted balance
  /// @return Your encrypted balance (only you can decrypt)
  function balanceOf() external view returns (euint64) {
    return _balances[msg.sender];
  }

  /// @notice Get encrypted balance of any address (requires permission)
  /// @param account The address to query
  /// @return The encrypted balance
  /// @dev Caller must have been granted permission via FHE.allow
  function balanceOfAddress(address account) external view returns (euint64) {
    return _balances[account];
  }

  /// @notice Transfer encrypted amount to recipient
  /// @param to Recipient address
  /// @param encryptedAmount Encrypted amount to transfer
  /// @param inputProof Input proof
  /// @dev Amount is encrypted - no one knows how much was transferred
  function transfer(address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
    require(to != address(0), "Transfer to zero address");
    require(to != msg.sender, "Cannot transfer to self");

    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

    // Check if sender has enough balance (encrypted comparison)
    ebool hasEnough = FHE.ge(_balances[msg.sender], amount);

    // Conditionally update balances
    // If not enough balance, transfer 0 instead
    euint64 transferAmount = FHE.select(hasEnough, amount, FHE.asEuint64(0));

    // Subtract from sender
    _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);

    // Initialize recipient balance if needed
    if (FHE.isInitialized(_balances[to])) {
      _balances[to] = FHE.add(_balances[to], transferAmount);
    } else {
      _balances[to] = transferAmount;
    }

    // Set permissions
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
    FHE.allowThis(_balances[to]);
    FHE.allow(_balances[to], to);

    emit Transfer(msg.sender, to);
  }

  /// @notice Approve spender to transfer encrypted amount
  /// @param spender Address allowed to spend
  /// @param encryptedAmount Encrypted allowance amount
  /// @param inputProof Input proof
  function approve(address spender, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
    require(spender != address(0), "Approve to zero address");

    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
    _allowances[msg.sender][spender] = amount;

    FHE.allowThis(amount);
    FHE.allow(amount, msg.sender);
    FHE.allow(amount, spender);

    emit Approval(msg.sender, spender);
  }

  /// @notice Get encrypted allowance
  /// @param owner Token owner
  /// @param spender Allowed spender
  /// @return Encrypted allowance amount
  function allowance(address owner, address spender) external view returns (euint64) {
    return _allowances[owner][spender];
  }

  /// @notice Transfer from owner to recipient using allowance
  /// @param from Token owner
  /// @param to Recipient
  /// @param encryptedAmount Encrypted amount
  /// @param inputProof Input proof
  function transferFrom(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
    require(to != address(0), "Transfer to zero address");

    euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

    // Check allowance
    ebool hasAllowance = FHE.ge(_allowances[from][msg.sender], amount);

    // Check balance
    ebool hasBalance = FHE.ge(_balances[from], amount);

    // Both conditions must be true
    ebool canTransfer = FHE.and(hasAllowance, hasBalance);

    // Conditionally transfer
    euint64 transferAmount = FHE.select(canTransfer, amount, FHE.asEuint64(0));

    // Update balances
    _balances[from] = FHE.sub(_balances[from], transferAmount);

    if (FHE.isInitialized(_balances[to])) {
      _balances[to] = FHE.add(_balances[to], transferAmount);
    } else {
      _balances[to] = transferAmount;
    }

    // Update allowance
    _allowances[from][msg.sender] = FHE.sub(_allowances[from][msg.sender], transferAmount);

    // Set permissions
    FHE.allowThis(_balances[from]);
    FHE.allow(_balances[from], from);
    FHE.allowThis(_balances[to]);
    FHE.allow(_balances[to], to);
    FHE.allowThis(_allowances[from][msg.sender]);
    FHE.allow(_allowances[from][msg.sender], from);
    FHE.allow(_allowances[from][msg.sender], msg.sender);

    emit Transfer(from, to);
  }
}
```

## NatSpec Documentation

### @title

- Encrypted ERC20 - Confidential Token

### @author

- FHEVM Example Hub

### @notice

- An ERC20-like token with encrypted balances
- Token name
- Token symbol
- Token decimals
- Total supply (plaintext - public)
- Encrypted balances
- Encrypted allowances
- Event emitted when tokens are transferred
- Event emitted when allowance is approved
- Event emitted when tokens are minted
- Create the token with initial supply to deployer
- Get your encrypted balance
- Get encrypted balance of any address (requires permission)
- Transfer encrypted amount to recipient
- Approve spender to transfer encrypted amount
- Get encrypted allowance
- Transfer from owner to recipient using allowance

### @dev

- Demonstrates encrypted state management and confidential transfers
- Caller must have been granted permission via FHE.allow
- Amount is encrypted - no one knows how much was transferred

### @param

- from Address tokens are transferred from
- to Address tokens are transferred to
- owner Address of the token owner
- spender Address approved to spend tokens
- to Address receiving the minted tokens
- \_name Token name
- \_symbol Token symbol
- initialSupply Initial supply (plaintext, converted to encrypted)
- account The address to query
- to Recipient address
- encryptedAmount Encrypted amount to transfer
- inputProof Input proof
- spender Address allowed to spend
- encryptedAmount Encrypted allowance amount
- inputProof Input proof
- owner Token owner
- spender Allowed spender
- from Token owner
- to Recipient
- encryptedAmount Encrypted amount
- inputProof Input proof

### @return

- Your encrypted balance (only you can decrypt)
- The encrypted balance
- Encrypted allowance amount

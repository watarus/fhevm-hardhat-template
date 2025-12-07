# FHEVM Examples Documentation

This documentation is auto-generated from NatSpec comments.

## Examples

- [counter](./counter.md) - Basic encrypted counter with increment/decrement operations
- [input-proof](./input-proof.md) - Complete guide to FHE.fromExternal() and input proofs for all encrypted types
- [comparisons](./comparisons.md) - Encrypted comparison operations (eq, ne, lt, gt, le, ge)
- [arithmetic](./arithmetic.md) - Encrypted arithmetic operations (add, sub, mul)
- [bitwise](./bitwise.md) - Encrypted bitwise operations (and, or, xor, shl, shr)
- [encryption](./encryption.md) - Encryption patterns: asEuintX, fromExternal, batch operations
- [decryption](./decryption.md) - Decryption patterns: user decryption, multi-user access, conditional access
- [encrypted-erc20](./encrypted-erc20.md) - ERC20 token with encrypted balances
- [access-control](./access-control.md) - Access control patterns for encrypted data
- [blind-auction](./blind-auction.md) - Sealed-bid auction where bids remain encrypted until reveal
- [trustless-matching](./trustless-matching.md) - Private matching (dating app style) - votes revealed only on mutual match
- [anti-missing-allow](./anti-missing-allow.md) - Anti-pattern: Missing FHE.allow causing access issues
- [anti-overflow](./anti-overflow.md) - Anti-pattern: Overflow/underflow without proper checks

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/// @title RPT reward token contract
/// @notice RPTtoken issued for creating votes and participating in them
contract RPTToken is ERC20 {
    constructor(address _recipient) ERC20('Represent', 'RPT') {
        _mint(_recipient, 500 * 1000000 * 10**18);
    }
}

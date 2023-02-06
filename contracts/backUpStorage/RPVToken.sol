// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/// @title RPVtoken contract
/// @notice RPVtokens is used to buy the VotingTokens
contract RPVToken is ERC20 {
    constructor(address _saleContract) ERC20('Represent', 'RPV') {
        _mint(_saleContract, 8000000000 * 10**18);
    }
}

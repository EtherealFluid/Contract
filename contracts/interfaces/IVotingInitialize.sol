// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';

interface IVotingInitialize {
    struct Params {
        bytes description;
        uint256 start;
        uint256 qtyVoters;
        uint256 minPercentageVoters;
        uint256 minQtyVoters;
        uint256 buyVotingTokenRate;
        uint256 duration;
    }

    function initialize(
        Params memory _params,
        address _rptSaleContract,
        IERC20Upgradeable _rptToken
    ) external;
}

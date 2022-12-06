// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './Voting.sol';

contract VotingAllowList is Voting {
    mapping(address => bool) public allowList;
    uint256 public allowListCount;

    event AllowListedAddressAdded(address indexed addr);
    event AllowListedAddressRemoved(address indexed addr);

    modifier onlyAllowListed() {
        require(allowList[_msgSender()], 'Address is not in AllowList');
        _;
    }

    function initialize(
        Params memory _params,
        address _rpvSaleContract,
        IERC20Upgradeable _rpvToken
    ) public override initializer {
        factory = IVotingFactory(_msgSender());
        Voting.initialize(_params, _rpvSaleContract, _rpvToken);
    }

    function addAddressToAllowList(address addr) external onlyOperator {
        require(allowList[addr] == false, 'Address has already been added');
        allowList[addr] = true;
        allowListCount++;
        emit AllowListedAddressAdded(addr);
    }

    function addArrayAddressesToAllowList(address[] memory _addresses) external onlyOperator {
        require(_addresses.length > 0, 'Array is empty');
        for (uint256 i = 0; i < _addresses.length; i++) {
            if (allowList[_addresses[i]] == false) {
                allowList[_addresses[i]] = true;
                allowListCount++;
                emit AllowListedAddressAdded(_addresses[i]);
            }
        }
    }

    function removeAddressFromAllowList(address addr) external onlyOperator {
        require(allowList[addr] == true, 'Address does not exist');
        allowList[addr] = false;
        allowListCount--;
        emit AllowListedAddressRemoved(addr);
    }

    function voteFor() public override onlyAllowListed {
        super.voteFor();
    }

    function voteAgainst() public override onlyAllowListed {
        super.voteAgainst();
    }
}

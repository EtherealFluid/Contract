// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './Voting.sol';

/// @title VotingAllowList contract
/// @notice Contract for tracking voters allowance to vote
contract VotingAllowList is Voting {

    /// @return allowlist Returns list of allowed voters
    mapping(address => bool) public allowList;

    /// @notice Amount of allowed voters
    uint256 public allowListCount;

    /// @notice Emitted when allowed voter added
    event AllowListedAddressAdded(address indexed addr);

    /// @notice Emitted when allowed voter removed
    event AllowListedAddressRemoved(address indexed addr);

    modifier onlyAllowListed() {
        require(allowList[_msgSender()], 'Address is not in AllowList');
        _;
    }

    /// @notice Initialization method
    /// @param _params Initialization params for Voting
    /// @param _rpvSaleContract Address of RPVSale contract
    /// @param _rpvToken Address of RPVToken contract
    function initialize(
        Params memory _params,
        address _rpvSaleContract,
        IERC20Upgradeable _rpvToken
    ) public override initializer {
        factory = IVotingFactory(_msgSender());
        Voting.initialize(_params, _rpvSaleContract, _rpvToken);
    }

    /// @notice Adds voter to allow list. (Only operator can use it)
    /// @param addr Voter address
    function addAddressToAllowList(address addr) external onlyOperator {
        require(allowList[addr] == false, 'Address has already been added');
        allowList[addr] = true;
        allowListCount++;
        emit AllowListedAddressAdded(addr);
    }

    /// @notice Adds array of voters to allow list. (Only operator can use it)
    /// @param _addresses Array of voters addresses
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

    /// @notice Removes voter from allow list. (Only operator can use it)
    /// @param addr Voter address
    function removeAddressFromAllowList(address addr) external onlyOperator {
        require(allowList[addr] == true, 'Address does not exist');
        allowList[addr] = false;
        allowListCount--;
        emit AllowListedAddressRemoved(addr);
    }

    /// @notice Function for voting "for". You can only vote if you are in allow list
    function voteFor() public override onlyAllowListed {
        super.voteFor();
    }

    /// @notice Function for voting "against". You can only vote if you are in allow list
    function voteAgainst() public override onlyAllowListed {
        super.voteAgainst();
    }
}

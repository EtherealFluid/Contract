// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IVotingFactory.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/IVoting.sol";
import "./interfaces/IUnicornToken.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "./interfaces/IVotingInitialize.sol";

/// @notice Voting contract
contract Voting is Initializable, ContextUpgradeable, IVoting {
    struct ballot {
        /// @notice Address of voter
        address voterAddress;

        /// @notice Voter's choise
        bool choice;
    }

    /// @notice Params structure
    Params public params;

    /// @notice Total amount of For votes
    uint256 internal totalForVotes;

    /// @notice Total amount of Against votes
    uint256 internal totalAgainstVotes;

    /// @notice Array of all voters
    ballot[] internal voters;

    /// @notice Mapping (address => uint256). Contains balances of locked tokens For
    mapping(address => uint256) internal balancesFor;

    /// @notice Mapping (address => uint256). Contains balances of locked tokens Against
    mapping(address => uint256) internal balancesAgainst;

    /// @notice ICHOR instance
    IICHOR public ichorToken;

    /// @notice UnicornToken instance
    IUnicornToken public unicornToken;

    /// @notice Shows if result of voting has been completed
    bool private resultCompleted;

    /// @notice Address of applicant
    address private applicant;

    /// @notice Amount of total votes For
    uint256 private totalAmountFor;

    /// @notice Amount of total votes Against
    uint256 private totalAmountAgainst;

    /// @notice Voting type
    VotingVariants private votingType;

    address private voterContractAddress;

    /// @notice Checks if voting result has been completed
    modifier votingResultNotCompleted() {
        require(!resultCompleted, "Voting: Voting result already completed!");
        _;
    }

    /// @notice Checks if caller is a Voter contract
    modifier onlyVoter() {
        require(_msgSender() == voterContractAddress, "Voting: Caller is not a Voter contract!");
        _;
    }

    /// @notice Checks if caller is a ICHOR token holder
    modifier tokenHoldersOnly(address _user) {
        require(
            ichorToken.balanceOf(_user) > 0,
            "Voting: Not enough ICHOR tokens!"
        );
        _;
    }

    /// @notice Checks if voting is over
    modifier votingIsOver() {
        require(
            block.timestamp > params.start + params.duration,
            "Voting: Voting is not over!"
        );
        _;
    }

    /// @notice Checks if voting is active
    modifier votingIsActive() {
        require(
            block.timestamp >= params.start &&
                block.timestamp <= (params.start + params.duration),
            "Voting: Voting is over"
        );
        _;
    }

    /// @notice Initialize contract
    /// @param _params Params structure
    /// @param _applicant The applicant to whom the result of the vote will be applied
    /// @param _ichorTokenAddress ICHOR token address
    /// @param _unicornToken Unicorn token address
    /// @param _votingType Type of Voting. UNICORN or CHARITY (0|1)
    function initialize(
        Params memory _params,
        address _applicant,
        address _ichorTokenAddress,
        address _unicornToken,
        address _voterContractAddress,
        VotingVariants _votingType
    ) public virtual override initializer {
        params = _params;
        ichorToken = IICHOR(_ichorTokenAddress);
        resultCompleted = false;
        applicant = _applicant;
        unicornToken = IUnicornToken(_unicornToken);
        voterContractAddress = _voterContractAddress;
        votingType = _votingType;
    }

    /// @notice Returns all voters
    /// @return array Array of all voters
    function getAllVoters() external view returns (address[] memory) {
        address[] memory addressVoters = new address[](voters.length);
        for (uint256 i = 0; i < voters.length; i++) {
            addressVoters[i] = voters[i].voterAddress;
        }
        return addressVoters;
    }

    /// @notice Returns total amount of voters
    /// @return Amount total amount of voters
    function getVoterCount() public view returns (uint256) {
        return voters.length;
    }

    /// @notice Returns voting description
    /// @return bytes voting description
    function getVotingParams() external view returns (Params memory) {
        return params;
    }

    /// @notice Returns voting balance of user
    /// @param account_ Voter's address
    /// @return amount Voting balance of user
    function getbalanceVoted(address account_) external view returns (uint256) {
        if (balancesFor[account_] > 0) {
            return balancesFor[account_];
        } else {
            return balancesAgainst[account_];
        }
    }

    /// @notice Returns stats of the voting
    /// @return _for Total For votes
    /// @return _against Total Against votes
    /// @return _count Total amount of users voted
    function getStats()
        public
        view
        returns (uint256 _for, uint256 _against, uint256 _count)
    {
        return (totalAmountFor, totalAmountAgainst, getVoterCount());
    }

    /// @notice Votes For
    /// @param amount_ Amount of tokens to lock
    /**
    @dev This method can be called by ICHOR holders only.
    This method can be called only while voting is active.
    **/
    function voteFor(
        address user,
        uint256 amount_
    ) public virtual onlyVoter tokenHoldersOnly(user) votingIsActive {
        require(
            balancesAgainst[user] == 0,
            "Voting: you cant vote for two options!"
        );
        ichorToken.transferFrom(user, address(this), amount_);

        if (balancesFor[user] == 0) {
            voters.push(ballot({voterAddress: user, choice: true}));
        }

        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);

        balancesFor[user] += amountWithFee;
        totalAmountFor += amountWithFee;
        totalForVotes++;
    }

    /// @notice Votes Against
    /// @param amount_ Amount of tokens to lock
    /**
    @dev This method can be called by ICHOR holders only.
    This method can be called only while voting is active.
    **/
    function voteAgainst(
        address user,
        uint256 amount_
    ) public virtual onlyVoter tokenHoldersOnly(user) votingIsActive {
        require(
            balancesFor[user] == 0,
            "Voting: you cant vote for two options!"
        );
        ichorToken.transferFrom(user, address(this), amount_);

        if (balancesAgainst[user] == 0) {
            voters.push(ballot({voterAddress: user, choice: false}));
        }
        uint256 amountWithFee = amount_ - ((amount_ * 4) / 100);

        balancesAgainst[user] += amountWithFee;
        totalAmountAgainst += amountWithFee;
        totalAgainstVotes++;
    }

    /// @notice Completes and finishes Voting
    /**
    @dev This method can be called only when voting is over.
    This method can be called only if result is not completed
    **/
    function finishVoting() external votingIsOver votingResultNotCompleted {
        resultCompleted = true;
        (uint256 _for, uint256 _against, uint256 _total) = getStats();

        if (_total >= params.minQtyVoters) {
            if (_for > _against) {
                if (votingType == VotingVariants.UNICORNADDING) {
                    unicornToken.mint(applicant);
                } else if (votingType == VotingVariants.UNICORNREMOVAL) {
                    unicornToken.burn(applicant);
                } else if (votingType == VotingVariants.CHARITY) {
                    ichorToken.setCharityAddress(applicant);
                }
                
            }
        }
    }

    /// @notice Withdraws locked tokens back to user
    /**
    @dev This method can be called only when voting is over.
    **/
    function withdraw() external votingIsOver {
        require(
            balancesFor[_msgSender()] > 0 || balancesAgainst[_msgSender()] > 0,
            "Voting: no tokens to withdraw"
        );
        uint256 amountToTransfer;
        if (balancesFor[_msgSender()] > 0) {
            amountToTransfer = balancesFor[_msgSender()];
        } else {
            amountToTransfer = balancesAgainst[_msgSender()];
        }
        ichorToken.transfer(_msgSender(), amountToTransfer);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Voting.sol";
import "./interfaces/IVotingFactory.sol";
import "./interfaces/IUnicornToken.sol";
import "./interfaces/IVotingInitialize.sol";
import "./interfaces/IVoting.sol";

/// @notice VotingFactory contract
contract VotingFactory is Ownable, IVotingFactory {
    struct votingInstance {
        /// @notice Voting instance address
        address addressInstance;

        /// @notice Voting type
        VotingVariants typeInstance;
    }

    /// @notice Address of master voting
    address public masterVoting;

    /// @notice Array if voting instances
    votingInstance[] public votingInstances;

    /// @notice ICHOR instance
    IICHOR public ichorToken;

    /// @notice Uicorn token instance
    IUnicornToken public unicornToken;

    /// @notice Mapping (address => bool). Shows if address is Voting instance
    mapping(address => bool) private mVotingInstances;

    /// @notice Checks if caller is a Unicorn
    modifier onlyUnicorns() {
        require(
            unicornToken.getIsUnicorn(msg.sender),
            "VotingFactory: caller is not a Unicorn"
        );
        _;
    }

    constructor() {
        masterVoting = address(new Voting());
    }

    /// @notice Sets new ICHOR token address
    /// @param ichorToken_ New ICHOR token address
    /// @dev This method can be called only by an Owner of the contract
    function setIchorAddress(address ichorToken_) external onlyOwner {
        ichorToken = IICHOR(ichorToken_);
    }

    /// @notice Returns current ICHOR token address
    /// @return address Current ICHOR token address
    function getIchorAddress() external view returns (address) {
        return address(ichorToken);
    }

    /// @notice Sets new Unicorn token address
    /// @param unicornToken_ New Unicorn token address
    /// @dev This method can be called only by an Owner of the contract
    function setUnicornToken(address unicornToken_) external onlyOwner {
        unicornToken = IUnicornToken(unicornToken_);
    }

    /// @notice Returns current Unicorn token address
    /// @return address Current Unicorn token address
    function getUnicornToken() external view returns (address) {
        return address(unicornToken);
    }

    /// @notice Creates Voting
    /// @param _typeVoting type of Voting. UNICORN or CHARITY (0|1)
    /// @param _voteDescription Description of Voting
    /// @param _duration Duration of the Voting
    /// @param _qtyVoters Quantity of voters
    /// @param _minPercentageVoters Min percentage of voters required for successful voting
    /// @param _applicant The applicant to whom the result of the vote will be applied
    /// @dev This method can be called only by Unicorns
    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters,
        address _applicant
    ) external override onlyUnicorns {
        require(
            _duration >= 518400 && _duration <= 1317600,
            "VotingFactory: Duration exceeds the allowable interval"
        );
        require(
            _qtyVoters > 0,
            "VotingFactory: QtyVoters must be greater than zero"
        );
        require(
            _minPercentageVoters > 0,
            "VotingFactory: Percentage must be greater than zero"
        );

        Params memory params = IVotingInitialize.Params({
                description: _voteDescription,
                start: block.timestamp,
                qtyVoters: _qtyVoters,
                minPercentageVoters: _minPercentageVoters,
                minQtyVoters: _mulDiv(_minPercentageVoters, _qtyVoters, 100),
                duration: _duration
            });

        address instance;
        instance = Clones.clone(masterVoting);
        IVoting(instance).initialize(
            params,
            _applicant,
            address(ichorToken),
            address(unicornToken),
            _typeVoting
        );
        votingInstances.push(
            votingInstance({
                addressInstance: instance,
                typeInstance: _typeVoting
            })
        );
        mVotingInstances[instance] = true;
        emit CreateVoting(instance, _typeVoting, params);
    }

    /// @notice Returns total amount of Voting instances
    /// @return amount Total amount of Voting instances
    function getVotingInstancesLength()
        external
        view
        override
        returns (uint256)
    {
        return votingInstances.length;
    }

    /// @notice Returns True if address is Voting instance, returns false if not
    /// @return bool True if address is Voting instance, returns false if not
    function isVotingInstance(address instance) external view returns (bool) {
        return mVotingInstances[instance];
    }

    /// @notice Calculates the minimum amount of voters needed for successfull voting
    /// @dev This in an internal method
    function _mulDiv(
        uint256 x,
        uint256 y,
        uint256 z
    ) internal pure returns (uint256) {
        uint256 a = x / z;
        uint256 b = x % z; // x = a * z + b
        uint256 c = y / z;
        uint256 d = y % z; // y = c * z + d
        return a * b * z + a * d + b * c + (b * d) / z;
    }
}

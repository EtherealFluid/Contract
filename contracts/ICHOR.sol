// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/IVotingFactory.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IUnicornRewards.sol";


/// @title ICHOR token contract
contract ICHOR is Context, IERC20, Ownable {
    using SafeMath for uint256;
    mapping(address => uint256) private _rOwned;

    // Mapping (address => (address => uint256)). Contains token's allowances
    mapping(address => mapping(address => uint256)) private _allowances;

    // Mapping (address => bool). Shows if user is excluded from fee
    mapping(address => bool) private _isExcludedFromFee;

    // Mapping (address => bool). Contains list of bots (blacklisted addresses)
    mapping(address => bool) private bots;

    // Mapping (address => uint256). Contains cooldown time for users to purchase ICHOR
    mapping(address => uint256) private cooldown;
    uint256 private constant _tTotal = 1e10 * 10 ** 9;

    // VotingFactory instance
    IVotingFactory public voting;

    // StakingContract address
    address public stakingAddress;

    // UnicornRewards address
    address private unicornRewards;

    // Charity wallet address
    address private _charity;

    // Name of the token
    string private constant _name = "Ethereal Fluid";

    // Symbol of the token
    string private constant _symbol = "ICHOR";

    // Decimals of the token
    uint8 private constant _decimals = 9;

    // UniswapV2Router02 instance
    IUniswapV2Router02 public uniswapV2Router;

    // UniswapV2Pair address
    address public uniswapV2Pair;

    // Shows if trading is open
    bool private tradingOpen;

    // Shows if contract in swap
    bool private inSwap = false;

    // Shows if cooldown if enabled
    bool private cooldownEnabled = false;

    // Contains trading active block
    // 0 means trading is not active
    uint256 private tradingActiveBlock = 0; 

    // Contains the maximum number of tokens to buy at one time
    uint256 private _maxBuyAmount = _tTotal;

    // Contains the maximum number of tokens to sell at one time
    uint256 private _maxSellAmount = _tTotal;

    //Contains the maximum number of tokens to store on one wallet
    uint256 private _maxWalletAmount = _tTotal;

    // Shows if user is claimed his migration tokens
    mapping(address => bool) public hasClaimed;

    // Old ICHOR contract address
    address private oldIchorAddress;

    // Address of wallet of migration payer
    // Tokens for migration will be transferred from this wallet
    address private migrationPayer;

    // Total fee
    uint256 private totalFee;

    // Denominator
    uint256 private DENOMINATOR = 1000;

    /// @dev Indicates that max buy amount was updated
    /// @param _maxBuyAmount New max buy amount
    event MaxBuyAmountUpdated(uint256 _maxBuyAmount);

    /// @dev Indicates that max sell amount was updated
    /// @param _maxSellAmount New max sell amount
    event MaxSellAmountUpdated(uint256 _maxSellAmount);

    /// @dev Indicates that max wallet amount was updated
    /// @param _maxWalletAmount New max wallet amount
    event MaxWalletAmountUpdated(uint256 _maxWalletAmount);

    /// @dev Indicates that tokens was migrated
    /// @param _user Tokens reciever
    /// @param _amount Amount of tokens transfered
    event TokensMigrated(address _user, uint256 _amount);

    /// @dev Checks if contract in swap
    modifier lockTheSwap() {
        inSwap = true;
        _;
        inSwap = false;
    }

    /// @dev Checks if caller is a Voting instance
    modifier onlyVoting() {
        require(
            voting.isVotingInstance(msg.sender),
            "ICHOR: caller is not a Voting contract!"
        );
        _;
    }

    /// @param _uniswapV2Router Address of UniswapV2Router contract
    /// @param _oldIchorAddress Address of old ICHOR contract
    /// @param charity Address of charity wallet
    /// @param _votingFactoryAddress Address of VotingFactory contract
    /// @param _stakingAddress Address of StakingContract
    /// @param _unicornRewards Address of UnicornRewards contract
    /// @param _migrationPayer Address of migration payer wallet
    constructor(
        address _uniswapV2Router,
        address _oldIchorAddress,
        address charity,
        address _votingFactoryAddress,
        address _stakingAddress,
        address _unicornRewards,
        address _migrationPayer
    ) {
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);

        _rOwned[_msgSender()] = _tTotal;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        unicornRewards = _unicornRewards;
        emit Transfer(address(0), _msgSender(), _tTotal);

        totalFee = 40;

        oldIchorAddress = _oldIchorAddress;
        _charity = charity;
        voting = IVotingFactory(_votingFactoryAddress);
        stakingAddress = _stakingAddress;
        migrationPayer = _migrationPayer;
    }

    /// @notice Returns name of the token
    /// @return Name of the token
    function name() public pure returns (string memory) {
        return _name;
    }

    /// @notice Returns symbol of the token
    /// @return Symbol of the token
    function symbol() public pure returns (string memory) {
        return _symbol;
    }
    /// @notice Returns decimals of the token
    /// @return Decimals of the token
    function decimals() public pure returns (uint8) {
        return _decimals;
    }

    /// @notice Returns totalSupply of the token
    /// @return TotalSupply of the token
    function totalSupply() public pure override returns (uint256) {
        return _tTotal;
    }

    /// @notice Returns balance of targeted account
    /// @param account Address of target account
    /// @return Balance of targeted account
    function balanceOf(address account) public view override returns (uint256) {
        return _rOwned[account];
    }

    /// @notice Transfers tokens to targeted account
    /// @param recipient Address of tokens recipient
    /// @param amount Amount of tokens to transfer
    /// @return bool If the transfer was successful or not
    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /// @notice Checks allowance of tokens
    /// @param owner Owner of tokens
    /// @param spender Spender of tokens
    /// @return amount The amount of tokens that the spender can use from the owner's balance
    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice Approves tokens to spend from callet to targeted account
    /// @param spender Spender of tokens
    /// @param amount The amount of tokens that the spender can use from the caller's balance
    /// @return bool If the approve was successful or not
    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /// @notice Transfers tokens from spender to targeted account
    /// @param sender Owner of tokens
    /// @param recipient Address of tokens recipient
    /// @param amount Amount of tokens to transfer
    /// @return bool If the transfer was successful or not
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            _msgSender(),
            _allowances[sender][_msgSender()].sub(
                amount,
                "ERC20: transfer amount exceeds allowance"
            )
        );
        return true;
    }

    /// @notice Sets cooldown enabled or disabled
    /// @param onoff True - on, False - off
    /// @dev This method can be called only by an Owner of the contract
    function setCooldownEnabled(bool onoff) external onlyOwner {
        cooldownEnabled = onoff;
    }

    /// @notice Sets Charity wallet address
    /// @param charity New Charity wallet address
    /// @dev This method can be called only by a Voting instance
    function setCharityAddress(address charity) external onlyVoting {
        require(
            charity != address(0),
            "ICHOR: Charity cannot be a zero address!"
        );
        _charity = charity;
    }

    /// @notice Returns address of current charity wallet
    /// @return address Address of current charity wallet
    function getCharityAddress() external view returns (address) {
        return _charity;
    }

    /// @notice Sets new total fee amount in the range from 40 to 100(40 = 4%). Max - 10%
    /// @param newFee_ New total fee amount
    /// @dev This method can be called only by an Owner of the contract
    function setTotalFee(uint256 newFee_) external onlyOwner {
        require(newFee_ <= 100, "ICHOR: Fee cant be greater than 10%");
        totalFee = newFee_;
    }

    /// @notice Returns current total fee amount
    /// @return uint256 Current total fee amount
    function getTotalFee() external view returns (uint256) {
        return totalFee;
    }

    /// @notice Approves tokens to spend from callet to targeted account
    /// @param spender Spender of tokens
    /// @param amount The amount of tokens that the spender can use from the caller's balance
    /// @dev This is a private method
    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }


    /// @notice Transfers tokens from spender to targeted account
    /// @param from Sender of tokens
    /// @param to Recipient of tokens
    /// @param amount Amount of tokens to transfer
    /// @dev This is a private method
    function _transfer(address from, address to, uint256 amount) private {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "ERC20: Transfer amount must be greater than zero");
        bool takeFee = true;
        if (
            from != owner() &&
            to != owner() &&
            to != address(0) &&
            to != address(0xdead)
        ) {
            require(!bots[from] && !bots[to]);

            if (
                from == uniswapV2Pair &&
                to != address(uniswapV2Router) &&
                !_isExcludedFromFee[to] &&
                cooldownEnabled
            ) {
                require(
                    amount <= _maxBuyAmount,
                    "ICHOR: Transfer amount exceeds the maxBuyAmount!"
                );
                require(
                    balanceOf(to) + amount <= _maxWalletAmount,
                    "ICHOR: Exceeds maximum wallet token amount!"
                );
                require(cooldown[to] < block.timestamp);
                cooldown[to] = block.timestamp + (30 seconds);
            }

            if (
                to == uniswapV2Pair &&
                from != address(uniswapV2Router) &&
                !_isExcludedFromFee[from] &&
                cooldownEnabled
            ) {
                require(
                    amount <= _maxSellAmount,
                    "ICHOR: Transfer amount exceeds the maxSellAmount!"
                );
            }
        }

        if (_isExcludedFromFee[from] || _isExcludedFromFee[to] || totalFee == 0) {
            takeFee = false;
        }

        _tokenTransfer(from, to, amount, takeFee);
    }

    /// @notice Swaps ICHOR tokens for Eth
    /// @param tokenAmount Amount of tokens to swap
    /// @dev This is a private method
    /// @dev Can be called only if contract is not already in a swap
    function swapTokensForEth(uint256 tokenAmount) private lockTheSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    /** 
    @notice Transfers tokens from migration payer to user. 
    Amount of tokens to migrate defined by old ICHOR contract balance of the user.
    You can call this method only once 
    **/
    function migrateTokens() external {
        uint256 amount = IICHOR(oldIchorAddress).balanceOf(msg.sender);
        require(balanceOf(migrationPayer) >= amount, "ICHOR: cant pay now!");
        require(!hasClaimed[msg.sender], "ICHOR: tokens already claimed!");
        hasClaimed[msg.sender] = true;
        _transferStandard(migrationPayer, msg.sender, amount);
        emit TokensMigrated(msg.sender, amount);
    }

    /**
    @notice Creates liquidity pool of ICHOR token/eth and adds liquidity
    Also sets initial settings
    **/
    /// @dev This method can be called only by an Owner of the contract
    function openTrading() external onlyOwner {
        require(!tradingOpen, "ICHOR: Trading is already open");
        _approve(address(this), address(uniswapV2Router), _tTotal);
        uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(
            address(this),
            uniswapV2Router.WETH()
        );
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(
            address(this),
            balanceOf(address(this)),
            0,
            0,
            owner(),
            block.timestamp
        );

        cooldownEnabled = true;
        _maxBuyAmount = 5e7 * 10 ** 9;
        _maxSellAmount = 5e7 * 10 ** 9;
        _maxWalletAmount = 1e8 * 10 ** 9;
        tradingOpen = true;
        tradingActiveBlock = block.number;
        IERC20(uniswapV2Pair).approve(
            address(uniswapV2Router),
            type(uint256).max
        );
    }

    /// @notice Sets max amount to buy
    /// @param maxBuy New max amount to buy
    /// @dev This method can be called only by an Owner of the contract
    function setMaxBuyAmount(uint256 maxBuy) public onlyOwner {
        _maxBuyAmount = maxBuy;
        emit MaxBuyAmountUpdated(_maxBuyAmount);
    }

    /// @notice Sets max amount to sell
    /// @param maxSell New max amount to sell
    /// @dev This method can be called only by an Owner of the contract
    function setMaxSellAmount(uint256 maxSell) public onlyOwner {
        _maxSellAmount = maxSell;
        emit MaxSellAmountUpdated(_maxSellAmount);
    }

    /// @notice Sets max amount to store on one wallet
    /// @param maxToken New max amount to store on one wallet
    /// @dev This method can be called only by an Owner of the contract
    function setMaxWalletAmount(uint256 maxToken) public onlyOwner {
        _maxWalletAmount = maxToken;
        emit MaxWalletAmountUpdated(_maxWalletAmount);
    }


    /// @notice Excludes the target account from charging fees
    /// @dev This method can be called only by an Owner of the contract
    function excludeFromFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = true;
    }

    /// @notice Includes the target account in charging fees
    /// @dev This method can be called only by an Owner of the contract
    function includeInFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = false;
    }

    /// @notice Adds targeted accounts to the blacklist 
    /// @param bots_ Array of targeted accounts
    /// @dev This method can be called only by an Owner of the contract
    function setBots(address[] memory bots_) public onlyOwner {
        for (uint256 i = 0; i < bots_.length; i++) {
            bots[bots_[i]] = true;
        }
    }

    /// @notice Removes targeted account from the blacklist 
    /// @param notbot Targeted account
    /// @dev This method can be called only by an Owner of the contract
    function delBot(address notbot) public onlyOwner {
        bots[notbot] = false;
    }

    /// @notice Transfers tokens from spender to targeted account and takes fee if needed
    /// @param sender Sender of tokens
    /// @param recipient Recipient of tokens
    /// @param amount Amount of tokens to transfer
    /// @param takeFee True - take fee, False - not take fee
    /// @dev This is a private method
    function _tokenTransfer(
        address sender,
        address recipient,
        uint256 amount,
        bool takeFee
    ) private {
        if (takeFee) {
            amount = _takeFees(sender, amount);
        }
        _transferStandard(sender, recipient, amount);
    }

    /// @notice Transfers tokens from spender to targeted account
    /// @param sender Sender of tokens
    /// @param recipient Recipient of tokens
    /// @param tAmount Amount of tokens to transfer
    /// @dev This is a private method
    function _transferStandard(
        address sender,
        address recipient,
        uint256 tAmount
    ) private {
        require(balanceOf(sender) >= tAmount, "ICHOR: Insufficient balance!");
        _rOwned[sender] = _rOwned[sender].sub(tAmount);
        _rOwned[recipient] = _rOwned[recipient].add(tAmount);
        emit Transfer(sender, recipient, tAmount);
    }

    /// @notice Calculating and distributing fees
    /// @param sender Sender of tokens
    /// @param amount Amount of tokens to transfer
    /// @return tAmount New amount of tokens to transfer 
    /// @dev This is a private method
    function _takeFees(
        address sender,
        uint256 amount
    ) private returns (uint256) {
        uint256 totalFeeAmount = amount.mul(totalFee).div(DENOMINATOR);
        uint256 amountToCharity = totalFeeAmount.mul(500).div(DENOMINATOR);
        uint256 amountToStaking = (totalFeeAmount.sub(amountToCharity))
            .mul(850)
            .div(DENOMINATOR);
        uint256 amountToUnicorns = totalFeeAmount.sub(
            amountToCharity.add(amountToStaking)
        );

        if (amountToCharity > 0) {
            _transferStandard(sender, _charity, amountToCharity);
        }

        if (amountToStaking > 0) {
            _transferStandard(sender, stakingAddress, amountToStaking);
            IStakingContract(stakingAddress).notifyRewardAmount(
                amountToStaking
            );
        }

        if (amountToUnicorns > 0) {
            _transferStandard(sender, unicornRewards, amountToUnicorns);
            IUnicornRewards(unicornRewards).notifyRewardAmount(
                amountToUnicorns
            );
        }
        return amount -= totalFeeAmount;
    }

    receive() external payable {}


    /// @notice Swaps all ICHOR tokens on this contract for Eth
    /// @dev This method can be called only by an Owner of the contract
    function manualswap() public onlyOwner {
        uint256 contractBalance = balanceOf(address(this));
        swapTokensForEth(contractBalance);
    }

    /// @notice Transfers all Eth from this contract to the Owner
    /// @dev This method can be called only by an Owner of the contract
    function withdrawStuckETH() external onlyOwner {
        bool success;
        (success, ) = address(msg.sender).call{value: address(this).balance}("");
    }
}

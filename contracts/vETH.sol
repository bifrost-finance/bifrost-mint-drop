// SPDX-License-Identifier: MIT

pragma solidity 0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract vETH is ERC20, Ownable, Pausable {

    constructor() public ERC20("Voucher Ethereum", "vETH") Ownable() Pausable() {
        super._pause();
    }

    function mint(address account, uint amount) external onlyOwner {
        super._mint(account, amount);
    }

    function burn(address account, uint amount) external onlyOwner {
        super._burn(account, amount);
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        require(!super.paused(), "vETH: transfer while paused");
        return super.transfer(recipient, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        require(!super.paused(), "vETH: transfer while paused");
        return super.transferFrom(sender, recipient, amount);
    }

    function unpause() external onlyOwner {
        super._unpause();
    }
}

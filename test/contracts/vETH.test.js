// Load dependencies
const { accounts, contract } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const {
    shouldBehaveLikeERC20,
    shouldBehaveLikeERC20Transfer,
    shouldBehaveLikeERC20Approve,
} = require('./ERC20.behavior');

// Load compiled artifacts
const VETHTest = contract.fromArtifact('vETH');

// Start test block
describe('vETH', function () {
    const [ creator, owner, recipient, anotherAccount ] = accounts;
    const name = 'Voucher Ethereum';
    const symbol = 'vETH';
    const initialSupply = ether('100');

    beforeEach(async function () {
        // Deploy a ERC20 contract for each test
        this.token = await VETHTest.new({ from: creator });
        await this.token.transferOwnership(owner, { from: creator });
        await this.token.mint(owner, initialSupply, { from: owner });
    });

    it('initial name', async function () {
        expect(await this.token.name()).to.equal(name);
    });

    it('initial symbol', async function () {
        expect(await this.token.symbol()).to.equal(symbol);
    });

    it('initial has 18 decimals', async function () {
        expect(await this.token.decimals()).to.be.bignumber.equal('18');
    });

    it('initial total supply is zero', async function () {
        expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply);
    });

    it('initial owner', async function () {
        expect(await this.token.owner()).to.equal(owner);
    });

    it('mint should be ok', async function () {
        const amount = ether('100');
        await this.token.mint(recipient, amount, { from: owner });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(amount);
        expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply.add(amount));
    });

    it('burn should be ok', async function () {
        const mintAmount = ether('100');
        await this.token.mint(recipient, mintAmount, { from: owner });
        const burnAmount = ether('20');
        await this.token.burn(recipient, burnAmount, { from: owner });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(mintAmount.sub(burnAmount));
        expect(await this.token.totalSupply()).to.be.bignumber.equal(initialSupply.add(mintAmount.sub(burnAmount)));
    });

    it('mint by invalid user should throw exception', async function () {
        const amount = ether('100');
        await expectRevert(
            this.token.mint(recipient, amount, { from: creator }),
            'caller is not the owner '
        );
    });

    it('burn by invalid user should throw exception', async function () {
        const mintAmount = ether('100');
        await this.token.mint(recipient, mintAmount, { from: owner });
        const burnAmount = ether('20');
        await expectRevert(
            this.token.burn(recipient, burnAmount, { from: creator }),
            'caller is not the owner '
        );
    });

    it('transfer should be locked by default', async function () {
        const amount = ether('100');
        await expectRevert(
            this.token.transfer(recipient, amount, { from: owner }),
            'vETH: transfer while paused.'
        );
    });

    it('transferFrom should be locked by default', async function () {
        const amount = ether('100');
        await this.token.approve(anotherAccount, amount);
        await expectRevert(
            this.token.transferFrom(owner, anotherAccount, amount, { from: owner }),
            'vETH: transfer while paused.'
        );
    });

    it('unpause transfer should be ok', async function () {
        const amount = ether('100');
        await this.token.unpause({ from: owner });
        await this.token.transfer(recipient, amount, { from: owner });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(amount);
    });

    it('unpause transferFrom should be ok', async function () {
        const amount = ether('100');
        await this.token.unpause({ from: owner });
        await this.token.approve(anotherAccount, amount, { from: owner });
        await this.token.transferFrom(owner, recipient, amount, { from: anotherAccount });
        expect(await this.token.balanceOf(recipient)).to.be.bignumber.equal(amount);
    });

    describe('ERC20 behave', function () {
        beforeEach(async function () {
            await this.token.unpause({from: owner});
        });
        shouldBehaveLikeERC20('ERC20', initialSupply, owner, recipient, anotherAccount);
    });
});
// Load dependencies
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, ether, expectRevert, time } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const ERC20 = contract.fromArtifact('vETH');
const MintDrop = contract.fromArtifact('MintDrop');
const DepositContract = contract.fromArtifact('DepositContract');

// Start test block
describe('MintDrop', function () {
    const [ owner, user1 ] = accounts;

    beforeEach(async function () {
        // Deploy DepositContract contract for each test
        this.deposit = await DepositContract.new({ from: owner });

        // Deploy vETH contract for each test
        this.veth = await ERC20.new({ from: owner });

        // Deploy MintDrop contract for each test
        const bonusStartAt = await time.latest();
        this.mintDrop = await MintDrop.new(this.veth.address, this.deposit.address, bonusStartAt, { from: owner });
        expect(await this.mintDrop.depositAddress()).to.equal(this.deposit.address);
        expect(await this.mintDrop.bonusStartAt()).to.be.bignumber.equal(new BN(bonusStartAt));

        // transfer ownership of vETH to MintDrop contract
        await this.veth.transferOwnership(this.mintDrop.address, { from: owner });
        expect(await this.veth.owner()).to.be.bignumber.equal(this.mintDrop.address);
    });

    it('when deposit should be ok', async function () {
        const amount = ether('5');
        await this.mintDrop.deposit({ from: user1, value: amount });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.myRewards(user1)).to.be.bignumber.equal(ether('0'));
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(amount);
        expect(await this.veth.totalSupply()).to.be.bignumber.equal(amount);
    });

    it('when withdraw should be ok', async function () {
        const amount = ether('50');
        await this.mintDrop.deposit({ from: user1, value: amount });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(amount);
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(amount);
        expect(await this.veth.totalSupply()).to.be.bignumber.equal(amount);
        await expectRevert(
            this.mintDrop.lockWithdraw({ from: user1 }),
            "caller is not the owner"
        );
        await expectRevert(
            this.mintDrop.unlockWithdraw({ from: user1 }),
            "caller is not the owner"
        );
        await this.mintDrop.lockWithdraw({ from: owner });
        await expectRevert(
            this.mintDrop.withdraw(amount, { from: user1 }),
            "withdrawal locked"
        );
        await this.mintDrop.unlockWithdraw({ from: owner });
        await this.mintDrop.withdraw(amount, { from: user1 });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(new BN('0'));
        expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(ether('0'));
        expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(ether('0'));
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(ether('0'));
        expect(await this.veth.totalSupply()).to.be.bignumber.equal(ether('0'));
    });

    it('when claim rewards should be ok', async function () {
        const amount = ether('5');
        await this.mintDrop.deposit({ from: user1, value: amount });
        expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(amount);
        expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(amount);
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(amount);
        expect(await this.veth.totalSupply()).to.be.bignumber.equal(amount);
        await this.mintDrop.claimRewards({ from: user1 });
    });

    it('when new validator should be ok', async function () {
        const amount = ether('32');
        await this.mintDrop.deposit({ from: user1, value: amount });
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(amount);
        const pubkey = web3.utils.hexToBytes("0x8b06dd23f29e03ee379a68103ff3baf816acac525b307fc53bcb1689e600128040fb1e570dc5a355deed79327273714c");
        const withdrawal_credentials = web3.utils.hexToBytes("0x008e3571729cbfb9212496fe1c3bc6a5b46f62370937dcbae8f62b5a326f6fdf");
        const signature = web3.utils.hexToBytes("0x8b66f46c10c3920e4b8e8776b298ab5efc3eca0d08709dde56d04a26706694bc35a3c7eb373bbf36079c65c944f2acd611d9e74c83e829d6c01ba7816beb0ee5d1f680e28e9c546e6f689b96a9d5455279c68c28ef2312da137bda2a12ebbbc7");
        const deposit_data_root = "0xe763e880b74290438d6ec655201c50a2d8a80bcb6f428767c2d4ce735011c488";
        await expectRevert(
            this.mintDrop.lockForValidator(
                pubkey,
                withdrawal_credentials,
                signature,
                deposit_data_root,
                { from: owner }
            ),
            "withdrawal not locked"
        );
        await this.mintDrop.lockWithdraw({ from: owner });
        await this.mintDrop.lockForValidator(
            pubkey,
            withdrawal_credentials,
            signature,
            deposit_data_root,
            { from: owner }
        );
        expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(new BN('0'));
        expect(await web3.eth.getBalance(this.deposit.address)).to.be.bignumber.equal(amount);
    });

    it('bind bifrost address should be ok', async function () {
        const address = 'gPZ4o3vGBYJn321jVJ3ahGPTnz5TGMSACqZaAs9LsP8hFvo';
        await this.mintDrop.bindBifrostAddress(address, { from: user1});
        expect(await this.mintDrop.bifrostAddress(user1)).to.be.bignumber.equal(address);
    });
});

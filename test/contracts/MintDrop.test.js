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
    const [ owner, user1, user2 ] = accounts;
    const BONUS_DURATION = 32;
    const MAX_CLAIM_DURATION = 8;
    const TOTAL_BNC_REWARDS = ether('100000');
    let bonusStartAt;

    beforeEach(async function () {
        // Deploy DepositContract contract for each test
        this.deposit = await DepositContract.new({ from: owner });

        // Deploy vETH contract for each test
        this.veth = await ERC20.new({ from: owner });
    });

    describe('MintDrop 1', function () {
        beforeEach(async function () {
            // Deploy MintDrop contract for each test
            bonusStartAt = await time.latest();
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
            await this.mintDrop.withdraw(amount, { from: user1 });
            expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(ether('0'));
            expect(await this.mintDrop.myDeposit(user1)).to.be.bignumber.equal(ether('0'));
            expect(await this.mintDrop.totalDeposit()).to.be.bignumber.equal(ether('0'));
            expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(ether('0'));
            expect(await this.veth.totalSupply()).to.be.bignumber.equal(ether('0'));
            await this.mintDrop.lockWithdraw({ from: owner });
            expect(await this.mintDrop.withdrawLocked()).to.equal(true);
            await expectRevert(
                this.mintDrop.withdraw(amount, { from: user1 }),
                "withdrawal locked"
            );
            await this.mintDrop.unlockWithdraw({ from: owner });
            expect(await this.mintDrop.withdrawLocked()).to.equal(false);
            await this.mintDrop.lockWithdraw({ from: owner });
            expect(await this.mintDrop.withdrawLocked()).to.equal(true);
        });

        it('when new validator should be ok', async function () {
            const amount = ether('32');
            await this.mintDrop.deposit({ from: user1, value: amount });
            expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(amount);
            const pubkey = web3.utils.hexToBytes("0x8b06dd23f29e03ee379a68103ff3baf816acac525b307fc53bcb1689e600128040fb1e570dc5a355deed79327273714c");
            const withdrawal_credentials = web3.utils.hexToBytes("0x008e3571729cbfb9212496fe1c3bc6a5b46f62370937dcbae8f62b5a326f6fdf");
            const signature = web3.utils.hexToBytes("0x8b66f46c10c3920e4b8e8776b298ab5efc3eca0d08709dde56d04a26706694bc35a3c7eb373bbf36079c65c944f2acd611d9e74c83e829d6c01ba7816beb0ee5d1f680e28e9c546e6f689b96a9d5455279c68c28ef2312da137bda2a12ebbbc7");
            const deposit_data_root = "0xe763e880b74290438d6ec655201c50a2d8a80bcb6f428767c2d4ce735011c488";
            expect(await this.mintDrop.totalLocked()).to.be.bignumber.equal(ether('0'));
            await expectRevert(
                this.mintDrop.lockForValidator(
                    pubkey,
                    withdrawal_credentials,
                    signature,
                    deposit_data_root,
                    { from: user1 }
                ),
                "caller is not the owner"
            );
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
            expect(await this.deposit.get_deposit_count()).to.be.bignumber.equal(new BN('0x0100000000000000'));
            expect(await this.mintDrop.totalLocked()).to.be.bignumber.equal(amount);
            expect(await web3.eth.getBalance(this.mintDrop.address)).to.be.bignumber.equal(ether('0'));
            expect(await web3.eth.getBalance(this.deposit.address)).to.be.bignumber.equal(amount);
        });

        it('vETH transfer should be ok', async function () {
            const amount = ether('10');
            await this.mintDrop.deposit({ from: user1, value: amount });
            expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(amount);
            await expectRevert(
                this.veth.transfer(user2, amount, { from: user1 }),
                "vETH: transfer while paused."
            );
            await this.mintDrop.lockWithdraw({ from: owner });
            await this.veth.transfer(user2, amount, { from: user1 });
            expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(ether('0'));
            expect(await this.veth.balanceOf(user2)).to.be.bignumber.equal(amount);
        });

        it('bind bifrost address should be ok', async function () {
            const address = 'gPZ4o3vGBYJn321jVJ3ahGPTnz5TGMSACqZaAs9LsP8hFvo';
            await this.mintDrop.bindBifrostAddress(address, { from: user1});
            expect(await this.mintDrop.bifrostAddress(user1)).to.be.bignumber.equal(address);
        });
    });

    describe('MintDrop 2', function () {
        beforeEach(async function () {
            // Deploy MintDrop contract for each test
            bonusStartAt = await time.latest();
            this.mintDrop2 = await MintDrop.new(this.veth.address, this.deposit.address, bonusStartAt, { from: owner });
        });

        it('when getTotalRewards() should be ok', async function () {
            for (let i = 1; i <= BONUS_DURATION+1; i++) {
                await time.increaseTo(bonusStartAt.add(time.duration.days(i)));
                expect(
                    new BN(await this.mintDrop2.getTotalRewards()).divRound(ether('1'))
                ).to.be.bignumber.equal(
                    TOTAL_BNC_REWARDS
                        .mul(new BN(Math.min(i, BONUS_DURATION)))
                        .div(new BN(BONUS_DURATION))
                        .divRound(ether('1'))
                );
            }
        });
    });

    describe('MintDrop 3', function () {
        beforeEach(async function () {
            // Deploy MintDrop contract for each test
            bonusStartAt = await time.latest();
            this.mintDrop3 = await MintDrop.new(this.veth.address, this.deposit.address, bonusStartAt, { from: owner });
            await this.veth.transferOwnership(this.mintDrop3.address, { from: owner });

        });

        it('when getIncrementalRewards should be ok', async function () {
            const amount = ether('5');
            expect(await this.mintDrop3.myLastClaimedAt(user1)).to.be.bignumber.equal(new BN('0'));
            await this.mintDrop3.deposit({ from: user1, value: amount });
            expect(await this.mintDrop3.myLastClaimedAt(user1)).to.be.bignumber.equal(await time.latest());

            for (let i = 1; i <= BONUS_DURATION+1; i++) {
                await time.increaseTo(bonusStartAt.add(time.duration.days(i)));
                expect(
                    new BN(await this.mintDrop3.getIncrementalRewards(user1)).divRound(ether('1'))
                ).to.be.bignumber.equal(
                    TOTAL_BNC_REWARDS
                        .mul(new BN(Math.min(i, BONUS_DURATION)))
                        .div(new BN(BONUS_DURATION))
                        .mul(new BN(Math.min(i, MAX_CLAIM_DURATION)))
                        .div(new BN(MAX_CLAIM_DURATION))
                        .divRound(ether('1'))
                );
            }
        });
    });

    describe('MintDrop 4', function () {
        let initialAt;
        beforeEach(async function () {
            // Deploy MintDrop contract for each test
            initialAt = await time.latest();
            bonusStartAt = initialAt.add(time.duration.days(1));
            this.mintDrop4 = await MintDrop.new(this.veth.address, this.deposit.address, bonusStartAt, { from: owner });
            await this.veth.transferOwnership(this.mintDrop4.address, { from: owner });
        });

        it('when getTotalRewards() should be ok', async function () {
            await time.increaseTo(initialAt.add(time.duration.hours(12)));
            expect(await this.mintDrop4.getTotalRewards()).to.be.bignumber.equal(ether('0'));
            await time.increaseTo(initialAt.add(time.duration.days(1)));
            expect(await this.mintDrop4.getTotalRewards()).to.be.bignumber.equal(ether('0'));
            await time.increaseTo(initialAt.add(time.duration.days(2)));
            expect(
                new BN(await this.mintDrop4.getTotalRewards()).divRound(ether('1'))
            ).to.be.bignumber.equal(
                TOTAL_BNC_REWARDS.div(new BN(BONUS_DURATION)).divRound(ether('1'))
            );
        });

        it('when getIncrementalRewards should be ok', async function () {
            const amount = ether('5');
            await this.mintDrop4.deposit({ from: user1, value: amount });
            await time.increaseTo(initialAt.add(time.duration.hours(12)));
            expect(await this.mintDrop4.getIncrementalRewards(user1)).to.be.bignumber.equal(ether('0'));
            await time.increaseTo(initialAt.add(time.duration.days(1)));
            expect(await this.mintDrop4.getIncrementalRewards(user1)).to.be.bignumber.equal(ether('0'));
            await time.increaseTo(initialAt.add(time.duration.days(2)));
            expect(await this.mintDrop4.getIncrementalRewards(user1)).to.be.bignumber.equal(
                TOTAL_BNC_REWARDS.div(new BN(BONUS_DURATION)).div(new BN(MAX_CLAIM_DURATION))
            );
        });
    });
});

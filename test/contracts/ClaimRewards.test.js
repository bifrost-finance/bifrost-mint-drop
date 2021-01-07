// Load dependencies
const { accounts, privateKeys, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
const { BN, ether, expectRevert, time } = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const ERC20 = contract.fromArtifact('vETH');
const ClaimRewards = contract.fromArtifact('ClaimRewards');

// Start test block
describe('ClaimRewards', function () {
    const [ owner, signer, user1, user2 ] = accounts;
    const [ _, signerPrivateKey ] = privateKeys;

    beforeEach(async function () {
        // Deploy vETH contract for each test
        this.veth = await ERC20.new({ from: owner });
        await this.veth.unpause({ from: owner });

        // Deploy ClaimRewards contract for each test
        this.claimRewards = await ClaimRewards.new({ from: owner });
        await this.claimRewards.initialize(this.veth.address, signer, { from: owner });
        expect(await this.claimRewards.vETHAddress()).to.equal(this.veth.address);
        expect(await this.claimRewards.signer()).to.equal(signer);

        // mint vETH
        await this.veth.mint(this.claimRewards.address, ether('10000'), { from: owner });
        expect(await this.veth.balanceOf(this.claimRewards.address)).to.be.bignumber.equal(ether('10000'));
    });

    it('when claim should be ok', async function () {
        let index = 100;
        const amount = ether('5');
        let now = await time.latest();
        let expireAt = now.add(time.duration.days(1));
        let encoded = web3.eth.abi.encodeParameters(
            ['address', 'uint', 'uint', 'uint'],
            [user1, index.toString(), amount.toString(), expireAt.toString()]
        );
        let hash = web3.utils.keccak256(encoded);
        let sig = web3.eth.accounts.sign(hash, signerPrivateKey);
        await expectRevert(
            this.claimRewards.claim(index, amount, expireAt, sig.signature, { from: user2 }),
            "invalid signature"
        );
        await this.claimRewards.claim(index, amount, expireAt, sig.signature, { from: user1 });
        await expectRevert(
            this.claimRewards.claim(index, amount, expireAt, sig.signature, { from: user1 }),
            "claimed"
        );
        expect(await this.claimRewards.totalClaimed()).to.be.bignumber.equal(ether('5'));
        expect(await this.claimRewards.myClaimed(user1)).to.be.bignumber.equal(ether('5'));
        expect(await this.veth.balanceOf(this.claimRewards.address)).to.be.bignumber.equal(ether('9995'));
        expect(await this.veth.balanceOf(user1)).to.be.bignumber.equal(ether('5'));

        await time.increase(time.duration.hours(1));

        index = 101;
        now = await time.latest();
        expireAt = now.add(time.duration.days(1));
        encoded = web3.eth.abi.encodeParameters(
            ['address', 'uint', 'uint', 'uint'],
            [user1, index.toString(), amount.toString(), expireAt.toString()]
        );
        hash = web3.utils.keccak256(encoded);
        sig = web3.eth.accounts.sign(hash, signerPrivateKey);
        await expectRevert(
            this.claimRewards.claim(index, amount, expireAt, sig.signature, { from: user1 }),
            "claim too frequency"
        );

        await time.increase(time.duration.hours(23));
        await time.increase(time.duration.seconds(1));
        await this.claimRewards.claim(index, amount, expireAt, sig.signature, { from: user1 });
    });

    it('when setSigner should be ok', async function () {
        await this.claimRewards.setSigner(signer, { from: owner });
        expect(await this.claimRewards.signer()).to.equal(signer);
        await expectRevert(
            this.claimRewards.setSigner(signer, { from: user1 }),
            "caller is not the owner"
        );
    });

});

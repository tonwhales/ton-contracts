import * as fs from 'fs';
import { toNano, TonClient } from 'ton';
import { awaitBalance } from 'ton/dist/tests/awaitBalance';
import { BN } from 'bn.js';
import { createWalletKey } from './tests/createWalletKey';
import { delay } from '@openland/patterns';
import { ValidatorControllerSource } from './ValidatorControllerSource';
import { topUpAddress } from './tests/topUpAddress';
import { awaitSeqno } from './tests/awaitSeqno';

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

async function createNewWallets() {
    let masterKey = await createWalletKey();
    let restrictedKey = await createWalletKey();

    // Wallet that is allowed only for non-restricted key
    let foreignWallet = await client.createNewWallet({ workchain: 0 });

    // Whitelisted wallet key
    let whitelistedWallet = await client.createNewWallet({ workchain: 0 });

    // Create wallet
    const wallet = await client.openWalletFromCustomContract(ValidatorControllerSource.create({
        masterKey: masterKey.publicKey,
        restrictedKey: restrictedKey.publicKey,
        workchain: 0,
        whitelistedAddress: whitelistedWallet.wallet.address
    }));

    console.warn('Created wallet ' + wallet.address.toFriendly());

    // Top up contract
    await topUpAddress(client, wallet.address, toNano(0.1));

    return {
        wallet,
        masterKey,
        restrictedKey,
        whitelistedWallet,
        foreignWallet
    }
}

describe('ValidatorController', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/validator-controller.cell');
        expect(ValidatorControllerSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should backup and restore', async () => {
        let masterKey = await createWalletKey();
        let restrictedKey = await createWalletKey();

        // Whitelisted wallet key
        let whitelistedWallet = await client.createNewWallet({ workchain: 0 });

        const wallet = ValidatorControllerSource.create({
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            workchain: 0,
            whitelistedAddress: whitelistedWallet.wallet.address
        });

        let backup = wallet.backup();
        ValidatorControllerSource.restore(backup);
        ValidatorControllerSource.restore(backup);
        ValidatorControllerSource.restore(backup);
    });

    it('should transfer via master key', async () => {
        let state = await createNewWallets();

        // Transfer to whitelisted to init
        expect(await state.wallet.getSeqNo()).toBe(0);
        await state.wallet.transfer({
            seqno: 0,
            to: state.foreignWallet.wallet.address,
            value: toNano(0.001),
            secretKey: state.masterKey.secretKey,
            bounce: false
        });
        await awaitBalance(client, state.foreignWallet.wallet.address, new BN(0));

        // Check balances
        expect((await client.getBalance(state.wallet.address)).toNumber()).toBeGreaterThan(0);
        expect((await client.getBalance(state.foreignWallet.wallet.address)).toNumber()).toBeGreaterThan(0);

        // Check cooldown
        let cooldown = parseInt((await client.callGetMethod(state.wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBeGreaterThan(0);
    }, 120000);

    it('should transfer via restricted key to whitelisted', async () => {
        let state = await createNewWallets();
        expect(await state.wallet.getSeqNo()).toBe(0);
        await state.wallet.transfer({
            seqno: 0,
            to: state.whitelistedWallet.wallet.address,
            value: toNano(0.001),
            secretKey: state.restrictedKey.secretKey,
            bounce: true, // Required
            payload: Buffer.from([0x52, 0x67, 0x43, 0x70]) // Required
        });
        await awaitSeqno(state.wallet, 1);
        let cooldown = parseInt((await client.callGetMethod(state.wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBeGreaterThan(0);
    }, 120000);

    it('should NOT transfer via restricted key to whitelisted if payload is invalid', async () => {
        let state = await createNewWallets();
        expect(await state.wallet.getSeqNo()).toBe(0);
        await state.wallet.transfer({
            seqno: 0,
            to: state.whitelistedWallet.wallet.address,
            value: toNano(0.001),
            secretKey: state.restrictedKey.secretKey,
            bounce: true
        });
        await expect(awaitSeqno(state.wallet, 1)).rejects.toThrowError();
    }, 120000);

    it('should NOT transfer via restricted key to whitelisted if bounce is invalid', async () => {
        let state = await createNewWallets();
        expect(await state.wallet.getSeqNo()).toBe(0);
        await state.wallet.transfer({
            seqno: 0,
            to: state.whitelistedWallet.wallet.address,
            value: toNano(0.001),
            secretKey: state.restrictedKey.secretKey,
            bounce: false, // Invalid value
            payload: Buffer.from([0x52, 0x67, 0x43, 0x70]) // Required
        });
        await expect(awaitSeqno(state.wallet, 1)).rejects.toThrowError();
    }, 120000);

    // it('should work', async () => {



    //     // Whitelisted wallet key
    //     let whitelistedWallet = await client.createNewWallet({ workchain: 0 });

    //     // Wallet that is allowed only for non-restricted key
    //     let foreignWallet = await client.createNewWallet({ workchain: 0 });

    //     // Wallet Keys
    //     let masterKey = await createWalletKey();
    //     let invalidKey = await createWalletKey();
    //     let restrictedKey = await createWalletKey();

    //     // Wallet
    //     const wallet = await client.openWalletFromCustomContract(ValidatorControllerSource.create({
    //         masterKey: masterKey.publicKey,
    //         restrictedKey: restrictedKey.publicKey,
    //         workchain: 0,
    //         whitelistedAddress: whitelistedWallet.wallet.address
    //     }));

    //     // Requirements
    //     expect((await client.getBalance(wallet.address)).toNumber()).toBe(0);
    //     expect((await client.getBalance(whitelistedWallet.wallet.address)).toNumber()).toBe(0);

    //     // Fill wallet
    //     await topUpAddress(client, wallet.address, toNano(0.1));

    //     // Send transfer via master key
    //     expect(await wallet.getSeqNo()).toBe(0);
    //     await wallet.transfer({
    //         seqno: 0,
    //         to: foreignWallet.wallet.address,
    //         value: toNano(0.001),
    //         secretKey: masterKey.secretKey,
    //         bounce: false
    //     });
    //     await awaitBalance(client, foreignWallet.wallet.address, new BN(0));
    //     let cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
    //     expect(cooldown).toBeGreaterThan(0);

    //     // Send transfer via invalid key
    //     expect(await wallet.getSeqNo()).toBe(1);
    //     let initial = await client.getBalance(wallet.address);
    //     await wallet.transfer({
    //         seqno: 1,
    //         to: whitelistedWallet.wallet.address,
    //         value: toNano(0.002),
    //         secretKey: invalidKey.secretKey,
    //         bounce: false
    //     });
    //     await delay(15000);
    //     expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);
    //     cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
    //     expect(cooldown).toBe(0);

    //     // Send transfer via restireted key to non-whitelisted
    //     expect(await wallet.getSeqNo()).toBe(1);
    //     initial = await client.getBalance(wallet.address);
    //     await wallet.transfer({
    //         seqno: 1,
    //         to: foreignWallet.wallet.address,
    //         value: toNano(0.003),
    //         secretKey: restrictedKey.secretKey,
    //         bounce: false
    //     });
    //     await delay(15000);
    //     expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);
    //     cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
    //     expect(cooldown).toBe(0);

    //     // Result seqno
    //     expect(await wallet.getSeqNo()).toBe(1);

    //     // Send transfer via restricted key
    //     expect(await wallet.getSeqNo()).toBe(1);
    //     await wallet.transfer({
    //         seqno: 1,
    //         to: whitelistedWallet.wallet.address,
    //         value: toNano(0.004),
    //         secretKey: restrictedKey.secretKey,
    //         bounce: false
    //     });
    //     await awaitBalance(client, whitelistedWallet.wallet.address, new BN(0));
    //     cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
    //     await delay(5000); // Race condition?
    //     expect(cooldown).toBeGreaterThan(0);

    //     // If sent too often it must be ignored
    //     initial = await client.getBalance(whitelistedWallet.wallet.address);
    //     expect(await wallet.getSeqNo()).toBe(2);
    //     await wallet.transfer({
    //         seqno: 2,
    //         to: whitelistedWallet.wallet.address,
    //         value: toNano(0.005),
    //         secretKey: restrictedKey.secretKey,
    //         bounce: false
    //     });
    //     await delay(15000);
    //     expect((await client.getBalance(whitelistedWallet.wallet.address)).eq(initial)).toBe(true);
    //     cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
    //     expect(cooldown).toBeGreaterThan(0);
    // }, 120000);
});
import * as fs from 'fs';
import { toNano, TonClient } from 'ton';
import { openTestTreasure } from 'ton/dist/tests/openTestTreasure';
import { awaitBalance } from 'ton/dist/tests/awaitBalance';
import { BN } from 'bn.js';
import { createWalletKey } from './tests/createWalletKey';
import { delay } from '@openland/patterns';
import { WhitelistedWalletSource } from '..';

describe('WhitelistedWallet', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/whitelisted-wallet.cell');
        expect(WhitelistedWalletSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should work', async () => {
        const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

        // Open Treasure
        let treasure = await openTestTreasure(client);

        // Whitelisted wallet key
        let whitelistedWallet = await client.createNewWallet({ workchain: 0 });

        // Wallet that is allowed only for non-restricted key
        let foreignWallet = await client.createNewWallet({ workchain: 0 });

        // Wallet Keys
        let masterKey = await createWalletKey();
        let invalidKey = await createWalletKey();
        let restrictedKey = await createWalletKey();

        // Wallet
        const wallet = await client.openWalletFromCustomContract(WhitelistedWalletSource.create({
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            workchain: 0,
            whitelistedAddress: whitelistedWallet.wallet.address
        }));

        // Requirements
        expect((await client.getBalance(wallet.address)).toNumber()).toBe(0);
        expect((await client.getBalance(whitelistedWallet.wallet.address)).toNumber()).toBe(0);

        // Fill wallet
        const seqno = await treasure.wallet.getSeqNo();
        await treasure.wallet.transfer({
            to: wallet.address,
            seqno: seqno,
            bounce: false,
            value: toNano(0.1),
            secretKey: treasure.secretKey
        });
        await awaitBalance(client, wallet.address, new BN(0));

        // Send transfer via master key
        expect(await wallet.getSeqNo()).toBe(0);
        await wallet.transfer({
            seqno: 0,
            to: foreignWallet.wallet.address,
            value: toNano(0.001),
            secretKey: masterKey.secretKey,
            bounce: false
        });
        await awaitBalance(client, foreignWallet.wallet.address, new BN(0));
        let cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBe(0);

        // Send transfer via invalid key
        expect(await wallet.getSeqNo()).toBe(1);
        let initial = await client.getBalance(wallet.address);
        await wallet.transfer({
            seqno: 1,
            to: whitelistedWallet.wallet.address,
            value: toNano(0.002),
            secretKey: invalidKey.secretKey,
            bounce: false
        });
        await delay(15000);
        expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);
        cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBe(0);

        // Send transfer via restireted key to non-whitelisted
        expect(await wallet.getSeqNo()).toBe(1);
        initial = await client.getBalance(wallet.address);
        await wallet.transfer({
            seqno: 1,
            to: foreignWallet.wallet.address,
            value: toNano(0.003),
            secretKey: restrictedKey.secretKey,
            bounce: false
        });
        await delay(15000);
        expect((await client.getBalance(wallet.address)).eq(initial)).toBe(true);
        cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBe(0);

        // Result seqno
        expect(await wallet.getSeqNo()).toBe(1);

        // Send transfer via restricted key
        expect(await wallet.getSeqNo()).toBe(1);
        await wallet.transfer({
            seqno: 1,
            to: whitelistedWallet.wallet.address,
            value: toNano(0.004),
            secretKey: restrictedKey.secretKey,
            bounce: false
        });
        await awaitBalance(client, whitelistedWallet.wallet.address, new BN(0));
        cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        await delay(5000); // Race condition?
        expect(cooldown).toBeGreaterThan(0);

        // If sent too often it must be ignored
        initial = await client.getBalance(whitelistedWallet.wallet.address);
        expect(await wallet.getSeqNo()).toBe(2);
        await wallet.transfer({
            seqno: 2,
            to: whitelistedWallet.wallet.address,
            value: toNano(0.005),
            secretKey: restrictedKey.secretKey,
            bounce: false
        });
        await delay(15000);
        expect((await client.getBalance(whitelistedWallet.wallet.address)).eq(initial)).toBe(true);
        cooldown = parseInt((await client.callGetMethod(wallet.address, 'restricted_cooldown')).stack[0][1], 16);
        expect(cooldown).toBeGreaterThan(0);
    }, 120000);
});
import { SendMode, toNano, TonClient } from "ton";
import { NominatorPoolSource } from "./NominatorPoolSource";
import * as fs from 'fs';
import { NominatorPool } from "./NominatorPool";
import { topUpAddress } from "./tests/topUpAddress";
import { awaitCondition } from "ton/dist/tests/awaitCondition";
import { awaitSeqno } from "./tests/awaitSeqno";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('NominatorPool', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/nominator-pool.cell');
        expect(NominatorPoolSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should accept stake', async () => {

        // Create wallet
        let ownerWallet = await client.createNewWallet({ workchain: 0 });

        // Create pool
        const pool = await NominatorPool.create(client, NominatorPoolSource.create({ owner: ownerWallet.wallet.address, workchain: 0 }));
        console.warn('Deploying to ' + pool.address.toFriendly());
        await topUpAddress(client, pool.address, toNano(1));
        await pool.deploy();
        await awaitCondition(10000, () => client.isContractDeployed(pool.address));
        await pool.getNominatorsList();

        // Create nominator wallet
        let nominatorWallet = await client.createNewWallet({ workchain: 0 });
        console.warn('Creating wallet ' + nominatorWallet.wallet.address.toFriendly());
        await topUpAddress(client, nominatorWallet.wallet.address, toNano(3));

        // Send stake
        console.warn('Sending stake...');
        await nominatorWallet.wallet.transfer({
            seqno: 0,
            to: pool.address,
            bounce: true,
            payload: 'stake',
            sendMode: SendMode.PAY_GAS_SEPARATLY | SendMode.IGNORE_ERRORS,
            value: toNano(2),
            secretKey: nominatorWallet.key.secretKey
        });
        await awaitSeqno(nominatorWallet.wallet, 1);
        await pool.getNominatorsList();

        // Checking nominators
    }, 120000);
});
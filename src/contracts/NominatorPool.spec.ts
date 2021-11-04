import { toNano, TonClient } from "ton";
import { NominatorPoolSource } from "./NominatorPoolSource";
import * as fs from 'fs';
import { NominatorPool } from "./NominatorPool";
import { topUpAddress } from "./tests/topUpAddress";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('NominatorPool', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/nominator-pool.cell');
        expect(NominatorPoolSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
    it('should accept stake', async () => {
        let ownerWallet = await client.createNewWallet({ workchain: 0 });
        const pool = await NominatorPool.create(client, NominatorPoolSource.create({ owner: ownerWallet.wallet.address, workchain: 0 }));
        await topUpAddress(client, pool.address, toNano(1));
        await pool.deploy();
        console.warn('Deployed to ' + pool.address.toFriendly());
    }, 120000);
});
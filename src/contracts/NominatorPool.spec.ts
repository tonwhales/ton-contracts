import { TonClient } from "ton";
import { NominatorPoolSource } from "./NominatorPoolSource";
import * as fs from 'fs';

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });

describe('NominatorPool', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/nominator-pool.cell');
        expect(NominatorPoolSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
});
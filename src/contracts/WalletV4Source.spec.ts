import * as fs from 'fs';
import { WalletV4Source } from './WalletV4Source';

describe('WalletV4Source', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/wallet-v4.cell');
        expect(WalletV4Source.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
});
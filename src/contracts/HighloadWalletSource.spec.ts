import * as fs from 'fs';
import { HighloadWalletSource } from './HighloadWalletSource';

describe('HighloadWalletSource', () => {
    it('should conform to sources', () => {
        let source = fs.readFileSync(__dirname + '/../../contracts/highload-wallet.cell');
        expect(HighloadWalletSource.SOURCE.toString('base64')).toEqual(source.toString('base64'));
    });
});
import * as fs from 'fs';
describe('simple-wallet-code', () => {
    it('should work', () => {
        let source = fs.readFileSync(__dirname + '/simple-wallet-code.cell');
        console.warn(source.toString('hex'));
    });
});
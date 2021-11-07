import { Address, Cell, TonClient } from "ton";
import { PowGiverContract } from "..";

const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
const address = Address.parse('kf-kkdY_B7p-77TLn2hUhM6QidWrrsl8FYWCIvBMpZKprBtN');

describe('PowGiverContract', () => {
    it('should get resulsts', async () => {
        let contract = await PowGiverContract.create(address, client);
        let powParams = await contract.getPowParams();
        let contractState = await client.getContractState(address);
        let stateBoc = Cell.fromBoc(contractState.data!)[0];
        let powParams2 = await PowGiverContract.extractPowParamsFromState(stateBoc);
        expect(powParams2.seed.equals(powParams.seed)).toBe(true);
        expect(powParams2.complexity.equals(powParams.complexity)).toBe(true);
    });
    it('should create mining message', async () => {
        let goldenMessage = Buffer.from('te6cckEBAgEAoQABRYn+60cGmp15E/BYb2BjW+nJxNPzCJuqiqGX5SoOin0HYkQMAQDyTWluZQBhh6Dsg9/VUuY3KbRy/LzIxF68xmkXAlWLaOx1J+G6QDoPMaiE5Zx20ujtiB/iVncNL1B+7Bkm+Snqt135M09CtadvM5Av3y3C82L1CWZeoeat+DWE5Zx20ujtiB/iVncNL1B+7Bkm+Snqt135M09CtadvMzU5dJw=', 'base64');
        let goldenRandom = Buffer.from('hOWcdtLo7Ygf4lZ3DS9QfuwZJvkp6rdd+TNPQrWnbzM=', 'base64');
        let goldenSeed = Buffer.from('kC/fLcLzYvUJZl6h5q34NQ==', 'base64');
        let msg = PowGiverContract.createMiningMessage({
            giver: Address.parse('Ef91o4NNTryJ-Cw3sDGt9OTiafmETdVFUMvylQdFPoOxInls'),
            wallet: Address.parse('EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'),
            seed: goldenSeed,
            random: goldenRandom,
            expiresSec: 1636278508
        });
        let msgCell = new Cell();
        msg.writeTo(msgCell);
        let msgData = await msgCell.toBoc({ idx: false });
        expect(msgData).toEqual(goldenMessage)
    });
});
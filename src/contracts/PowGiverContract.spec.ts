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

    it('should check mining result', async () => {

        // Job Header
        const jobGolden = '00f24d696e650061924828ec6ba8bcd7efd927adc218224663fbde7a79c52dd98c524adf9e40ebef5eaf7465ab1bde2ba1fd575f2b4e46cda7f94e32f2581438655f68a51ce3da976606383da0cb38cc79a0e71ced1fa24507ee4665ab1bde2ba1fd575f2b4e46cda7f94e32f2581438655f68a51ce3da97660638';
        const job = PowGiverContract.createMiningJob({
            seed: Buffer.from('3da0cb38cc79a0e71ced1fa24507ee46', 'hex'),
            random: Buffer.from('65ab1bde2ba1fd575f2b4e46cda7f94e32f2581438655f68a51ce3da97660638', 'hex'),
            wallet: Address.parse('EQDsa6i81-_ZJ63CGCJGY_veennFLdmMUkrfnkDr716vdKQe'),
            expiresSec: 1636976680
        });
        expect(job.equals(Buffer.from(jobGolden, 'hex'))).toBe(true);

        // Job hash
        let res = await PowGiverContract.checkMiningJobHash({
            seed: Buffer.from('3da0cb38cc79a0e71ced1fa24507ee46', 'hex'),
            random: Buffer.from('65ab1bde2ba1fd575f2b4e46cda7f94e32f2581438655f68a51ce3da97660638', 'hex'),
            wallet: Address.parse('EQDsa6i81-_ZJ63CGCJGY_veennFLdmMUkrfnkDr716vdKQe'),
            expiresSec: 1636976680,
            hash: Buffer.from('000000004af928f224d716cf812cff6f5322be1e7f76532d919fd74beb676363', 'hex')
        });
        expect(res).toBe(true);
    });
});
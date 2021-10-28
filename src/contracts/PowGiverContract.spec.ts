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
});
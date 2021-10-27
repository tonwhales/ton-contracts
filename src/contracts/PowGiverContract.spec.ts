import { Address, TonClient } from "ton";
import { PowGiverContract } from "..";

const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });

describe('PowGiverContract', () => {
    it('should get resulsts', async () => {
        let contract = await PowGiverContract.create(Address.parse('kf-kkdY_B7p-77TLn2hUhM6QidWrrsl8FYWCIvBMpZKprBtN'), client);
        await contract.getPowParams();
    });
});
import { Address, TonClient } from "ton";
import { ElectorContract } from "./ElectorContract";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
const contract = new ElectorContract(client);

describe('ElectorContract', () => {
    it('should get past elections', async () => {
        await contract.getPastElectionsIDs();
    });
    it('should fetch election entities', async () => {
        await contract.getElectionEntities();
    });
    it('should fetch returned stake', async () => {
        await contract.getReturnedStake(Address.parseFriendly('Ef_1g5xkp8asoCQkFwJ7y3lLBo2iUvx3mOuWMQYctltIPj1e').address);
    });
});
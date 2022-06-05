import { Address, ADNLAddress, TonClient, TonClient4 } from "ton";
import { ElectorContract4 } from "./ElectorContract4";

const client = new TonClient4({ endpoint: 'https://mainnet-v4.tonhubapi.com' });
const contract = new ElectorContract4(client);
jest.setTimeout(1000000);

describe('ElectorContract4', () => {
    it('should get past elections', async () => {
        let res = await contract.getReturnedStake(21075200, Address.parse('Ef9rv7vMHMq9m8YZ3zDF3sKys732B-E5H1_xMgpiRdleVzmz'));
        expect(res.toString(10)).toEqual('0');

        res = await contract.getReturnedStake(21073110, Address.parse('Ef9rv7vMHMq9m8YZ3zDF3sKys732B-E5H1_xMgpiRdleVzmz'));
        expect(res.toString(10)).toEqual('0');
    });

    it('should fetch past elections list', async () => {
        await contract.getPastElectionsList(21075200);
        await contract.getPastElectionsList(20075200);
    });

    it('should fetch past elections', async () => {
        await contract.getPastElections(21075200);
        await contract.getPastElections(20075200);
    });

    it('should fetch active election id', async () => {
        expect(await contract.getActiveElectionId(21073110)).toBe(1654389267);
        expect(await contract.getActiveElectionId(21005200)).toBeNull();
    });

    it('should parse complaints', async () => {
        const complaints = require('./tests/complaints.json');
        ElectorContract4.parseComplaints(complaints.stack);
    });
});
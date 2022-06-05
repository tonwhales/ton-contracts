import { BN } from "bn.js";
import { Address, TonClient4 } from "ton";
import { ElectorContract4 } from "./ElectorContract4";

const client = new TonClient4({ endpoint: 'https://mainnet-v4.tonhubapi.com' });
const contract = new ElectorContract4(client);
jest.setTimeout(1000000);

describe('ElectorContract4', () => {
    it('should get past elections', async () => {

        let addr = new Address(-1, Buffer.from(new BN('98643043610355517854790079025732586688729640222420037925212465871167542461978', 10).toString('hex', 32), 'hex'));
        let res = await contract.getReturnedStake(21075200, addr);
        expect(res.toString(10)).toEqual('51448279109456');

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

    it('should fetch election entities', async () => {
        await contract.getElectionEntities(21073410);
    });

    it('should fetch active election id', async () => {
        expect(await contract.getActiveElectionId(21073110)).toBe(1654389267);
        expect(await contract.getActiveElectionId(21005200)).toBeNull();
    });
});
import { Address, TonClient } from "ton";
import { ElectorContract } from "./ElectorContract";

const client = new TonClient({ endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC' });
const contract = new ElectorContract(client);

describe('ElectorContract', () => {
    it('should get past elections', async () => {
        await contract.getPastElectionsList();
        await contract.getPastElections();
    });
    it('should fetch election entities', async () => {
        await contract.getElectionEntities();
    });
    it('should fetch returned stake', async () => {
        await contract.getReturnedStake(Address.parseFriendly('Ef_1g5xkp8asoCQkFwJ7y3lLBo2iUvx3mOuWMQYctltIPj1e').address);
    });
    it('should create participant request', () => {

        //
        // From official docs
        //
        // # fift -s validator-elect-req.fif kf-vF9tD9Atqok5yA6n4yGUjEMiMElBi0RKf6IPqob1nY2dP 1567633899 2.7 C5C2B94529405FB07D1DDFB4C42BFB07727E7BA07006B2DB569FBF23060B9E5C
        //
        // Creating a request to participate in validator elections at time 1567633899 from smart contract Uf+vF9tD9Atqok5yA6n4yGUjEMiMElBi0RKf6IPqob1nY4EA = -1:af17db43f40b6aa24e7203a9f8c8652310c88c125062d1129fe883eaa1bd6763  with maximal stake factor with respect to the minimal stake 176947/65536 and validator ADNL address c5c2b94529405fb07d1ddfb4c42bfb07727e7ba07006b2db569fbf23060b9e5c 
        // 654C50745D7031EB0002B333AF17DB43F40B6AA24E7203A9F8C8652310C88C125062D1129FE883EAA1BD6763C5C2B94529405FB07D1DDFB4C42BFB07727E7BA07006B2DB569FBF23060B9E5C
        // ZUxQdF1wMesAArMzrxfbQ_QLaqJOcgOp-MhlIxDIjBJQYtESn-iD6qG9Z2PFwrlFKUBfsH0d37TEK_sHcn57oHAGsttWn78jBgueXA==
        // Saved to file validator-to-sign.bin

        const address = Address.parse('kf-vF9tD9Atqok5yA6n4yGUjEMiMElBi0RKf6IPqob1nY2dP');
        const time = 1567633899;
        const factor = 2.7;
        const adnl = Buffer.from('C5C2B94529405FB07D1DDFB4C42BFB07727E7BA07006B2DB569FBF23060B9E5C', 'hex');
        const sample = Buffer.from('ZUxQdF1wMesAArMzrxfbQ_QLaqJOcgOp-MhlIxDIjBJQYtESn-iD6qG9Z2PFwrlFKUBfsH0d37TEK_sHcn57oHAGsttWn78jBgueXA==', 'base64');
        const request = ElectorContract.createElectionRequest({ validator: address, electionTime: time, maxFactor: factor, adnlAddress: adnl });
        expect(request.equals(sample)).toBe(true);
    });

    it('should sign participant request', () => {
        const address = Address.parse('kf-vF9tD9Atqok5yA6n4yGUjEMiMElBi0RKf6IPqob1nY2dP');
        const time = 1567633899;
        const factor = 2.7;
    });
});
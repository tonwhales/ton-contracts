import BN from "bn.js";
import { Address, ADNLAddress, BitString, Cell, CellMessage, Contract, ContractSource, Message, parseDict, RawMessage, TonClient, UnknownContractSource } from "ton";
import { sign, signVerify } from "ton-crypto";

export class ElectorContract implements Contract {


    /**
     * Create election request message to be signed
     */
    static createElectionRequest(args: {
        validator: Address,
        electionTime: number,
        maxFactor: number,
        adnlAddress: ADNLAddress
    }) {
        if (args.validator.workChain !== -1) {
            throw Error('Only masterchain could participate in elections');
        }

        const res = BitString.alloc(1024);
        res.writeBuffer(Buffer.from('654c5074', 'hex'));
        res.writeUint(args.electionTime, 32);
        res.writeUint(Math.floor(args.maxFactor * 65536), 32);
        res.writeBuffer(args.validator.hash);
        res.writeBuffer(args.adnlAddress.address);
        return res.getTopUppedArray();
    }

    /**
     * Signing election request
     */
    static signElectionRequest(args: {
        request: Buffer,
        key: Buffer
    }) {
        return sign(args.request, args.key);
    }

    /**
     * Create election request message
     */
    static createElectionRequestSigned(args: {
        validator: Address,
        electionTime: number,
        maxFactor: number,
        adnlAddress: ADNLAddress,
        publicKey: Buffer,
        signature: Buffer,
        queryId: BN
    }): Message {
        const request = ElectorContract.createElectionRequest({ validator: args.validator, electionTime: args.electionTime, maxFactor: args.maxFactor, adnlAddress: args.adnlAddress });
        if (!signVerify(request, args.signature, args.publicKey)) {
            throw Error('Invalid signature');
        }
        const cell = new Cell();
        cell.bits.writeBuffer(Buffer.from('4e73744b', 'hex'));
        cell.bits.writeUint(args.queryId, 64);
        cell.bits.writeBuffer(args.publicKey);
        cell.bits.writeUint(args.electionTime, 32);
        cell.bits.writeUint(Math.floor(args.maxFactor * 65536), 32);
        cell.bits.writeBuffer(args.adnlAddress.address);
        const sig = new Cell();
        sig.bits.writeBuffer(args.signature);
        cell.refs.push(sig);
        return new CellMessage(cell);
    }

    /**
     * Create recover stake message
     */
    static createRecoverStakeMessage(args: { queryId: BN }) {
        const res = BitString.alloc(1024);
        res.writeBuffer(Buffer.from('47657424', 'hex'));
        res.writeUint(args.queryId, 64);
        return res.getTopUppedArray();
    }

    /**
     * Parsing complaints
     * @param src source object
     */
    static parseComplaints(src: any[]) {
        let data = src[0][1].elements;
        let results: {
            id: BN,
            publicKey: Buffer,
            createdAt: number,
            severity: number,
            paid: BN,
            suggestedFine: BN,
            suggestedFinePart: BN,
            rewardAddress: Address,
            votes: number[],
            remainingWeight: BN,
            vsetId: BN
        }[] = [];
        for (let record of data) {
            let elements = record.tuple.elements;
            let id = new BN(elements[0].number.number as string, 10);
            let complaint = elements[1].tuple.elements[0].tuple.elements;
            let votersList = elements[1].tuple.elements[1].list.elements;
            let vsetIdRaw = elements[1].tuple.elements[2];
            let weightRemaining = elements[1].tuple.elements[3];

            let publicKeyRaw = new BN(complaint[0].number.number, 10).toString('hex');
            while (publicKeyRaw.length < 64) {
                publicKeyRaw = '0' + publicKeyRaw;
            }
            let publicKey = Buffer.from(publicKeyRaw, 'hex');
            let description = Cell.fromBoc(Buffer.from(complaint[1].cell.bytes, 'base64'))[0];
            let createdAt = parseInt(complaint[2].number.number, 10);
            let severity = parseInt(complaint[3].number.number, 10);
            let rewardAddressRaw = new BN(complaint[4].number.number, 10).toString('hex');
            while (rewardAddressRaw.length < 64) {
                rewardAddressRaw = '0' + rewardAddressRaw;
            }
            let rewardAddress = new Address(-1, Buffer.from(rewardAddressRaw, 'hex'));
            let paid = new BN(complaint[5].number.number, 10);
            let suggestedFine = new BN(complaint[6].number.number, 10);
            let suggestedFinePart = new BN(complaint[7].number.number, 10);

            let votes: number[] = [];
            for (let v of votersList) {
                votes.push(parseInt(v.number.number, 10));
            }

            let remainingWeight = new BN(weightRemaining.number.number, 10);
            let vsetId = new BN(vsetIdRaw.number.number, 10);

            results.push({
                id,
                publicKey,
                createdAt,
                severity,
                paid,
                suggestedFine,
                suggestedFinePart,
                rewardAddress,
                votes,
                remainingWeight,
                vsetId
            });
        }
        return results;
    }

    // Please note that we are NOT loading address from config to avoid mistake and send validator money to a wrong contract
    readonly address: Address = Address.parseRaw('-1:3333333333333333333333333333333333333333333333333333333333333333');
    readonly source: ContractSource = new UnknownContractSource('org.ton.elector', -1, 'Elector Contract');
    private readonly client: TonClient;

    constructor(client: TonClient) {
        this.client = client;
    }

    async getReturnedStake(addres: Address) {
        if (addres.workChain !== -1) {
            throw Error('Only masterchain addresses could have stake');
        }
        let res = await this.client.callGetMethod(this.address, 'compute_returned_stake', [["num", "0x" + addres.hash.toString('hex')]]);
        if (res.stack[0][0] !== 'num') {
            throw Error('Invalid response');
        }
        let stake = res.stack[0][1] as string;
        if (!stake.startsWith('0x')) {
            throw Error('Invalid response');
        }
        return new BN(stake.slice(2), 'hex');
    }

    async getPastElectionsList() {
        let res = await this.client.callGetMethod(this.address, 'past_elections_list');
        let list = res.stack[0][1].elements;
        let elections: { id: number, unfreezeAt: number, stakeHeld: number }[] = [];
        for (let el of list) {
            let elect = el.tuple.elements;
            let id = new BN(elect[0].number.number).toNumber();
            let unfreezeAt = new BN(elect[1].number.number).toNumber();
            let stakeHeld = new BN(elect[3].number.number).toNumber();
            elections.push({ id, unfreezeAt, stakeHeld });
        }
        return elections;
    }


    async getPastElections() {
        let res = await this.client.callGetMethod(this.address, 'past_elections');
        let list = res.stack[0][1].elements;
        let elections: { id: number, unfreezeAt: number, stakeHeld: number, totalStake: BN, bonuses: BN, frozen: Map<string, { address: Address, weight: BN, stake: BN }> }[] = [];
        for (let el of list) {
            let elect = el.tuple.elements;
            let id = new BN(elect[0].number.number).toNumber();
            let unfreezeAt = new BN(elect[1].number.number).toNumber();
            let stakeHeld = new BN(elect[2].number.number).toNumber();
            let totalStake = new BN(elect[5].number.number);
            let bonuses = new BN(elect[6].number.number);
            let frozenDict = Cell.fromBoc(Buffer.from(elect[4].cell.bytes, 'base64'))[0];
            let frozen = parseDict(frozenDict.beginParse(), 256, (slice) => {
                let address = new Address(-1, slice.readBuffer(32));
                let weight = slice.readUint(64);
                let stake = slice.readCoins();
                return {
                    address,
                    weight,
                    stake
                };
            });
            elections.push({ id, unfreezeAt, stakeHeld, totalStake, bonuses, frozen });
        }
        return elections;
    }

    async getElectionEntities() {
        let res = await this.client.callGetMethod(this.address, 'participant_list_extended');
        let startWorkTime = parseInt(res.stack[0][1], 16);
        let endElectionsTime = parseInt(res.stack[1][1], 16);
        let minStake = parseInt(res.stack[2][1], 16);
        let allStakes = parseInt(res.stack[3][1], 16);
        let electionEntries = res.stack[4][1].elements;
        let entities: { pubkey: Buffer, stake: BN, address: Address, adnl: Buffer }[] = [];
        for (let e of electionEntries) {
            let pubkey = Buffer.from(new BN(e.tuple.elements[0].number.number).toString('hex'), 'hex');
            let stake = new BN(e.tuple.elements[1].tuple.elements[0].number.number);
            let addrraw = new BN(e.tuple.elements[1].tuple.elements[2].number.number).toString('hex');
            while (addrraw.length < 64) {
                addrraw = '0' + addrraw;
            }
            let address = new Address(-1, Buffer.from(addrraw, 'hex'));
            let adnl = Buffer.from(new BN(e.tuple.elements[1].tuple.elements[3].number.number).toString('hex'), 'hex');
            entities.push({ pubkey, stake: stake, address, adnl });
        }
        return { minStake, allStakes, endElectionsTime, startWorkTime, entities };
    }

    async getActiveElectionId() {
        let res = await this.client.callGetMethod(this.address, 'active_election_id');
        let id = parseInt(res.stack[0][1], 16);
        return id > 0 ? id : null;
    }

    async getComplaints(electionId: number) {
        let res = await this.client.callGetMethod(this.address, 'list_complaints', [['num', electionId]]);
        return ElectorContract.parseComplaints(res.stack);
    }
}
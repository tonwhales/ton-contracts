import BN from "bn.js";
import { Address, ADNLAddress, BitString, Cell, CellMessage, Contract, ContractSource, Message, parseDict, TonClient4, TupleSlice4, UnknownContractSource } from "ton";
import { sign, signVerify } from "ton-crypto";

export class ElectorContract4 implements Contract {


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
        const request = ElectorContract4.createElectionRequest({ validator: args.validator, electionTime: args.electionTime, maxFactor: args.maxFactor, adnlAddress: args.adnlAddress });
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
    private readonly client: TonClient4;

    constructor(client: TonClient4) {
        this.client = client;
    }

    async getReturnedStake(block: number, address: Address) {
        if (address.workChain !== -1) {
            throw Error('Only masterchain addresses could have stake');
        }
        let res = await this.client.runMethod(block, this.address, 'compute_returned_stake', [{ type: 'int', value: new BN(address.hash.toString('hex'), 'hex') }]);
        if (res.exitCode !== 0 && res.exitCode !== 1) {
            throw Error('Exit code: ' + res.exitCode);
        }
        let tuple = new TupleSlice4(res.result);
        return tuple.readBigNumber();
    }

    async getPastElectionsList(block: number) {
        let res = await this.client.runMethod(block, this.address, 'past_elections_list');
        if (res.exitCode !== 0 && res.exitCode !== 1) {
            throw Error('Exit code: ' + res.exitCode);
        }
        let tuple = new TupleSlice4(res.result);
        tuple = tuple.readTuple();
        let count = tuple.remaining - 1;

        let elections: { id: number, unfreezeAt: number, stakeHeld: number }[] = [];
        for (let i = 0; i < count; i++) {
            let v = tuple.readTuple();
            let id = v.readNumber();
            let unfreezeAt = v.readNumber();
            v.pop(); // Ignore
            let stakeHeld = v.readNumber();
            elections.push({ id, unfreezeAt, stakeHeld });
        }
        return elections;
    }

    async getPastElections(block: number) {
        let res = await this.client.runMethod(block, this.address, 'past_elections');
        if (res.exitCode !== 0 && res.exitCode !== 1) {
            throw Error('Exit code: ' + res.exitCode);
        }
        let tuple = new TupleSlice4(res.result);
        tuple = tuple.readTuple();
        let count = tuple.remaining - 1;
        let elections: { id: number, unfreezeAt: number, stakeHeld: number, totalStake: BN, bonuses: BN, frozen: Map<string, { address: Address, weight: BN, stake: BN }> }[] = [];
        for (let i = 0; i < count; i++) {
            let v = tuple.readTuple();
            let id = v.readNumber();
            let unfreezeAt = v.readNumber();
            let stakeHeld = v.readNumber();
            v.pop(); // Ignore
            let frozenDict = v.readCell();
            let totalStake = v.readBigNumber();
            let bonuses = v.readBigNumber();
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

    async getElectionEntities(block: number) {

        //
        // NOTE: this method doesn't call get method since for some reason it doesn't work
        //

        let account = await this.client.getAccount(block, this.address);
        if (account.account.state.type !== 'active') {
            throw Error('Unexpected error');
        }

        let cell = Cell.fromBoc(Buffer.from(account.account.state.data, 'base64'))[0];
        let cs = cell.beginParse();
        if (!cs.readBit()) {
            return null;
        }
        // (es~load_uint(32), es~load_uint(32), es~load_grams(), es~load_grams(), es~load_dict(), es~load_int(1), es~load_int(1));
        let sc = cs.readRef();
        let startWorkTime = sc.readUintNumber(32);
        let endElectionsTime = sc.readUintNumber(32);
        let minStake = sc.readCoins();
        let allStakes = sc.readCoins();
        // var (stake, time, max_factor, addr, adnl_addr) = (cs~load_grams(), cs~load_uint(32), cs~load_uint(32), cs~load_uint(256), cs~load_uint(256));
        let entitiesData = sc.readOptDict(256, (s) => ({ stake: s.readCoins(), time: s.readUintNumber(32), maxFactor: s.readUintNumber(32), addr: s.readUint(256), adnl: s.readUint(256) }));
        let failed = sc.readBit();
        let finished = sc.readBit();

        let entities: { pubkey: Buffer, stake: BN, address: Address, adnl: Buffer }[] = [];
        if (entitiesData) {
            for (let k of entitiesData) {
                let pubkey = Buffer.from(new BN(k[0], 10).toString('hex', 32), 'hex');
                let stake = k[1].stake;
                let address = new Address(-1, Buffer.from(k[1].addr.toString('hex', 32), 'hex'));
                let adnl = Buffer.from(k[1].adnl.toString('hex', 32), 'hex');
                entities.push({ pubkey, stake: stake, address, adnl });
            }
        }
        
        return { minStake, allStakes, endElectionsTime, startWorkTime, entities };
    }

    async getActiveElectionId(block: number) {
        let res = await this.client.runMethod(block, this.address, 'active_election_id');
        if (res.exitCode !== 0 && res.exitCode !== 1) {
            throw Error('Exit code: ' + res.exitCode);
        }
        let tuple = new TupleSlice4(res.result);
        let electionId = tuple.readNumber();
        return electionId > 0 ? electionId : null;
    }

    // async getComplaints(block: number, electionId: number) {
    //     let res = await this.client.callGetMethod(this.address, 'list_complaints', [['num', electionId]]);
    //     return ElectorContract4.parseComplaints(res.stack);
    // }
}
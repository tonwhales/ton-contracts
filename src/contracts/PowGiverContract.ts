import BN from "bn.js";
import { Address, Contract, UnknownContractSource, TonClient, Cell, BitStringReader, BitString, ExternalMessage, CommonMessageInfo, RawMessage, BinaryMessage, Slice } from "ton";
import { sha256 } from "ton-crypto";
import { createUInt32 } from "./utils/createUInt32";


function padded(data: Buffer, size: number) {
    let res = Buffer.alloc(size);
    for (let i = 0; i < data.length; i++) {
        res[i + (size - data.length)] = data[i];
    }
    return res;
}

function paddedBnToBuffer(src: BN, size: number) {
    let rs = src.toString('hex');
    while (rs.length < size * 2) {
        rs = '0' + rs;
    }
    return Buffer.from(rs, 'hex');
}

function parseHex(src: string) {
    if (src.startsWith('x')) {
        src = src.slice(1);
    }
    if (src.startsWith('0x')) {
        src = src.slice(2);
    }
    if (src.length % 2 !== 0) {
        src = '0' + src;
    }
    return Buffer.from(src, 'hex');
}

export type ParsedMiningMessage = {
    op: 'mine',
    bounce: boolean,
    expire: number,
    address: Address,
    random: Buffer,
    seed: Buffer
}

export class PowGiverContract implements Contract {

    static async create(address: Address, client: TonClient) {
        return new PowGiverContract(address, client);
    }


    static parseMiningMessage(slice: Slice): ParsedMiningMessage | null {
        const op = slice.readUintNumber(32);
        if (op === 0x4d696e65 /* Mine */) {
            const flags = slice.readIntNumber(8);
            const expire = slice.readUintNumber(32);
            const bounce = !!(flags & 1);
            const addressWc = flags >> 2;
            const addressHash = slice.readBuffer(32);
            const address = new Address(addressWc, addressHash);
            const random1 = slice.readBuffer(32);
            const seed = slice.readBuffer(16);
            const random2 = slice.readBuffer(32);
            if (!random1.equals(random2)) {
                throw Error('Random mismatch');
            }
            return {
                op: 'mine',
                bounce,
                expire,
                address,
                random: random1,
                seed
            }
        }

        return null;
    }

    /**
     * Extracts pow params from contract state without need to invoke get pow_params. This is faster, more predictable and allows to handle
     * race conditions when poling from multiple sources
     * @param cell state cell
     * @returns seed and complexity
     */
    static extractPowParamsFromState(cell: Cell) {

        // Reimplementation
        // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/crypto/smartcont/pow-testgiver-code.fc#L146

        const reader = new BitStringReader(cell.bits);
        const seqno = reader.readUint(64);
        const publicKey = reader.readBuffer(32);
        const seed = reader.readBuffer(128 / 8);
        const complexity = reader.readBuffer(256 / 8);
        const lastSuccess = reader.readUintNumber(32);
        const xdata = new BitStringReader(cell.refs[0].bits);
        const target = xdata.readCoins();
        const targetDelta = xdata.readUintNumber(32);
        const minComplexityShift = xdata.readUintNumber(8);
        const maxComplexityShift = xdata.readUintNumber(8);
        const minComplexity = paddedBnToBuffer(new BN(1).shln(minComplexityShift), 32);
        const maxComplexity = paddedBnToBuffer(new BN(1).shln(maxComplexityShift), 32);
        return {
            seqno,
            publicKey,
            seed,
            complexity,
            lastSuccess,
            target,
            targetDelta,
            minComplexity,
            minComplexityShift,
            maxComplexity,
            maxComplexityShift
        }
    }

    /**
     * Creates header of mining job. Just apply random, seed and random again to make a full job.
     * @param wallet wallet to mine to
     * @param expiresSec job expiration unixtime in seconds
     * @returns Buffer of job header
     */
    static createMiningJobHeader(wallet: Address, expiresSec: number) {

        //
        // https://github.com/ton-blockchain/ton/blob/15dfedd371f1dfc4502ab53c6ed99deb1922ab1a/crypto/util/Miner.cpp#L57
        //

        return Buffer.concat([
            Buffer.from([0x0, 0xF2]), // Important prefix: https://github.com/ton-blockchain/ton/blob/15dfedd371f1dfc4502ab53c6ed99deb1922ab1a/crypto/util/Miner.cpp#L50
            Buffer.from('Mine'), // Op
            Buffer.from([wallet.workChain === 0 ? 0 : 0xFC]), // Workchain + Bounce (zero)
            createUInt32(expiresSec), // Expire in seconds
            wallet.hash // Wallet hash
        ]);
    }

    /**
     * Creates full mining job
     * @param args.seed giver's current seed
     * @param args.random random value
     * @param args.wallet wallt to mine to
     * @param args.expiresSec job expiration unixtime in seconds
     * @returns Buffer of job
     */
    static createMiningJob(args: { seed: Buffer, random: Buffer, wallet: Address, expiresSec: number }) {

        //
        // https://github.com/ton-blockchain/ton/blob/15dfedd371f1dfc4502ab53c6ed99deb1922ab1a/crypto/util/Miner.cpp#L57
        //

        return Buffer.concat([
            PowGiverContract.createMiningJobHeader(args.wallet, args.expiresSec),
            args.random, // Random
            args.seed, // Seed
            args.random // Random
        ]);
    }

    /**
     * Checks if mining result is valid
     * @param args.seed giver's current seed
     * @param args.random random value
     * @param args.wallet wallt to mine to
     * @param args.expiresSec job expiration unixtime in seconds
     * @param args.hash computed hash
     * @returns 
     */
    static async checkMiningJobHash(args: { seed: Buffer, random: Buffer, wallet: Address, expiresSec: number, hash: Buffer }) {
        const job = PowGiverContract.createMiningJob({ seed: args.seed, random: args.random, wallet: args.wallet, expiresSec: args.expiresSec });
        const hash = await sha256(job);
        return args.hash.equals(hash);
    }

    /**
     * Creates mining message to send to giver
     * @param args.giver giver address 
     * @param args.seed giver seed
     * @param args.random giver random
     * @param args.wallet wallet to mine to
     * @param args.expiresSec expires in seconds
     * @returns 
     */
    static createMiningMessage(args: { giver: Address, seed: Buffer, random: Buffer, wallet: Address, expiresSec: number }) {

        //
        // Message body
        //

        const body = Buffer.concat([
            // Note that 0x00F2 are not in the message, but it is a part of a hashing job
            // Buffer.from([0x0, 0xF2]), // Important prefix: https://github.com/ton-blockchain/ton/blob/15dfedd371f1dfc4502ab53c6ed99deb1922ab1a/crypto/util/Miner.cpp#L50
            Buffer.from('Mine'), // Op
            Buffer.from([args.wallet.workChain === 0 ? 0 : 0xFC]), // Workchain * 4 + Bounce. Set them all to zero.
            createUInt32(args.expiresSec), // Expire in seconds
            args.wallet.hash, // Wallet hash,
            args.random, // Random
            args.seed, // Seed
            args.random // Random
        ]);

        //
        // External message
        //
        const externalMessage = new ExternalMessage({
            to: args.giver,
            body: new CommonMessageInfo({
                body: new BinaryMessage(body)
            })
        });

        return externalMessage;
    }

    readonly client: TonClient;
    readonly address: Address;
    readonly source = new UnknownContractSource('com.ton.giver', -1, 'Pow Giver');

    private constructor(address: Address, client: TonClient) {
        this.address = address;
        this.client = client;
    }

    getPowParams = async () => {
        let params = await this.client.callGetMethod(this.address, 'get_pow_params');
        let seed = padded(parseHex(params.stack[0][1]), 16);
        let complexity = padded(parseHex(params.stack[1][1]), 32);
        return {
            seed,
            complexity
        }
    }
}
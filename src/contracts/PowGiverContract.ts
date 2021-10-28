import { BN } from "bn.js";
import { Address, Contract, UnknownContractSource, TonClient, Cell, BitStringReader } from "ton";


function padded(data: Buffer, size: number) {
    let res = Buffer.alloc(size);
    for (let i = 0; i < data.length; i++) {
        res[i + (size - data.length)] = data[i];
    }
    return res;
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

export class PowGiverContract implements Contract {

    static async create(address: Address, client: TonClient) {
        return new PowGiverContract(address, client);
    }

    static async extractPowParamsFromState(cell: Cell) {

        // Reimplementation
        // https://github.com/ton-blockchain/ton/blob/24dc184a2ea67f9c47042b4104bbb4d82289fac1/crypto/smartcont/pow-testgiver-code.fc#L146

        const reader = new BitStringReader(cell.bits);
        reader.skip(32 + 32 + 256);
        const seed = reader.readBuffer(128 / 8);
        const complexity = reader.readBuffer(256 / 8);
        return {
            seed,
            complexity
        }
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
import { BN } from "bn.js";
import { Address, Contract, UnknownContractSource, TonClient } from "ton";


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
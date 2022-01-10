import { randomBytes } from "crypto";
import { Address, Contract, contractAddress, ContractSource, TonClient } from "ton";
import { LoggerContractSource } from "./LoggerContractSource";

export class LoggerContract implements Contract {

    static async create(client: TonClient, source: LoggerContractSource) {
        return new LoggerContract(client, source, await contractAddress(source));
    }

    static async createRandom(client: TonClient, workchain: number = 0) {
        return LoggerContract.create(client, LoggerContractSource.create({ seed: randomBytes(64), workchain }));
    }

    readonly source: ContractSource;
    readonly address: Address;
    readonly client: TonClient;

    private constructor(client: TonClient, source: ContractSource, address: Address) {
        this.source = source;
        this.address = address;
        this.client = client;
    }

    async getSeqno() {
        if (await this.client.isContractDeployed(this.address)) {
            let res = await this.client.callGetMethod(this.address, 'seqno');
            return parseInt(res.stack[0][1], 16);
        } else {
            return 0;
        }
    }

    async getExternalMessages() {
        return (await this.client.getTransactions(this.address, { limit: 100 })).filter((v) => v.inMessage && !v.inMessage.source);
    }

    async getInternalMessages() {
        return (await this.client.getTransactions(this.address, { limit: 100 })).filter((v) => v.inMessage && v.inMessage.source);
    }
}
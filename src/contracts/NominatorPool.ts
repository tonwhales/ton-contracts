import { Address, Contract, TonClient, ContractSource } from "ton";
import { contractAddress } from "ton/dist/contracts/sources/ContractSource";
import { NominatorPoolSource } from "./NominatorPoolSource";

export class NominatorPool implements Contract {

    static async create(client: TonClient, source: NominatorPoolSource) {
        return new NominatorPool(client, source, await contractAddress(source));
    }

    readonly source: ContractSource;
    readonly address: Address;
    readonly client: TonClient;

    private constructor(client: TonClient, source: ContractSource, address: Address) {
        this.source = source;
        this.address = address;
        this.client = client;
    }
}
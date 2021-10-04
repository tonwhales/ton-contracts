import { mnemonicNew, mnemonicToWalletKey } from "ton-crypto";

export async function createWalletKey() {
    return await mnemonicToWalletKey(await mnemonicNew(24));
}
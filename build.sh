set -e

# Build contracts
ton-compiler --fift --input ./contracts/wallet.fc --output ./contracts/wallet.fif
ton-compiler --input ./contracts/wallet.fc --output ./contracts/wallet.cell
openssl base64 -A -in ./contracts/wallet.cell -out ./contracts/wallet.cell.base64

ton-compiler --fift --input ./contracts/highload-wallet.fc --output ./contracts/highload-wallet.fif
ton-compiler --input ./contracts/highload-wallet.fc --output ./contracts/highload-wallet.cell
openssl base64 -A -in ./contracts/highload-wallet.cell -out ./contracts/highload-wallet.cell.base64

ton-compiler --fift --input ./contracts/simple-wallet-code.fc --output ./contracts/simple-wallet-code.fif
ton-compiler --input ./contracts/simple-wallet-code.fc --output ./contracts/simple-wallet-code.cell
openssl base64 -A -in ./contracts/simple-wallet-code.cell -out ./contracts/simple-wallet-code.cell.base64

ton-compiler --fift --input ./contracts/whitelisted-wallet.fc --output ./contracts/whitelisted-wallet.fif
ton-compiler --input ./contracts/whitelisted-wallet.fc --output ./contracts/whitelisted-wallet.cell
openssl base64 -A -in ./contracts/whitelisted-wallet.cell  -out ./contracts/whitelisted-wallet.cell.base64

ton-compiler --fift --input ./contracts/logger.fc --output ./contracts/logger.fif
ton-compiler --input ./contracts/logger.fc --output ./contracts/logger.cell
openssl base64 -A -in ./contracts/logger.cell  -out ./contracts/logger.cell.base64

ton-compiler --fift --input ./contracts/pow-giver.fc --output ./contracts/pow-giver.fif
ton-compiler --input ./contracts/pow-giver.fc --output ./contracts/pow-giver.cell
openssl base64 -A -in ./contracts/pow-giver.cell  -out ./contracts/pow-giver.cell.base64

ton-compiler --fift --input ./contracts/validator-controller.fc --output ./contracts/validator-controller.fif
ton-compiler --input ./contracts/validator-controller.fc --output ./contracts/validator-controller.cell
openssl base64 -A -in ./contracts/validator-controller.cell  -out ./contracts/validator-controller.cell.base64

ton-compiler --fift --input ./contracts/wallet-v4.fc --output ./contracts/wallet-v4.fif
ton-compiler --input ./contracts/wallet-v4.fc --output ./contracts/wallet-v4.cell
openssl base64 -A -in ./contracts/wallet-v4.cell  -out ./contracts/wallet-v4.cell.base64

ton-compiler --fift --output ./contracts/nominator-pool.fif \
    --input ./contracts/nominator-pool-utils.fc \
    --input ./contracts/nominator-pool-storage.fc \
    --input ./contracts/nominator-pool-responses.fc \
    --input ./contracts/nominator-pool-get.fc \
    --input ./contracts/nominator-pool.fc

ton-compiler --output ./contracts/nominator-pool.cell \
    --input ./contracts/nominator-pool-utils.fc \
    --input ./contracts/nominator-pool-storage.fc \
    --input ./contracts/nominator-pool-responses.fc \
    --input ./contracts/nominator-pool-get.fc \
    --input ./contracts/nominator-pool.fc
    
openssl base64 -A -in ./contracts/nominator-pool.cell  -out ./contracts/nominator-pool.cell.base64

# Build distributive
rm -fr dist
tsc --declaration
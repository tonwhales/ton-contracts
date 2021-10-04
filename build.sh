set -e

# Build contracts
ton-compiler --fift --input ./contracts/wallet.fc --output ./contracts/wallet.fif
ton-compiler --input ./contracts/wallet.fc --output ./contracts/wallet.cell
openssl base64 -A -in ./contracts/wallet.cell -out ./contracts/wallet.cell.base64

ton-compiler --fift --input ./contracts/simple-wallet-code.fc --output ./contracts/simple-wallet-code.fif
ton-compiler --input ./contracts/simple-wallet-code.fc --output ./contracts/simple-wallet-code.cell
openssl base64 -A -in ./contracts/simple-wallet-code.cell -out ./contracts/simple-wallet-code.cell.base64

ton-compiler --fift --input ./contracts/whitelisted-wallet.fc --output ./contracts/whitelisted-wallet.fif
ton-compiler --input ./contracts/whitelisted-wallet.fc --output ./contracts/whitelisted-wallet.cell
openssl base64 -A -in ./contracts/whitelisted-wallet.cell  -out ./contracts/whitelisted-wallet.cell.base64

# Build distributive
rm -fr dist
tsc --declaration
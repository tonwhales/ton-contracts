./node_modules/ton-compiler/bin/macos/func -PS -A -o ./contracts/wallet.fif $(pwd)/stdlib.fc ./contracts/wallet.func
export FIFTPATH=$(pwd)/node_modules/ton-compiler/fiftlib/
./node_modules/ton-compiler/bin/macos/fift build.fif
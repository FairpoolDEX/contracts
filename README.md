# Shield Finance contracts

## Setup

    # Install NVM: https://github.com/nvm-sh/nvm#installing-and-updating
    nvm install $(cat .nvmrc)
    nvm use # loads version from .nvmrc
    yarn install
    yarn build

## Tasks

Build the project

    yarn build

Run tests

    yarn test

Watch tests

    yarn test:watch

Fork mainnet

    set -o allexport; source .env; set +o allexport # Export .env vars
    hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/$ALCHEMY_API_KEY
    # switch to another console
    export NETWORK=localhost # set NETWORK to local fork
    hardhat deployBullToken --network $NETWORK # or any other command with --network $NETWORK

Lint code

    yarn lint

Generate coverage

    yarn coverage

## License

The code in this repository is provided for informational purposes only. If you want to use it for any other purpose, you need to obtain an explicit permission from the copyright holder.

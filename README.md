# Shield Finance contracts

## Setup

```shell
# Install NVM: https://github.com/nvm-sh/nvm#installing-and-updating
# Install yarn v1: https://classic.yarnpkg.com/en/docs/install
# Add .nvmrc autoload to ~/.bashrc (optional, recommended): https://gist.github.com/DenisGorbachev/0c321443d9fe684b6d2a9de785420a6a    
nvm install $(cat .nvmrc)
nvm use # loads version from .nvmrc
yarn install
yarn build
```

## Tasks

Build the project

```shell
yarn build
```

Run tests

```shell
yarn test
```

Watch tests

```shell
yarn test:watch
```

Fork mainnet

```shell
set -o allexport; source .env; set +o allexport # Export .env vars
yarn fork
# switch to another console
export NETWORK=localhost # set NETWORK to local fork
hardhat deployBullToken --network $NETWORK # or any other command with --network $NETWORK
```

Lint code

```shell
yarn lint
```

Generate coverage

```shell
yarn coverage
```

## License

The code in this repository is provided for informational purposes only. If you want to use it for any other purpose, you need to obtain an explicit permission from the copyright holder.

Ⓒ Shield Finance, 2021. All rights reserved.

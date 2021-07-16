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

Lint code

    yarn lint

Generate coverage

    yarn coverage

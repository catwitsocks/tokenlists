const axios = require('axios').default;
const { readFileSync, writeFileSync, mkdirSync, existsSync, writeFile } = require('fs');
const { isAddress, getAddress } = require('viem');
const { join } = require('path');
const { ChainId } = require('@real-wagmi/sdk');

const lists = [
    "https://gateway.ipfs.io/ipns/tokens.uniswap.org",
    "https://tokens.coingecko.com/uniswap/all.json",
    "https://tokens.coingecko.com/binance-smart-chain/all.json",
    "https://tokens.coingecko.com/fantom/all.json",
    "https://assets.spooky.fi/spookyswap.json",
    "https://tokens.coingecko.com/polygon-pos/all.json",
    "https://static.optimism.io/optimism.tokenlist.json",
    "https://bridge.arbitrum.io/token-list-42161.json",
    "https://raw.githubusercontent.com/plasmadlt/plasma-finance-token-list/master/bnb.json",
    "https://www.coingecko.com/tokens_list/avalanche/all/latest.json"
]

const downloadImage = false;

async function bootstrap(){
    const defaultList = JSON.parse(readFileSync(join(__dirname, '../tokenlist.json')));
    const supportedChains = Object.values(ChainId).filter((chain) => !isNaN(Number(chain))).map((chain) => Number(chain));
    let count = 0;

    for(const url of lists){
        try{
            const { data } = await axios.get(url);
            if(data && Array.isArray(data.tokens)){
                for(const token of data.tokens){
                    if(isAddress(token.address) && !isNaN(token.chainId) && token.logoURI){
                        if(!supportedChains.includes(token.chainId)) continue;

                        const incomingTokenAddress = getAddress(token.address);
                        const isExist = defaultList.tokens.find(({ chainId, address }) => chainId === token.chainId && address === incomingTokenAddress);
                        if(!isExist){
                            const chainFolderExist = existsSync(join(__dirname, `../logos/${token.chainId}`));
                            if(!chainFolderExist){
                                mkdirSync(join(__dirname, `../logos/${token.chainId}`));
                            }
                            console.log(`new token incoming ${token.chainId} | ${incomingTokenAddress} | ${token.symbol}`);
                            if(downloadImage){
                                mkdirSync(join(__dirname, `../logos/${token.chainId}/${incomingTokenAddress}/`));
                                const response = await axios.get(token.logoURI, { responseType: "arraybuffer" });
                                writeFile(join(__dirname, `../logos/${token.chainId}/${incomingTokenAddress}/logo.png`), response.data);
                            }

                            defaultList.tokens.push({
                                ...token,
                                address: incomingTokenAddress,
                                logoURI: downloadImage ? `https://raw.githubusercontent.com/RealWagmi/tokenlists/main/logos/${token.chainId}/${incomingTokenAddress}/logo.png`: token.logoURI
                            });
                        }
                    }
                }
            }
        } catch(err){
            console.log(err);
        }
    }

    console.log(`done! | new tokens ${count}`);
    writeFileSync(join(__dirname, '../tokenlist.json'), JSON.stringify(defaultList, null, 4));
}

bootstrap();
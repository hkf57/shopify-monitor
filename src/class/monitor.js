"use strict";

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36';
const safeHeaders = {
    'pragma': 'no-cache',
    'cache-control': 'no-cache',
    'upgrade-insecure-requests': '1',
    'user-agent': userAgent,
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'sec-fetch-site': 'none',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'sec-fetch-dest': 'document',
    'accept-language': 'en-US,en;q=0.9'
};

const request = require('request-promise').defaults({
    simple: false,
    gzip: true,
    resolveWithFullResponse: true,
    maxRedirects: 0,
    followRedirect: false,
    headers: safeHeaders
});
const events = require('events');
require('console-stamp')(console, 'HH:MM:ss.l');

const {
    sleep,
    getRandomArbitrary
} = require('../../utils/tools.js');
const config = require('../../config/config.json');

class Monitor extends events {
    constructor(props) {
        super();

        Object.keys(props).forEach((key) => this[key] = props[key]);

        this.previousProducts = [];
        this.currentProducts = [];

        this.site = new URL(this.site);

        setInterval(() => {
            console.log('60m Checkup: ' + this.site);
        }, 3600000);

        this.initMonitor();
    }


    initMonitor = async () => {
        let response;

        try {
            response = await request.get({
                url: this.site + '/products.json',
                json: true,
                followRedirect: true,
                qs: {
                    limit: getRandomArbitrary(250, 9999)
                }
            })

            if (response.statusCode == 401) {
                throw new Error('Password up on ' + this.site);
            }

            this.previousProducts = response.body.products;
        } catch (initError) {
            console.error(`INIT ERR @ ${this.site}: ${initError.message}`);
            await sleep(config.delay);
            return this.initMonitor();
        }
        // this.emit('initProductFetch', response.body.products.length);
        this.monitorLoop(1);
    }

    monitorLoop = async () => {
        let response;

        try {
            response = await request.get({
                url: this.site + '/products.json',
                json: true,
                followRedirect: true,
                qs: {
                    limit: getRandomArbitrary(250, 9999)
                }
            })

            if (response.statusCode == 401) {
                throw new Error('Password up on ' + this.site);
            }

            this.currentProducts = response.body.products;
            let _currentProducts = [ ...this.currentProducts ];

            let matchedProductIndex, matchedProduct;

            this.previousProducts.forEach(product => {
                matchedProductIndex = this.currentProducts.findIndex((_product) => _product.id == product.id);
                matchedProduct = this.currentProducts[matchedProductIndex];

                if (matchedProduct && product.updated_at != matchedProduct.updated_at) {
                    this.checkRestocks(this.currentProducts[matchedProductIndex], product);
                }
            });

            this.previousProducts.forEach(product => {
                matchedProductIndex = _currentProducts.findIndex((_product) => _product.id == product.id);
                matchedProduct = _currentProducts[matchedProductIndex];
                if (matchedProduct) _currentProducts.splice(matchedProductIndex, 1);
            })

            if (_currentProducts.length) {
                _currentProducts.forEach((product) => {
                    let productDetails = {
                        site: this.site,
                        product: product,
                        restockedVariants: product.variants
                    }
                    // @DEBUG: console.log(productDetails);
                    if (doesNotIncludeShittySets(productDetails.product.title)) {
                        this.emit('newProduct', productDetails);
                    }
                    else {
                        console.log(productDetails);
                    }
                })
            }

            this.previousProducts = [ ...this.currentProducts ];
        } catch (monitorError) {
            console.error(`MON ERR @ ${this.site}: ${monitorError.message}`);
            await sleep(config.delay);
            return this.monitorLoop();
        }

        await sleep(config.delay);
        return this.monitorLoop();
    }

    checkRestocks = async (product, oldProduct) => {
        let restockDetails = {
            site: this.site,
            product,
            restockedVariants: []
        }

        product.variants.forEach((variant) => {
            if (variant.available && !oldProduct.variants.find((_variant) => _variant.id == variant.id)?.available) {
                restockDetails.restockedVariants.push(variant);
                // @DEBUG: console.log(restockDetails.restockedVariants);
            }
        })

        if (restockDetails.restockedVariants.length) {
            // @DEBUG: console.log(restockDetails);
            if (restockDetails.restockedVariants.map(restocked => restocked.title && restocked.available && doesNotIncludeShittySets(restocked.title))) {
                this.emit('restockedProduct', restockDetails);
            }
            else {
                console.log(productDetails);
            }
        }
    }
}

const doesNotIncludeShittySets = (value) => config.exclude.every(x => !value.includes(x))

module.exports = Monitor;
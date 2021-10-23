const Monitor = require('./class/monitor.js');
const { sendWebhook, sendInformativeWebhook } = require('../utils/webhook.js');

const fs = require('fs');

let sites = [],
    webhooks = [];

fs.readFileSync(__dirname + '/../config/sites.txt', 'utf-8')
    .split(/\r?\n/).forEach(line => sites.push(line));
fs.readFileSync(__dirname + '/../config/webhooks.txt', 'utf-8')
    .split(/\r?\n/).forEach(line => {
        line = line.replace(/\s/g, '');
        if (line != '') webhooks.push(line);
    });

sites.forEach(site => {
    const currentMonitor = new Monitor({
        site
    });

    console.log('Monitor Started for ' + site);
    currentMonitor.on('initProductFetch', productDetails => {
        console.log('info webhook sent')
        sendInformativeWebhook(webhooks[0], 1305395, 'Products Loaded', productDetails);
    });
    currentMonitor.on('newProduct', productDetails => {
        for (let i = 0; i < webhooks.length; i++) {
            sendWebhook(webhooks[i], 1305395, 'New Product', productDetails);
        }
        console.log('New Product @ ' + productDetails.site + ': ' + productDetails.product.title)
    });
    
    currentMonitor.on('restockedProduct', restockDetails => {
        for (let i = 0; i < webhooks.length; i++) {
            sendWebhook(webhooks[i], 242172, 'Product Restock', restockDetails);
        }
        console.log('Restock @ ' + restockDetails.site + ': ' + restockDetails.product.title)
    });
})
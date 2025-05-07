require("dotenv").config();

const express = require("express");
const app = express.Router();

const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const cron = require('node-cron');

var ServerCache = new NodeCache({ stdTTL: 90000, checkperiod: 1800 });

async function GetFuelPricesTR() {
    var TARGET_URL = 'https://www.petrolofisi.com.tr/akaryakit-fiyatlari/istanbul-akaryakit-fiyatlari';

    try {
        const { data } = await axios.get(TARGET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);

        var prices = {};
        var targetLi = $('li.list-group-item[data-district-id="03431"]');

        if (targetLi.length === 0) {
            console.error('Hedeflenen li elementi (data-district-id="03431") sayfada bulunamadı.');
            if (!ServerCache.get('FuelPrices')) ServerCache.set('FuelPrices', {});
            return; 
        }

        targetLi.find('.row.row-cols-2 > .mt-2').each((index, element) => {
            var fuelDiv = $(element);
            var fuelTypeName = fuelDiv.find('.mb-1.fs-7.text-primary').text().trim();

            var fuelPriceText = null;
            try {

                 const typeNameNode = fuelDiv.find('.mb-1.fs-7.text-primary').get(0);
                 if (typeNameNode && typeNameNode.nextSibling && typeNameNode.nextSibling.nodeType === 3) {
                     fuelPriceText = typeNameNode.nextSibling.nodeValue.trim();
                 } else {

                    var allText = fuelDiv.text();
                    fuelPriceText = allText.replace(fuelTypeName, '').trim();
                 }

            } catch(e) {
                console.warn(`Fiyat ayrıştırılırken bir sorun oluştu (Yakıt: ${fuelTypeName})`, e);
            }

            const parsePrice = (priceText) => {
                if (!priceText) return null;
                try {

                    const match = priceText.match(/(\d+[\.,]?\d*)/);
                    if (match && match[0]) {
                       return parseFloat(match[0].replace(',', '.'));
                    }
                    return null;
                } catch (e) {
                    console.error(`Fiyat parse edilirken hata: ${priceText}`, e);
                    return null;
                }
            };

            const fuelPrice = parsePrice(fuelPriceText);
            if (fuelTypeName && fuelPrice !== null) prices[fuelTypeName] = fuelPrice;
        });

        if (Object.keys(prices).length > 0) {
             const cacheData = {
                 ...prices,
                 source: TARGET_URL,
                 updatedAt: new Date().toISOString()
             };
            ServerCache.set('FuelPrices', cacheData);
            
            console.log("Cachelenmiş ve yakalanan veri : ", JSON.stringify(ServerCache.get("FuelPrices")));

        } else {
            console.error('Web sitesinden geçerli fiyat verisi okunamadı veya seçiciler/yapı değişmiş.');
            if (!ServerCache.get('FuelPrices')) ServerCache.set('FuelPrices', {});
        }

    } catch (error) {

        console.error('Web sitesinden fiyat kazınırken genel hata oluştu:', error.message);
    }
};

cron.schedule('0 11 * * *', () => { // eğer 11'in solunda ki 0'ı kaldırırasn her saat başı dakika 11'de çalışır.
    GetFuelPricesTR();
  }, {
    scheduled: true,
    timezone: "Europe/Istanbul"
  });

module.exports = app;
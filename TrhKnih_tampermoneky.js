// ==UserScript==
// @name         TrhKnih
// @namespace    http://tampermonkey.net/
// @version      1.5.1
// @description  Automatické předvyplnění formulářů na TrhKnih
// @author       Vojta Florian
// @match        https://www.trhknih.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trhknih.cz
// @downloadURL  https://raw.githubusercontent.com/vojtaflorian/TrhKnih_betterWF/main/TrhKnih_tampermoneky.js
// @updateURL    https://raw.githubusercontent.com/vojtaflorian/TrhKnih_betterWF/main/TrhKnih_tampermoneky.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initialize() {
        // Nastavení pole 'shape' na 'Velmi dobrý'
        let shapeField = document.getElementById('shape');
        if (shapeField) {
            shapeField.value = 'Velmi dobrý';
        }

        // Zaškrtnutí checkboxu 'zaslání dopravcem'
        let shippingCheckbox = document.getElementById('registered-shipping');
        if (shippingCheckbox) {
            shippingCheckbox.checked = true;

            // Otevření sekce po změně checkboxu
            shippingCheckbox.dispatchEvent(new Event('change'));

            // Po krátkém zpoždění zaškrtnutí radiobuttonu "do 1 kg"
            setTimeout(() => {
                let weightRadio = document.querySelector('input[name="weight_cat"][value="2"]');
                if (weightRadio) {
                    weightRadio.checked = true;
                }
            }, 500); // 500 ms zpoždění pro načtení obsahu
        }

        // Zaškrtnutí checkboxů pro osobní předání
        let handoverCheckboxes = document.querySelectorAll('input[name="handover[]"]');
        handoverCheckboxes.forEach(checkbox => {
            // Hodnoty, které chceme zaškrtnout
            const selectedValues = ['3456', '9467', '10637'];
            if (selectedValues.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        // Přesun divů 'bids' a 'soldHistoryChart' nad div 'asks'
        let bidsDiv = document.getElementById('bids');
        let soldHistoryChartDiv = document.getElementById('soldHistoryChart');
        let asksDiv = document.getElementById('asks');

        if (bidsDiv && soldHistoryChartDiv && asksDiv) {
            asksDiv.parentNode.insertBefore(bidsDiv, asksDiv);
            asksDiv.parentNode.insertBefore(soldHistoryChartDiv, asksDiv);
        }

        // Výpočet průměrné ceny z aktuálních nabídek a vložení do nadpisu
        let priceElements = document.querySelectorAll('.ask-col-price span span');
        let prices = [];

        priceElements.forEach(element => {
            let priceText = element.textContent.trim();
            let price = parseInt(priceText.replace('Kč', '').replace(/\s+/g, ''));
            if (!isNaN(price)) {
                prices.push(price);
            }
        });

        if (prices.length > 0) {
            let averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
            let header = asksDiv.querySelector('h3');
            if (header) {
                header.innerHTML = `Tuto knihu nabízí: průměrně ${averagePrice} Kč`;
            }
        }

        // Skrytí divů 'tags' a 'credits-and-shelf-selector'
        let tagsDiv = document.getElementById('tags');
        if (tagsDiv) {
            tagsDiv.style.display = 'none';
        }

        let creditsAndShelfSelectorDiv = document.getElementById('credits-and-shelf-selector');
        if (creditsAndShelfSelectorDiv) {
            creditsAndShelfSelectorDiv.style.display = 'none';
        }

        // Vymazání hledacího inputu při načtení stránky a přidání tlačítka pro vymazání
        let searchBox = document.getElementById('searchbox');
        if (searchBox) {
            // Přidání tlačítka pro smazání textu
            let clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.textContent = '×';
            clearButton.style.position = 'absolute';
            clearButton.style.right = '120px'; // Posunuto dál od tlačítka "Hledat"
            clearButton.style.top = '50%';
            clearButton.style.transform = 'translateY(-50%)';
            clearButton.style.padding = '0';
            clearButton.style.border = 'none';
            clearButton.style.background = 'none';
            clearButton.style.cursor = 'pointer';
            clearButton.style.fontSize = '20px';
            clearButton.style.color = '#000';
            clearButton.style.zIndex = '10';

            clearButton.addEventListener('click', () => {
                searchBox.value = '';
                searchBox.focus();
            });

            let inputParent = searchBox.closest('.input-append');
            if (inputParent) {
                inputParent.style.position = 'relative';
                inputParent.appendChild(clearButton);
                console.log('Clear button successfully added');
            } else {
                console.log('Parent element for searchbox not found');
            }
        }
    }

    function monitorUrlChanges() {
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                console.log('URL changed:', currentUrl);
                initialize();
            }
        }).observe(document, { subtree: true, childList: true });
    }

    monitorUrlChanges();
    initialize();
})();

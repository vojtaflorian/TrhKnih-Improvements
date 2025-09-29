// ==UserScript==
// @name         TrhKnih
// @namespace    http://tampermonkey.net/
// @version      2025-09-29
// @description  Automatické předvyplnění formulářů na TrhKnih
// @author       Vojta Florian
// @match        https://www.trhknih.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trhknih.cz
// @downloadURL  https://raw.githubusercontent.com/vojtaflorian/TrhKnih-Improvements/refs/heads/main/TrhKnih-improvements.user.js
// @updateURL    https://raw.githubusercontent.com/vojtaflorian/TrhKnih-Improvements/refs/heads/main/TrhKnih-improvements.user.js
// @grant        none
// ==/UserScript==


(function() {
    'use strict';

    //===================================================================================
    // CONFIGURATION
    //===================================================================================
    
    /**
     * Central configuration object containing all script settings and constants
     */
    const CONFIG = {
        // Logging configuration
        logging: {
            enabled: true,
            level: 'INFO', // DEBUG, INFO, WARN, ERROR
            prefix: '📚 TrhKnih',
            includeTimestamp: true,
            includeStackTrace: true
        },
        
        // Form auto-fill configuration
        form: {
            shapeValue: 'Velmi dobrý',
            shippingDelay: 500, // milliseconds
            weightCategoryValue: '2', // "do 1 kg"
            handoverValues: ['3456', '9467', '10637'],
            selectors: {
                shape: '#shape',
                shippingCheckbox: '#registered-shipping',
                weightRadio: 'input[name="weight_cat"][value="2"]',
                handoverCheckboxes: 'input[name="handover[]"]'
            }
        },
        
        // DOM manipulation configuration
        dom: {
            divIds: {
                bids: 'bids',
                soldHistoryChart: 'soldHistoryChart',
                asks: 'asks',
                tags: 'tags',
                creditsAndShelfSelector: 'credits-and-shelf-selector'
            }
        },
        
        // Price calculator configuration
        price: {
            selector: '.ask-col-price span span',
            currency: 'Kč',
            headerSelector: 'h3',
            headerTemplate: 'Tuto knihu nabízí: průměrně {price} Kč'
        },
        
        // Search box configuration
        searchBox: {
            selector: '#searchbox',
            clearButton: {
                text: '×',
                position: {
                    right: '150px',
                    top: '50%'
                },
                style: {
                    fontSize: '20px',
                    color: '#000',
                    cursor: 'pointer'
                }
            }
        },
        
        // URL monitoring configuration
        urlMonitor: {
            enabled: true,
            throttleDelay: 100 // milliseconds
        }
    };

    //===================================================================================
    // LOGGING SYSTEM
    //===================================================================================
    
    /**
     * Centralized logging manager with multiple log levels and formatting
     * Provides consistent logging interface across the entire application
     */
    class Logger {
        constructor(config) {
            this.config = config;
            this.levels = {
                DEBUG: 0,
                INFO: 1,
                WARN: 2,
                ERROR: 3
            };
            this.currentLevel = this.levels[config.level] || this.levels.INFO;
        }

        /**
         * Get formatted timestamp for log entries
         * @returns {string} Formatted timestamp
         */
        getTimestamp() {
            const now = new Date();
            return now.toISOString();
        }

        /**
         * Format log message with prefix, timestamp, and module information
         * @param {string} level - Log level
         * @param {string} module - Module name
         * @param {string} message - Log message
         * @returns {string} Formatted log message
         */
        formatMessage(level, module, message) {
            let formatted = `${this.config.prefix} [${level}]`;
            
            if (this.config.includeTimestamp) {
                formatted += ` [${this.getTimestamp()}]`;
            }
            
            formatted += ` [${module}]: ${message}`;
            return formatted;
        }

        /**
         * Check if message should be logged based on current log level
         * @param {string} level - Log level to check
         * @returns {boolean} True if message should be logged
         */
        shouldLog(level) {
            return this.config.enabled && this.levels[level] >= this.currentLevel;
        }

        /**
         * Log debug message
         * @param {string} module - Module name
         * @param {string} message - Log message
         * @param {*} data - Optional data to log
         */
        debug(module, message, data = null) {
            if (!this.shouldLog('DEBUG')) return;
            
            console.log(this.formatMessage('DEBUG', module, message));
            if (data) console.log(data);
        }

        /**
         * Log info message
         * @param {string} module - Module name
         * @param {string} message - Log message
         * @param {*} data - Optional data to log
         */
        info(module, message, data = null) {
            if (!this.shouldLog('INFO')) return;
            
            console.log(this.formatMessage('INFO', module, message));
            if (data) console.log(data);
        }

        /**
         * Log warning message
         * @param {string} module - Module name
         * @param {string} message - Log message
         * @param {*} data - Optional data to log
         */
        warn(module, message, data = null) {
            if (!this.shouldLog('WARN')) return;
            
            console.warn(this.formatMessage('WARN', module, message));
            if (data) console.warn(data);
        }

        /**
         * Log error message with optional stack trace
         * @param {string} module - Module name
         * @param {string} message - Error message
         * @param {Error} error - Error object
         */
        error(module, message, error = null) {
            if (!this.shouldLog('ERROR')) return;
            
            console.error(this.formatMessage('ERROR', module, message));
            
            if (error) {
                console.error('Error details:', error);
                if (this.config.includeStackTrace && error.stack) {
                    console.error('Stack trace:', error.stack);
                }
            }
        }

        /**
         * Log performance metrics
         * @param {string} module - Module name
         * @param {string} operation - Operation name
         * @param {number} duration - Duration in milliseconds
         */
        performance(module, operation, duration) {
            if (!this.shouldLog('INFO')) return;
            
            console.log(
                this.formatMessage('PERF', module, 
                    `Operation "${operation}" completed in ${duration}ms`)
            );
        }
    }

    //===================================================================================
    // RESOURCE MANAGER
    //===================================================================================
    
    /**
     * Centralized resource manager for intervals, timeouts, and observers
     * Ensures proper cleanup and prevents memory leaks
     */
    class ResourceManager {
        constructor(logger) {
            this.logger = logger;
            this.intervals = new Map();
            this.timeouts = new Map();
            this.observers = new Map();
            this.nextId = 0;
            
            this.logger.info('ResourceManager', 'Resource manager initialized');
            
            // Register cleanup on page unload
            window.addEventListener('beforeunload', () => this.cleanupAll());
        }

        /**
         * Generate unique ID for resource tracking
         * @returns {string} Unique resource ID
         */
        generateId() {
            return `resource_${this.nextId++}`;
        }

        /**
         * Register and start a timeout
         * @param {Function} callback - Callback function
         * @param {number} delay - Delay in milliseconds
         * @param {string} description - Description for logging
         * @returns {string} Resource ID
         */
        registerTimeout(callback, delay, description = 'unnamed') {
            try {
                const id = this.generateId();
                const timeoutId = setTimeout(() => {
                    try {
                        callback();
                        this.timeouts.delete(id); // Auto-cleanup after execution
                    } catch (error) {
                        this.logger.error('ResourceManager', 
                            `Error in timeout callback: ${description}`, error);
                    }
                }, delay);
                
                this.timeouts.set(id, {
                    timeoutId,
                    description,
                    startTime: Date.now()
                });
                
                this.logger.debug('ResourceManager', 
                    `Registered timeout: ${description} (ID: ${id})`);
                
                return id;
            } catch (error) {
                this.logger.error('ResourceManager', 
                    'Failed to register timeout', error);
                return null;
            }
        }

        /**
         * Register a MutationObserver
         * @param {MutationObserver} observer - Observer instance
         * @param {string} description - Description for logging
         * @returns {string} Resource ID
         */
        registerObserver(observer, description = 'unnamed') {
            try {
                const id = this.generateId();
                this.observers.set(id, {
                    observer,
                    description,
                    startTime: Date.now()
                });
                
                this.logger.debug('ResourceManager', 
                    `Registered observer: ${description} (ID: ${id})`);
                
                return id;
            } catch (error) {
                this.logger.error('ResourceManager', 
                    'Failed to register observer', error);
                return null;
            }
        }

        /**
         * Clear specific timeout by ID
         * @param {string} id - Resource ID
         * @returns {boolean} Success status
         */
        clearTimeout(id) {
            try {
                const resource = this.timeouts.get(id);
                if (resource) {
                    clearTimeout(resource.timeoutId);
                    this.timeouts.delete(id);
                    
                    this.logger.debug('ResourceManager', 
                        `Cleared timeout: ${resource.description}`);
                    return true;
                }
                return false;
            } catch (error) {
                this.logger.error('ResourceManager', 
                    'Failed to clear timeout', error);
                return false;
            }
        }

        /**
         * Disconnect specific observer by ID
         * @param {string} id - Resource ID
         * @returns {boolean} Success status
         */
        disconnectObserver(id) {
            try {
                const resource = this.observers.get(id);
                if (resource) {
                    resource.observer.disconnect();
                    this.observers.delete(id);
                    
                    const duration = Date.now() - resource.startTime;
                    this.logger.debug('ResourceManager', 
                        `Disconnected observer: ${resource.description} (ran for ${duration}ms)`);
                    return true;
                }
                return false;
            } catch (error) {
                this.logger.error('ResourceManager', 
                    'Failed to disconnect observer', error);
                return false;
            }
        }

        /**
         * Clean up all registered resources
         */
        cleanupAll() {
            this.logger.info('ResourceManager', 
                'Starting cleanup of all resources');
            
            let cleanedCount = 0;
            
            try {
                // Clear all timeouts
                for (const [id, resource] of this.timeouts) {
                    clearTimeout(resource.timeoutId);
                    cleanedCount++;
                }
                this.timeouts.clear();
                
                // Disconnect all observers
                for (const [id, resource] of this.observers) {
                    resource.observer.disconnect();
                    cleanedCount++;
                }
                this.observers.clear();
                
                this.logger.info('ResourceManager', 
                    `Cleanup completed. Cleaned ${cleanedCount} resources`);
            } catch (error) {
                this.logger.error('ResourceManager', 
                    'Error during cleanup', error);
            }
        }

        /**
         * Get current resource statistics
         * @returns {Object} Resource statistics
         */
        getStats() {
            return {
                timeouts: this.timeouts.size,
                observers: this.observers.size,
                total: this.timeouts.size + this.observers.size
            };
        }
    }

    //===================================================================================
    // FORM AUTO-FILLER
    //===================================================================================
    
    /**
     * Automatically fills form fields with predefined values
     * Handles shape selection, shipping options, and handover locations
     */
    class FormAutoFiller {
        constructor(logger, resourceManager) {
            this.logger = logger;
            this.resourceManager = resourceManager;
            this.config = CONFIG.form;
            
            this.logger.info('FormAutoFiller', 'Form auto-filler initialized');
        }

        /**
         * Safely query selector with error handling
         * @param {string} selector - CSS selector
         * @param {Element} parent - Parent element (optional)
         * @returns {Element|null} Found element or null
         */
        safeQuerySelector(selector, parent = document) {
            try {
                if (!selector) {
                    this.logger.warn('FormAutoFiller', 
                        'Empty selector provided');
                    return null;
                }
                
                return parent.querySelector(selector);
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    `Error querying selector: ${selector}`, error);
                return null;
            }
        }

        /**
         * Safely query all selectors with error handling
         * @param {string} selector - CSS selector
         * @param {Element} parent - Parent element (optional)
         * @returns {NodeList} Found elements or empty NodeList
         */
        safeQuerySelectorAll(selector, parent = document) {
            try {
                if (!selector) {
                    this.logger.warn('FormAutoFiller', 
                        'Empty selector provided');
                    return [];
                }
                
                return parent.querySelectorAll(selector);
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    `Error querying selector: ${selector}`, error);
                return [];
            }
        }

        /**
         * Set shape field value
         * @returns {boolean} Success status
         */
        setShapeField() {
            try {
                this.logger.info('FormAutoFiller', 
                    'Setting shape field');
                
                const shapeField = this.safeQuerySelector(
                    this.config.selectors.shape
                );
                
                if (!shapeField) {
                    this.logger.debug('FormAutoFiller', 
                        'Shape field not found');
                    return false;
                }
                
                shapeField.value = this.config.shapeValue;
                
                this.logger.info('FormAutoFiller', 
                    `Shape field set to: ${this.config.shapeValue}`);
                
                return true;
                
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    'Error setting shape field', error);
                return false;
            }
        }

        /**
         * Set shipping options
         * @returns {Promise<boolean>} Success status
         */
        async setShippingOptions() {
            try {
                this.logger.info('FormAutoFiller', 
                    'Setting shipping options');
                
                const shippingCheckbox = this.safeQuerySelector(
                    this.config.selectors.shippingCheckbox
                );
                
                if (!shippingCheckbox) {
                    this.logger.debug('FormAutoFiller', 
                        'Shipping checkbox not found');
                    return false;
                }
                
                // Check the checkbox
                shippingCheckbox.checked = true;
                
                this.logger.debug('FormAutoFiller', 
                    'Shipping checkbox checked');
                
                // Dispatch change event to open the section
                try {
                    shippingCheckbox.dispatchEvent(new Event('change'));
                    this.logger.debug('FormAutoFiller', 
                        'Change event dispatched');
                } catch (error) {
                    this.logger.error('FormAutoFiller', 
                        'Error dispatching change event', error);
                }
                
                // Wait for content to load
                await this.sleep(this.config.shippingDelay);
                
                // Set weight category
                const weightRadio = this.safeQuerySelector(
                    this.config.selectors.weightRadio
                );
                
                if (!weightRadio) {
                    this.logger.warn('FormAutoFiller', 
                        'Weight radio button not found');
                    return false;
                }
                
                weightRadio.checked = true;
                
                this.logger.info('FormAutoFiller', 
                    'Shipping options set successfully');
                
                return true;
                
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    'Error setting shipping options', error);
                return false;
            }
        }

        /**
         * Helper function for async sleep
         * @param {number} ms - Milliseconds to sleep
         * @returns {Promise}
         */
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Set handover checkboxes
         * @returns {boolean} Success status
         */
        setHandoverCheckboxes() {
            try {
                this.logger.info('FormAutoFiller', 
                    'Setting handover checkboxes');
                
                const handoverCheckboxes = this.safeQuerySelectorAll(
                    this.config.selectors.handoverCheckboxes
                );
                
                if (!handoverCheckboxes || handoverCheckboxes.length === 0) {
                    this.logger.debug('FormAutoFiller', 
                        'No handover checkboxes found');
                    return false;
                }
                
                let checkedCount = 0;
                
                handoverCheckboxes.forEach(checkbox => {
                    if (!checkbox) return;
                    
                    if (this.config.handoverValues.includes(checkbox.value)) {
                        checkbox.checked = true;
                        checkedCount++;
                        
                        this.logger.debug('FormAutoFiller', 
                            `Checked handover checkbox with value: ${checkbox.value}`);
                    }
                });
                
                this.logger.info('FormAutoFiller', 
                    `Handover checkboxes set (${checkedCount} checked)`);
                
                return checkedCount > 0;
                
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    'Error setting handover checkboxes', error);
                return false;
            }
        }

        /**
         * Execute all form filling operations
         * @returns {Promise<Object>} Results of all operations
         */
        async fillAll() {
            try {
                this.logger.info('FormAutoFiller', 
                    'Starting form auto-fill');
                
                const startTime = Date.now();
                
                const results = {
                    shape: false,
                    shipping: false,
                    handover: false
                };
                
                // Set shape field
                results.shape = this.setShapeField();
                
                // Set shipping options
                results.shipping = await this.setShippingOptions();
                
                // Set handover checkboxes
                results.handover = this.setHandoverCheckboxes();
                
                const duration = Date.now() - startTime;
                
                const successCount = Object.values(results)
                    .filter(v => v === true).length;
                
                this.logger.info('FormAutoFiller', 
                    `Form auto-fill completed (${successCount}/3 successful) in ${duration}ms`);
                
                return results;
                
            } catch (error) {
                this.logger.error('FormAutoFiller', 
                    'Error during form fill', error);
                return {
                    shape: false,
                    shipping: false,
                    handover: false
                };
            }
        }
    }

    //===================================================================================
    // DOM MANIPULATOR
    //===================================================================================
    
    /**
     * Handles DOM manipulations including element reordering and hiding
     * Improves page layout by reorganizing content
     */
    class DOMManipulator {
        constructor(logger) {
            this.logger = logger;
            this.config = CONFIG.dom;
            
            this.logger.info('DOMManipulator', 'DOM manipulator initialized');
        }

        /**
         * Safely get element by ID with error handling
         * @param {string} id - Element ID
         * @returns {Element|null} Found element or null
         */
        safeGetElementById(id) {
            try {
                if (!id) {
                    this.logger.warn('DOMManipulator', 
                        'Empty ID provided');
                    return null;
                }
                
                return document.getElementById(id);
            } catch (error) {
                this.logger.error('DOMManipulator', 
                    `Error getting element by ID: ${id}`, error);
                return null;
            }
        }

        /**
         * Move bids and soldHistoryChart divs above asks div
         * @returns {boolean} Success status
         */
        reorderBookOffers() {
            try {
                this.logger.info('DOMManipulator', 
                    'Reordering book offers divs');
                
                const bidsDiv = this.safeGetElementById(
                    this.config.divIds.bids
                );
                const soldHistoryChartDiv = this.safeGetElementById(
                    this.config.divIds.soldHistoryChart
                );
                const asksDiv = this.safeGetElementById(
                    this.config.divIds.asks
                );
                
                if (!bidsDiv || !soldHistoryChartDiv || !asksDiv) {
                    this.logger.debug('DOMManipulator', 
                        'One or more required divs not found');
                    return false;
                }
                
                if (!asksDiv.parentNode) {
                    this.logger.warn('DOMManipulator', 
                        'Asks div has no parent node');
                    return false;
                }
                
                // Move bids div before asks div
                asksDiv.parentNode.insertBefore(bidsDiv, asksDiv);
                this.logger.debug('DOMManipulator', 
                    'Moved bids div before asks div');
                
                // Move soldHistoryChart div before asks div
                asksDiv.parentNode.insertBefore(soldHistoryChartDiv, asksDiv);
                this.logger.debug('DOMManipulator', 
                    'Moved soldHistoryChart div before asks div');
                
                this.logger.info('DOMManipulator', 
                    'Book offers divs reordered successfully');
                
                return true;
                
            } catch (error) {
                this.logger.error('DOMManipulator', 
                    'Error reordering book offers', error);
                return false;
            }
        }

        /**
         * Hide specified elements
         * @returns {Object} Results for each element
         */
        hideElements() {
            try {
                this.logger.info('DOMManipulator', 
                    'Hiding specified elements');
                
                const results = {
                    tags: false,
                    creditsAndShelfSelector: false
                };
                
                // Hide tags div
                const tagsDiv = this.safeGetElementById(
                    this.config.divIds.tags
                );
                
                if (tagsDiv) {
                    tagsDiv.style.display = 'none';
                    results.tags = true;
                    this.logger.debug('DOMManipulator', 
                        'Tags div hidden');
                } else {
                    this.logger.debug('DOMManipulator', 
                        'Tags div not found');
                }
                
                // Hide credits and shelf selector div
                const creditsDiv = this.safeGetElementById(
                    this.config.divIds.creditsAndShelfSelector
                );
                
                if (creditsDiv) {
                    creditsDiv.style.display = 'none';
                    results.creditsAndShelfSelector = true;
                    this.logger.debug('DOMManipulator', 
                        'Credits and shelf selector div hidden');
                } else {
                    this.logger.debug('DOMManipulator', 
                        'Credits and shelf selector div not found');
                }
                
                const successCount = Object.values(results)
                    .filter(v => v === true).length;
                
                this.logger.info('DOMManipulator', 
                    `Elements hidden (${successCount}/2 successful)`);
                
                return results;
                
            } catch (error) {
                this.logger.error('DOMManipulator', 
                    'Error hiding elements', error);
                return {
                    tags: false,
                    creditsAndShelfSelector: false
                };
            }
        }

        /**
         * Execute all DOM manipulations
         * @returns {Object} Results of all operations
         */
        manipulateAll() {
            try {
                this.logger.info('DOMManipulator', 
                    'Starting DOM manipulations');
                
                const startTime = Date.now();
                
                const results = {
                    reorder: false,
                    hide: {}
                };
                
                // Reorder divs
                results.reorder = this.reorderBookOffers();
                
                // Hide elements
                results.hide = this.hideElements();
                
                const duration = Date.now() - startTime;
                
                this.logger.info('DOMManipulator', 
                    `DOM manipulations completed in ${duration}ms`);
                
                return results;
                
            } catch (error) {
                this.logger.error('DOMManipulator', 
                    'Error during DOM manipulations', error);
                return {
                    reorder: false,
                    hide: {}
                };
            }
        }
    }

    //===================================================================================
    // PRICE CALCULATOR
    //===================================================================================
    
    /**
     * Calculates average price from current book offers
     * Updates the header with calculated average price
     */
    class PriceCalculator {
        constructor(logger) {
            this.logger = logger;
            this.config = CONFIG.price;
            
            this.logger.info('PriceCalculator', 'Price calculator initialized');
        }

        /**
         * Extract numeric price from text
         * @param {string} priceText - Price text (e.g., "250 Kč")
         * @returns {number|null} Numeric price or null
         */
        extractPrice(priceText) {
            try {
                if (!priceText) {
                    return null;
                }
                
                // Remove currency symbol and whitespace, parse as integer
                const cleanText = priceText
                    .replace(this.config.currency, '')
                    .replace(/\s+/g, '')
                    .trim();
                
                const price = parseInt(cleanText, 10);
                
                if (isNaN(price)) {
                    this.logger.debug('PriceCalculator', 
                        `Could not parse price from: ${priceText}`);
                    return null;
                }
                
                return price;
                
            } catch (error) {
                this.logger.error('PriceCalculator', 
                    'Error extracting price', error);
                return null;
            }
        }

        /**
         * Calculate average price from price elements
         * @returns {number|null} Average price or null
         */
        calculateAveragePrice() {
            try {
                this.logger.info('PriceCalculator', 
                    'Calculating average price');
                
                const priceElements = document.querySelectorAll(
                    this.config.selector
                );
                
                if (!priceElements || priceElements.length === 0) {
                    this.logger.debug('PriceCalculator', 
                        'No price elements found');
                    return null;
                }
                
                this.logger.debug('PriceCalculator', 
                    `Found ${priceElements.length} price elements`);
                
                const prices = [];
                
                priceElements.forEach(element => {
                    if (!element || !element.textContent) return;
                    
                    const priceText = element.textContent.trim();
                    const price = this.extractPrice(priceText);
                    
                    if (price !== null) {
                        prices.push(price);
                        this.logger.debug('PriceCalculator', 
                            `Extracted price: ${price} Kč`);
                    }
                });
                
                if (prices.length === 0) {
                    this.logger.warn('PriceCalculator', 
                        'No valid prices extracted');
                    return null;
                }
                
                const sum = prices.reduce((acc, price) => acc + price, 0);
                const average = Math.round(sum / prices.length);
                
                this.logger.info('PriceCalculator', 
                    `Average price calculated: ${average} Kč (from ${prices.length} prices)`);
                
                return average;
                
            } catch (error) {
                this.logger.error('PriceCalculator', 
                    'Error calculating average price', error);
                return null;
            }
        }

        /**
         * Update header with average price
         * @param {number} averagePrice - Average price to display
         * @returns {boolean} Success status
         */
        updateHeader(averagePrice) {
            try {
                if (averagePrice === null || averagePrice === undefined) {
                    this.logger.warn('PriceCalculator', 
                        'Invalid average price provided');
                    return false;
                }
                
                this.logger.info('PriceCalculator', 
                    'Updating header with average price');
                
                const asksDiv = document.getElementById(
                    CONFIG.dom.divIds.asks
                );
                
                if (!asksDiv) {
                    this.logger.warn('PriceCalculator', 
                        'Asks div not found');
                    return false;
                }
                
                const header = asksDiv.querySelector(
                    this.config.headerSelector
                );
                
                if (!header) {
                    this.logger.warn('PriceCalculator', 
                        'Header element not found');
                    return false;
                }
                
                const headerText = this.config.headerTemplate
                    .replace('{price}', averagePrice);
                
                header.innerHTML = headerText;
                
                this.logger.info('PriceCalculator', 
                    `Header updated: ${headerText}`);
                
                return true;
                
            } catch (error) {
                this.logger.error('PriceCalculator', 
                    'Error updating header', error);
                return false;
            }
        }

        /**
         * Execute price calculation and header update
         * @returns {boolean} Success status
         */
        execute() {
            try {
                this.logger.info('PriceCalculator', 
                    'Executing price calculation');
                
                const startTime = Date.now();
                
                const averagePrice = this.calculateAveragePrice();
                
                if (averagePrice === null) {
                    this.logger.info('PriceCalculator', 
                        'No average price calculated, skipping header update');
                    return false;
                }
                
                const success = this.updateHeader(averagePrice);
                
                const duration = Date.now() - startTime;
                
                this.logger.info('PriceCalculator', 
                    `Price calculation executed in ${duration}ms`);
                
                return success;
                
            } catch (error) {
                this.logger.error('PriceCalculator', 
                    'Error executing price calculation', error);
                return false;
            }
        }
    }

    //===================================================================================
    // SEARCH BOX ENHANCER
    //===================================================================================
    
    /**
     * Enhances search box with clear button functionality
     * Adds a button to quickly clear search input
     */
    class SearchBoxEnhancer {
        constructor(logger) {
            this.logger = logger;
            this.config = CONFIG.searchBox;
            this.clearButton = null;
            
            this.logger.info('SearchBoxEnhancer', 
                'Search box enhancer initialized');
        }

        /**
         * Create clear button element
         * @returns {HTMLButtonElement} Clear button element
         */
        createClearButton() {
            try {
                this.logger.debug('SearchBoxEnhancer', 
                    'Creating clear button');
                
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = this.config.clearButton.text;
                
                // Apply styles
                button.style.position = 'absolute';
                button.style.right = this.config.clearButton.position.right;
                button.style.top = this.config.clearButton.position.top;
                button.style.transform = 'translateY(-50%)';
                button.style.padding = '0';
                button.style.border = 'none';
                button.style.background = 'none';
                button.style.cursor = this.config.clearButton.style.cursor;
                button.style.fontSize = this.config.clearButton.style.fontSize;
                button.style.color = this.config.clearButton.style.color;
                button.style.zIndex = '10';
                
                this.logger.debug('SearchBoxEnhancer', 
                    'Clear button created');
                
                return button;
                
            } catch (error) {
                this.logger.error('SearchBoxEnhancer', 
                    'Error creating clear button', error);
                return null;
            }
        }

        /**
         * Add clear button to search box
         * @returns {boolean} Success status
         */
        addClearButton() {
            try {
                this.logger.info('SearchBoxEnhancer', 
                    'Adding clear button to search box');
                
                const searchBox = document.querySelector(
                    this.config.selector
                );
                
                if (!searchBox) {
                    this.logger.debug('SearchBoxEnhancer', 
                        'Search box not found');
                    return false;
                }
                
                const inputParent = searchBox.closest('.input-append');
                
                if (!inputParent) {
                    this.logger.warn('SearchBoxEnhancer', 
                        'Search box parent element not found');
                    return false;
                }
                
                // Check if button already exists
                if (this.clearButton && this.clearButton.parentNode) {
                    this.logger.debug('SearchBoxEnhancer', 
                        'Clear button already exists');
                    return true;
                }
                
                // Create button
                this.clearButton = this.createClearButton();
                
                if (!this.clearButton) {
                    this.logger.error('SearchBoxEnhancer', 
                        'Failed to create clear button');
                    return false;
                }
                
                // Add click event listener
                this.clearButton.addEventListener('click', () => {
                    try {
                        this.logger.debug('SearchBoxEnhancer', 
                            'Clear button clicked');
                        searchBox.value = '';
                        searchBox.focus();
                    } catch (error) {
                        this.logger.error('SearchBoxEnhancer', 
                            'Error in clear button click handler', error);
                    }
                });
                
                // Set parent position to relative
                inputParent.style.position = 'relative';
                
                // Append button to parent
                inputParent.appendChild(this.clearButton);
                
                this.logger.info('SearchBoxEnhancer', 
                    'Clear button added successfully');
                
                return true;
                
            } catch (error) {
                this.logger.error('SearchBoxEnhancer', 
                    'Error adding clear button', error);
                return false;
            }
        }

        /**
         * Execute search box enhancement
         * @returns {boolean} Success status
         */
        enhance() {
            try {
                this.logger.info('SearchBoxEnhancer', 
                    'Enhancing search box');
                
                const startTime = Date.now();
                
                const success = this.addClearButton();
                
                const duration = Date.now() - startTime;
                
                this.logger.info('SearchBoxEnhancer', 
                    `Search box enhancement ${success ? 'completed' : 'failed'} in ${duration}ms`);
                
                return success;
                
            } catch (error) {
                this.logger.error('SearchBoxEnhancer', 
                    'Error enhancing search box', error);
                return false;
            }
        }
    }

    //===================================================================================
    // URL MONITOR
    //===================================================================================
    
    /**
     * Monitors URL changes in single-page applications
     * Triggers re-initialization when URL changes
     */
    class URLMonitor {
        constructor(logger, resourceManager, reinitCallback) {
            this.logger = logger;
            this.resourceManager = resourceManager;
            this.reinitCallback = reinitCallback;
            this.config = CONFIG.urlMonitor;
            this.lastUrl = location.href;
            this.observerId = null;
            this.throttleTimeout = null;
            
            this.logger.info('URLMonitor', 'URL monitor initialized');
        }

        /**
         * Handle URL change
         */
        handleUrlChange() {
            try {
                const currentUrl = location.href;
                
                if (currentUrl === this.lastUrl) {
                    return;
                }
                
                this.logger.info('URLMonitor', 
                    `URL changed: ${this.lastUrl} → ${currentUrl}`);
                
                this.lastUrl = currentUrl;
                
                // Call reinit callback
                if (typeof this.reinitCallback === 'function') {
                    try {
                        this.reinitCallback();
                    } catch (error) {
                        this.logger.error('URLMonitor', 
                            'Error in reinit callback', error);
                    }
                }
                
            } catch (error) {
                this.logger.error('URLMonitor', 
                    'Error handling URL change', error);
            }
        }

        /**
         * Throttled URL change handler
         */
        throttledHandleUrlChange() {
            if (this.throttleTimeout) {
                return;
            }
            
            this.throttleTimeout = setTimeout(() => {
                this.handleUrlChange();
                this.throttleTimeout = null;
            }, this.config.throttleDelay);
        }

        /**
         * Start monitoring URL changes
         */
        startMonitoring() {
            try {
                if (!this.config.enabled) {
                    this.logger.info('URLMonitor', 
                        'URL monitoring disabled in config');
                    return;
                }
                
                this.logger.info('URLMonitor', 
                    'Starting URL monitoring');
                
                const observer = new MutationObserver(() => {
                    this.throttledHandleUrlChange();
                });
                
                observer.observe(document, { 
                    subtree: true, 
                    childList: true 
                });
                
                this.observerId = this.resourceManager.registerObserver(
                    observer,
                    'URL change monitor'
                );
                
                this.logger.info('URLMonitor', 
                    'URL monitoring started');
                
            } catch (error) {
                this.logger.error('URLMonitor', 
                    'Error starting URL monitoring', error);
            }
        }

        /**
         * Stop monitoring URL changes
         */
        stopMonitoring() {
            try {
                if (this.observerId) {
                    this.resourceManager.disconnectObserver(this.observerId);
                    this.observerId = null;
                }
                
                if (this.throttleTimeout) {
                    clearTimeout(this.throttleTimeout);
                    this.throttleTimeout = null;
                }
                
                this.logger.info('URLMonitor', 
                    'URL monitoring stopped');
                
            } catch (error) {
                this.logger.error('URLMonitor', 
                    'Error stopping URL monitoring', error);
            }
        }
    }

    //===================================================================================
    // APPLICATION MANAGER
    //===================================================================================
    
    /**
     * Main application manager that coordinates all modules
     * Handles initialization, lifecycle, and error recovery
     */
    class ApplicationManager {
        constructor() {
            this.logger = new Logger(CONFIG.logging);
            this.resourceManager = new ResourceManager(this.logger);
            
            this.modules = {
                formAutoFiller: null,
                domManipulator: null,
                priceCalculator: null,
                searchBoxEnhancer: null,
                urlMonitor: null
            };
            
            this.isInitialized = false;
            
            this.logger.info('ApplicationManager', 
                '='.repeat(80));
            this.logger.info('ApplicationManager', 
                'TrhKnih - Production Ready Version');
            this.logger.info('ApplicationManager', 
                '='.repeat(80));
        }

        /**
         * Initialize all modules
         */
        async initializeModules() {
            try {
                this.logger.info('ApplicationManager', 
                    'Starting module initialization');
                
                const startTime = Date.now();
                
                // Initialize Form Auto-Filler
                try {
                    this.modules.formAutoFiller = new FormAutoFiller(
                        this.logger, 
                        this.resourceManager
                    );
                    await this.modules.formAutoFiller.fillAll();
                } catch (error) {
                    this.logger.error('ApplicationManager', 
                        'Failed to initialize Form Auto-Filler', error);
                }
                
                // Initialize DOM Manipulator
                try {
                    this.modules.domManipulator = new DOMManipulator(
                        this.logger
                    );
                    this.modules.domManipulator.manipulateAll();
                } catch (error) {
                    this.logger.error('ApplicationManager', 
                        'Failed to initialize DOM Manipulator', error);
                }
                
                // Initialize Price Calculator
                try {
                    this.modules.priceCalculator = new PriceCalculator(
                        this.logger
                    );
                    this.modules.priceCalculator.execute();
                } catch (error) {
                    this.logger.error('ApplicationManager', 
                        'Failed to initialize Price Calculator', error);
                }
                
                // Initialize Search Box Enhancer
                try {
                    this.modules.searchBoxEnhancer = new SearchBoxEnhancer(
                        this.logger
                    );
                    this.modules.searchBoxEnhancer.enhance();
                } catch (error) {
                    this.logger.error('ApplicationManager', 
                        'Failed to initialize Search Box Enhancer', error);
                }
                
                // Initialize URL Monitor
                try {
                    this.modules.urlMonitor = new URLMonitor(
                        this.logger,
                        this.resourceManager,
                        () => this.reinitialize()
                    );
                    this.modules.urlMonitor.startMonitoring();
                } catch (error) {
                    this.logger.error('ApplicationManager', 
                        'Failed to initialize URL Monitor', error);
                }
                
                const duration = Date.now() - startTime;
                
                this.logger.info('ApplicationManager', 
                    `All modules initialized in ${duration}ms`);
                
                this.logResourceStats();
                
            } catch (error) {
                this.logger.error('ApplicationManager', 
                    'Critical error during module initialization', error);
            }
        }

        /**
         * Reinitialize modules on URL change
         */
        async reinitialize() {
            try {
                this.logger.info('ApplicationManager', 
                    'Reinitializing modules due to URL change');
                
                const startTime = Date.now();
                
                // Reinitialize modules (except URL monitor)
                if (this.modules.formAutoFiller) {
                    await this.modules.formAutoFiller.fillAll();
                }
                
                if (this.modules.domManipulator) {
                    this.modules.domManipulator.manipulateAll();
                }
                
                if (this.modules.priceCalculator) {
                    this.modules.priceCalculator.execute();
                }
                
                if (this.modules.searchBoxEnhancer) {
                    this.modules.searchBoxEnhancer.enhance();
                }
                
                const duration = Date.now() - startTime;
                
                this.logger.info('ApplicationManager', 
                    `Modules reinitialized in ${duration}ms`);
                
            } catch (error) {
                this.logger.error('ApplicationManager', 
                    'Error during reinitialization', error);
            }
        }

        /**
         * Log current resource statistics
         */
        logResourceStats() {
            try {
                const stats = this.resourceManager.getStats();
                this.logger.info('ApplicationManager', 
                    `Resource stats - Timeouts: ${stats.timeouts}, ` +
                    `Observers: ${stats.observers}, ` +
                    `Total: ${stats.total}`
                );
            } catch (error) {
                this.logger.error('ApplicationManager', 
                    'Error logging resource stats', error);
            }
        }

        /**
         * Wait for DOM to be ready
         * @returns {Promise} Promise that resolves when DOM is ready
         */
        waitForDOMReady() {
            return new Promise((resolve) => {
                if (document.readyState === 'loading') {
                    this.logger.info('ApplicationManager', 
                        'Waiting for DOM to be ready');
                    
                    document.addEventListener('DOMContentLoaded', () => {
                        this.logger.info('ApplicationManager', 
                            'DOM ready event detected');
                        resolve();
                    });
                } else {
                    this.logger.info('ApplicationManager', 
                        'DOM already ready');
                    resolve();
                }
            });
        }

        /**
         * Initialize the application
         */
        async initialize() {
            try {
                if (this.isInitialized) {
                    this.logger.warn('ApplicationManager', 
                        'Application already initialized');
                    return;
                }
                
                this.logger.info('ApplicationManager', 
                    'Starting application initialization');
                
                // Wait for DOM
                await this.waitForDOMReady();
                
                // Initialize all modules
                await this.initializeModules();
                
                this.isInitialized = true;
                
                this.logger.info('ApplicationManager', 
                    '='.repeat(80));
                this.logger.info('ApplicationManager', 
                    'Application initialized successfully');
                this.logger.info('ApplicationManager', 
                    '='.repeat(80));
                
            } catch (error) {
                this.logger.error('ApplicationManager', 
                    'Critical error during application initialization', error);
            }
        }

        /**
         * Shutdown the application and cleanup resources
         */
        shutdown() {
            try {
                this.logger.info('ApplicationManager', 
                    'Starting application shutdown');
                
                // Stop URL monitor
                if (this.modules.urlMonitor) {
                    this.modules.urlMonitor.stopMonitoring();
                }
                
                // Cleanup all resources
                this.resourceManager.cleanupAll();
                
                this.isInitialized = false;
                
                this.logger.info('ApplicationManager', 
                    'Application shutdown completed');
                
            } catch (error) {
                this.logger.error('ApplicationManager', 
                    'Error during application shutdown', error);
            }
        }
    }

    //===================================================================================
    // APPLICATION STARTUP
    //===================================================================================
    
    try {
        // Create and initialize application
        const app = new ApplicationManager();
        
        // Initialize application
        app.initialize().catch(error => {
            console.error('Fatal error during application startup:', error);
        });
        
        // Expose app instance globally for debugging
        window.TrhKnihEnhanced = {
            app: app,
            version: '2.0.0',
            config: CONFIG
        };
        
    } catch (error) {
        console.error('Fatal error creating application:', error);
    }

})();

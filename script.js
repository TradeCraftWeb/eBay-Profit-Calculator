document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // 1. FEE CONSTANTS & RATES (Source of Truth)
    // =============================================

    const CATEGORY_RATES = {
        businessOfficeIndustrial: 0.125, // 12.5%
        healthBeauty: 0.109,          // 10.9%
        everythingElse: 0.129         // 12.9%
    };

    const FEE_CONSTANTS = {
        TOP_RATE_DISCOUNT_RATE: 0.10, // 10% reduction on Variable Fee
        REGULATORY_FEE_RATE: 0.035,  // 3.5%
        VAT_RATE: 0.20,               // 20%
        LISTING_FEE_LOW_THRESHOLD: 10.00,
        LISTING_FEE_LOW_AMOUNT: 0.30,
        LISTING_FEE_HIGH_AMOUNT: 0.40
    };

    // =============================================
    // 2. DOM REFERENCES & FORMATTING HELPERS
    // =============================================

    const elements = {
        itemName: document.getElementById('item-name'),
        itemCost: document.getElementById('item-cost'),
        postageCost: document.getElementById('postage-cost'),
        salePrice: document.getElementById('sale-price'),
        ebayAdPercentInput: document.getElementById('ebay-ad-percent'),
        sellerAccountType: document.getElementById('seller-account-type'),
        topRatedSeller: document.getElementById('top-rated-seller'),
        category: document.getElementById('category'),

        calculateBtn: document.getElementById('calculate-btn'),
        resetBtn: document.getElementById('reset-btn'),

        // Summary Results
        netProfitDisplay: document.getElementById('net-profit'),
        profitStatus: document.getElementById('profit-status'),
        profitMarginDisplay: document.getElementById('profit-margin'),
        roiDisplay: document.getElementById('roi'),

        // Display Outputs
        displaySalePrice: document.getElementById('display-sale-price'),
        displayItemCost: document.getElementById('display-item-cost'),
        displayTotalEbayFees: document.getElementById('display-total-ebay-fees'),
        displayAdvertisingFee: document.getElementById('display-advertising-fee'),
        displayVariableFee: document.getElementById('display-variable-fee'),
        displayListingFee: document.getElementById('display-listing-fee'),
        displayRegulatoryFee: document.getElementById('display-regulatory-fee'),
        displayVatFee: document.getElementById('display-vat-fee'),
        displayTotalCosts: document.getElementById('display-total-costs'),
        displayNetProfit: document.getElementById('display-net-profit'),

        // Explanation Tooltips
        varExplanation: document.getElementById('var-explanation'),
        listExplanation: document.getElementById('list-explanation'),
        regExplanation: document.getElementById('reg-explanation'),
        vatExplanation: document.getElementById('vat-explanation'),
        adExplanation: document.getElementById('ad-explanation'),

    };


    /**
     * Formats a number to GBP currency string (£X.XX).
     * @param {number} amount 
     * @returns {string}
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
    };

    /**
     * Formats a number to percentage string (X.XX%).
     * @param {number} num 
     * @returns {string}
     */
    const formatPercentage = (num) => {
        return new Intl.NumberFormat('en-GB', { style: 'percent' }).format(Math.abs(num / 100));
    };

    /**
     * Helper function to safely retrieve numeric values from inputs, defaulting to 0 if invalid.
     * @param {HTMLElement} element 
     * @returns {number}
     */
    const getInputValue = (element) => {
        const value = parseFloat(element.value);
        return isNaN(value) || value < 0 ? 0 : value;
    };

    // =============================================
    // 3. CORE CALCULATION FUNCTIONS
    // =============================================

    /**
     * Calculates the Variable Fee based on category rates and applies Top Rated discount if applicable.
     * @param {number} salePrice - Sale Price (£)
     * @returns {{variableFee: number, finalVariableFee: number}}
     */
    const calculateVariableFee = (salePrice) => {
        const categoryRate = parseFloat(elements.category.dataset.rate);
        
        // 1. Calculate normal Variable Fee (Full Precision)
        let normalVariableFee = salePrice * categoryRate;
        
        let finalVariableFee = normalVariableFee;
        let discountAmount = 0;

        if (elements.topRatedSeller.value === 'Yes') {
            // Apply 10% reduction to the Variable Fee
            discountAmount = normalVariableFee * FEE_CONSTANTS.TOP_RATE_DISCOUNT_RATE;
            finalVariableFee = normalVariableFee - discountAmount;
        }

        return {
            normalVariableFee: normalVariableFee,
            discountAmount: discountAmount,
            finalVariableFee: finalVariableFee,
        };
    };

    /**
     * Calculates the Listing Fee based on Sale Price boundaries.
     * @param {number} salePrice - Sale Price (£)
     * @returns {{fee: number}}
     */
    const calculateListingFee = (salePrice) => {
        let fee;
        if (salePrice < FEE_CONSTANTS.LISTING_FEE_LOW_THRESHOLD) {
            fee = FEE_CONSTANTS.LISTING_FEE_LOW_AMOUNT; // £0.30
        } else {
            fee = FEE_CONSTANTS.LISTING_FEE_HIGH_AMOUNT; // £0.40 (Handles £10 boundary correctly)
        }
        return { fee: fee };
    };

    /**
     * Calculates the Regulatory Fee.
     * @param {number} salePrice - Sale Price (£)
     * @returns {{fee: number}}
     */
    const calculateRegulatoryFee = (salePrice) => {
        const fee = salePrice * FEE_CONSTANTS.REGULATORY_FEE_RATE;
        return { fee: fee };
    };

    /**
     * Calculates VAT based on the sum of other fees components.
     * @param {number} varFee - Final Variable Fee (£)
     * @param {number} listingFee - Listing Fee (£)
     * @param {number} regFee - Regulatory Fee (£)
     * @returns {{vatAmount: number}}
     */
    const calculateVAT = (varFee, listingFee, regFee) => {
        // VAT is calculated on the combined: Variable Fee + Listing Fee + Regulatory Fee
        const subtotalForVat = varFee + listingFee + regFee;
        const vatAmount = subtotalForVat * FEE_CONSTANTS.VAT_RATE;
        return { vatAmount: vatAmount };
    };

    /**
     * Calculates the total fees structure, excluding advertising.
     * @param {number} salePrice 
     * @returns {{totalEbayFees: number}}
     */
    const calculateTotalEbayFees = (salePrice) => {
        // Re-run core calculations to get precise components needed for VAT calculation sequence
        const varCalc = calculateVariableFee(salePrice);
        const listingFeeObj = calculateListingFee(salePrice);
        const regulatoryFeeObj = calculateRegulatoryFee(salePrice);

        // 1. Calculate VAT based on the final Variable Fee, Listing Fee, and Regulatory Fee
        const vatCalc = calculateVAT(varCalc.finalVariableFee, listingFeeObj.fee, regulatoryFeeObj.fee);

        // 2. Total eBay Fees
        const totalEbayFees = varCalc.finalVariableFee + listingFeeObj.fee + regulatoryFeeObj.fee + vatCalc.vatAmount;
        
        return {
            totalEbayFees: totalEbayFees,
            components: {
                variableFee: varCalc.finalVariableFee,
                listingFee: listingFeeObj.fee,
                regulatoryFee: regulatoryFeeObj.fee,
                vat: vatCalc.vatAmount,
                varCalculationData: varCalc // Pass through detailed data for display
            }
        };
    };

    /**
     * Calculates the separate Advertising Fee.
     * @param {number} salePrice - Sale Price (£)
     * @param {number} adPercentDecimal - Ad % as a decimal (e.g., 0.05 for 5%)
     * @returns {{fee: number}}
     */
    const calculateAdvertisingFee = (salePrice, adPercentDecimal) => {
        const fee = salePrice * adPercentDecimal;
        return { fee: fee };
    };

    /**
     * Calculates the total overall cost to seller.
     * @param {number} itemCost 
     * @param {number} postageCost 
     * @param {number} totalEbayFees 
     * @param {number} adFee - Advertising Fee (£)
     * @returns {{totalCosts: number}}
     */
    const calculateTotalCosts = (itemCost, postageCost, totalEbayFees, adFee) => {
        const totalCosts = itemCost + postageCost + totalEbayFees + adFee;
        return { totalCosts: totalCosts };
    };

    /**
     * Calculates the Net Profit.
     * @param {number} salePrice 
     * @param {number} totalCosts - Total Cost (£)
     * @returns {{netProfit: number}}
     */
    const calculateProfit = (salePrice, totalCosts) => {
        const netProfit = salePrice - totalCosts;
        return { netProfit: netProfit };
    };

    /**
     * Calculates Profit Margin.
     * @param {number} netProfit 
     * @param {number} salePrice 
     * @returns {{margin: number}}
     */
    const calculateProfitMargin = (netProfit, salePrice) => {
        if (salePrice === 0) return { margin: 0 };
        const margin = (netProfit / salePrice) * 100;
        return { margin: margin };
    };

    /**
     * Calculates Return on Investment (ROI).
     * @param {number} netProfit 
     * @param {number} itemCost 
     * @param {number} postageCost 
     * @returns {{roi: number}}
     */
    const calculateROI = (netProfit, itemCost, postageCost) => {
        const investment = itemCost + postageCost;
        if (investment === 0) return { roi: NaN }; // Signal for N/A display
        const roi = (netProfit / investment) * 100;
        return { roi: roi };
    }

    // =============================================
    // 4. MAIN CONTROL & RENDERING LOGIC
    // =============================================

    /**
     * Main function to execute all calculations and update the UI.
     */
    const runCalculator = () => {
        // --- A. GATHER INPUTS (and validate/sanitize) ---
        const itemCost = getInputValue(elements.itemCost);
        const postageCost = getInputValue(elements.postageCost);
        const salePrice = getInputValue(elements.salePrice);
        
        // Ad % input is stored as a whole number (e.g., 5), convert to decimal rate.
        const adPercentInt = parseFloat(elements.ebayAdPercentInput.value) || 0;
        const adPercentDecimal = adPercentInt / 100;

        const sellerAccountType = elements.sellerAccountType.value; // Not used in calculation, but required for completeness
        const topRatedSellerStatus = elements.topRatedSeller.value;
        const category = elements.category.value;
        const itemName = elements.itemName.value.trim();

        // --- B. EXECUTE CALCULATIONS (In order to preserve precision) ---
        
        // 1. Variable Fee Calculation
        const varCalcData = calculateVariableFee(salePrice);

        // 2. Other Fees (Requires Sale Price)
        const listingFeeObj = calculateListingFee(salePrice);
        const regulatoryFeeObj = calculateRegulatoryFee(salePrice);

        // 3. VAT (Requires Final VF, LF, RF)
        const vatCalcData = calculateVAT(varCalcData.finalVariableFee, listingFeeObj.fee, regulatoryFeeObj.fee);

        // 4. Total eBay Fees (Summation of the above components)
        const totalEbayFees = varCalcData.finalVariableFee + listingFeeObj.fee + regulatoryFeeObj.fee + vatCalcData.vatAmount;
        const totalEbayFeesObj = { totalEbayFees: totalEbayFees, components: { variableFee: varCalcData.finalVariableFee, listingFee: listingFeeObj.fee, regulatoryFee: regulatoryFeeObj.fee, vat: vatCalcData.vatAmount, varCalculationData: varCalcData } };

        // 5. Advertising Fee
        const adFeeObj = calculateAdvertisingFee(salePrice, adPercentDecimal);

        // 6. Total Costs (Investment + Fees)
        const totalCostsObj = calculateTotalCosts(itemCost, postageCost, totalEbayFeesObj.totalEbayFees, adFeeObj.fee);

        // 7. Net Profit
        const profitObj = calculateProfit(salePrice, totalCostsObj.totalCosts);

        // 8. Margin & ROI
        const marginObj = calculateProfitMargin(profitObj.netProfit, salePrice);
        const roiObj = calculateROI(profitObj.netProfit, itemCost, postageCost);


        // --- C. UPDATE DISPLAY VALUES (Formatting at the end) ---

        // Summary Outputs
        elements.displaySalePrice.textContent = formatCurrency(salePrice);
        elements.displayItemCost.textContent = formatCurrency(itemCost);
        elements.displayVariableFee.textContent = formatCurrency(varCalcData.finalVariableFee);
        elements.displayListingFee.textContent = formatCurrency(listingFeeObj.fee);
        elements.displayRegulatoryFee.textContent = formatCurrency(regulatoryFeeObj.fee);
        elements.displayVatFee.textContent = formatCurrency(vatCalcData.vatAmount);
        
        elements.displayTotalEbayFees.textContent = formatCurrency(totalEbayFeesObj.totalEbayFees);
        elements.displayAdvertisingFee.textContent = formatCurrency(adFeeObj.fee);

        // Total Costs and Profit Display
        elements.displayTotalCosts.textContent = formatCurrency(totalCostsObj.totalCosts);
        elements.displayNetProfit.textContent = formatCurrency(profitObj.netProfit);

        // Status & Margin/ROI
        updateStatusAndMetrics(profitObj.netProfit, marginObj.margin, roiObj.roi);

        // Explanations (Details)
        generateExplanations(varCalcData, listingFeeObj.fee, regulatoryFeeObj.fee, vatCalcData.vatAmount, adFeeObj.fee, varCalcData.normalVariableFee);

    };


    /**
     * Updates the profit status badge and margin/ROI displays.
     * @param {number} netProfit 
     * @param {number} marginPercent 
     * @param {number|NaN} roiValue 
     */
    const updateStatusAndMetrics = (netProfit, marginPercent, roiValue) => {
        // Profit Status Badge Logic
        let statusClass = '';
        let statusText = '';
        if (netProfit > 0.01) { // Use a small threshold for positive check
            statusClass = 'profitable';
            statusText = '✓ PROFITABLE';
        } else if (Math.abs(netProfit) < 0.01 && Math.abs(netProfit) > -0.01) {
            // Check if profit is effectively zero (within calculation error margin)
            statusClass = 'break-even';
            statusText = '⚖ BREAK EVEN';
        } else {
            statusClass = 'loss';
            statusText = '✕ LOSS';
        }

        elements.netProfitDisplay.parentElement.querySelector('.status-badge').className = `status-badge ${statusClass}`;
        elements.netProfitDisplay.parentElement.querySelector('.status-badge').textContent = statusText;


        // Margin Display
        const marginFormatted = `${marginPercent.toFixed(1)}%`;
        elements.profitMarginDisplay.textContent = marginFormatted;

        // ROI Display
        if (isNaN(roiValue) || !isFinite(roiValue)) {
            elements.roiDisplay.textContent = 'N/A';
        } else {
            const roiFormatted = `${roiValue.toFixed(1)}%`;
            elements.roiDisplay.textContent = roiFormatted;
        }
    };

     /**
      * Generates the explanatory text below the fee breakdown items.
      */
    const generateExplanations = (varData, listingFee, regFee, vatAmount, adFee, normalVarFee) => {
        // Variable Fee Explanation
        let varExplanationText = "";
        if (varData.finalVariableFee !== varData.normalVariableFee) {
            varExplanationText += `Top Rated discount applied: ${formatCurrency(varData.discountAmount)} (${(varData.discountAmount / normalVarFee * 100).toFixed(1)}% reduction).\n`;
        }
        varExplanationText += `Calculation: £${formatNumber(normalVarFee)} × ${(parseFloat(elements.category.dataset.rate) * 100).toFixed(1)}% = £${formatNumber(normalVarFee)}\n`;
        varExplanationText += `Final Variable Fee: £${formatNumber(varData.finalVariableFee)}`;
        elements.varExplanation.textContent = varExplanationText;

        // Listing Fee Explanation
        let listExplanationText = `Sale Price is ${parseFloat(elements.salePrice.value).toFixed(2)}.${listingFee < 0 ? '' : ' Below £10.00 (Flat fee)'.includes(String(listingFee)) ? ', or' : ''} £${formatNumber(listingFee)} (${listingFee == 0.30 ? '<£10.00' : '≥£10.00'}).`;
        elements.listExplanation.textContent = listExplanationText;

        // Regulatory Fee Explanation
        const regPercentDisplay = (parseFloat(FEE_CONSTANTS.REGULATORY_FEE_RATE) * 100).toFixed(1);
        elements.regExplanation.textContent = `Calculation: £${formatNumber(salePrice)} × ${regPercentDisplay}% (${FEE_CONSTANTS.REGULATORY_FEE_RATE * 100}% rate)`;

        // VAT Explanation
        const subtotalForVatText = `£${formatNumber(varData.finalVariableFee + listingFee + regFee)}`;
        elements.vatExplanation.textContent = `VAT calculated on (VF + LF + RF) = ${subtotalForVatText} × 20%`;

         // Advertising Fee Explanation
        const adPercentDisplay = (parseFloat(elements.ebayAdPercentInput.value) || 0).toFixed(1);
        elements.adExplanation.textContent = `Calculation: £${formatNumber(salePrice)} × ${adPercentDisplay}% (${adPercentDecimal * 100}%)`;

    };


    // Utility to format numbers for explanation text (no currency symbol, fixed decimals)
    const formatNumber = (num) => num.toFixed(2).toString().replace('.0', ''); // Simple removal of .0 if whole number

    /**
     * Handles validation and triggers calculation run.
     */
    const handleCalculate = () => {
        // Basic Validation Check
        if (!elements.itemCost.value && !elements.postageCost.value && !elements.salePrice.value) {
            alert("Please enter at least a Sale Price, Item Cost, or Postage Cost to calculate.");
            return;
        }
        runCalculator();
    };

    /**
     * Resets all form fields and the results display.
     */
    const handleReset = () => {
        elements.itemName.value = '';
        elements.itemCost.value = '0.00';
        elements.postageCost.value = '0.00';
        elements.salePrice.value = '100.00'; // Reset to a default value for better UX on reset
        elements.ebayAdPercentInput.value = 5;
        elements.sellerAccountType.value = 'business';
        elements.topRatedSeller.value = 'No';
        // Use the selected option's initial state or default value
        const initialCategoryOption = elements.category.querySelector('option[selected]');
        if (initialCategoryOption) {
            elements.category.value = initialCategoryOption.value;
        }

        // Force recalculation to show zeroed results based on new defaults
        runCalculator(); 
    };


    // =============================================
    // 5. EVENT LISTENERS & INITIALIZATION
    // =============================================

    // Attach listeners to all relevant inputs for live updating feel
    const inputListeners = [
        elements.itemCost, elements.postageCost, elements.salePrice, 
        elements.ebayAdPercentInput, elements.sellerAccountType, 
        elements.topRatedSeller, elements.category, elements.itemName
    ];

    // Use 'input' event for real-time feel on text/number changes
    inputListeners.forEach(el => {
        el.addEventListener('input', () => {
            runCalculator();
        });
    });

    // Button Listeners (for explicit calculation trigger)
    elements.calculateBtn.addEventListener('click', handleCalculate);
    elements.resetBtn.addEventListener('click', handleReset);

    // Initial run to populate results with default values (e.g., £0.00 for initial setup)
    handleReset(); 
});

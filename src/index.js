const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config.json');

const CONFIG = {
    PARENT_URL: config.PARENT_URL,
    CHECK_INTERVAL: config.CHECK_INTERVAL,
};

// Retry helper function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000, context = '') => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            const backoffDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s
            console.log(`  ⚠ Attempt ${attempt}/${maxRetries} failed${context ? ` for ${context}` : ''}. Retrying in ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }
};

// Clean HTML entities and whitespace from text
const cleanText = (text) => {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    
    // Replace newlines and multiple whitespace with single space
    cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned || null;
};

// Request-based fetching for watches listing page
const fetchWatchesPage = async (url = 'https://www.automatedtime.be/watches') => {
    return await retryWithBackoff(async () => {
        const response = await axios.get(url, {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'cookie': 'server-session-bind=a6a6ffbb-c32e-41ef-94ff-a285fa3c6cee; XSRF-TOKEN=1762371126|GNxUxJrE6DyU; hs=-2138417892; svSession=b50a30e81514bdbf60263350b31afab418db66e3135767a6cbf8f4b3d60e84677b75b630e6c79c479da20226e16fa2ac1e60994d53964e647acf431e4f798bcd1786eb707896f132a5589eac58553ee2f057421e7dc47b2ad22b2d5ed94bdb10cba21b45d42a2f45946247d2a4ab0c07d2d95dcd6e5c7ecde497f75d65b0d242b9c7e728984ad5426883652eaf0926a4; consent-policy=%7B%22ess%22%3A1%2C%22func%22%3A1%2C%22anl%22%3A1%2C%22adv%22%3A1%2C%22dt3%22%3A1%2C%22ts%22%3A29372852%7D; bSession=b7a62caa-e87c-4265-892d-7aed86808587|1; ssr-caching=cache#desc=miss#varnish=miss_miss#dc#desc=fastly_uw2-pub-1_g',
                'priority': 'u=0, i',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
            },
            responseType: 'text',
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 400
        });

        return response.data;
    }, 3, 1000, `watches page ${url}`);
};

// Request-based fetching for product page
const fetchProductPage = async (productUrl) => {
    return await retryWithBackoff(async () => {
        const response = await axios.get(productUrl, {
            headers: {
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'cache-control': 'max-age=0',
                'cookie': 'server-session-bind=a6a6ffbb-c32e-41ef-94ff-a285fa3c6cee; XSRF-TOKEN=1762371126|GNxUxJrE6DyU; hs=-2138417892; svSession=b50a30e81514bdbf60263350b31afab418db66e3135767a6cbf8f4b3d60e84677b75b630e6c79c479da20226e16fa2ac1e60994d53964e647acf431e4f798bcd1786eb707896f132a5589eac58553ee2f057421e7dc47b2ad22b2d5ed94bdb10cba21b45d42a2f45946247d2a4ab0c07d2d95dcd6e5c7ecde497f75d65b0d242b9c7e728984ad5426883652eaf0926a4; consent-policy=%7B%22ess%22%3A1%2C%22func%22%3A1%2C%22anl%22%3A1%2C%22adv%22%3A1%2C%22dt3%22%3A1%2C%22ts%22%3A29372852%7D; bSession=b7a62caa-e87c-4265-892d-7aed86808587|1',
                'priority': 'u=0, i',
                'referer': 'https://www.automatedtime.be/watches?page=2',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
            },
            responseType: 'text',
            timeout: 30000,
            validateStatus: (status) => status >= 200 && status < 400
        });

        return response.data;
    }, 3, 1000, `product page ${productUrl}`);
};

// Extract product URLs from JSON data in HTML (from wix-warmup-data)
const extractProductUrlsFromHtml = (html) => {
    try {
        const jsonMatch = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/);
        if (!jsonMatch) {
            return { urls: [], totalCount: 0, productsOnPage: 0 };
        }

        const warmupData = JSON.parse(jsonMatch[1]);
        const appsWarmupData = warmupData.appsWarmupData;
        if (!appsWarmupData) {
            return { urls: [], totalCount: 0, productsOnPage: 0 };
        }

        let catalogData = null;
        for (const appId in appsWarmupData) {
            const appData = appsWarmupData[appId];
            for (const key in appData) {
                if (key.startsWith('initialData_default_TPASection_l7r13lbs_')) {
                    if (appData[key] && appData[key].catalog) {
                        catalogData = appData[key].catalog;
                        break;
                    }
                }
            }
            if (catalogData) break;
        }

        if (!catalogData || !catalogData.category || !catalogData.category.productsWithMetaData) {
            return { urls: [], totalCount: 0, productsOnPage: 0 };
        }

        const productsWithMetaData = catalogData.category.productsWithMetaData;
        const products = productsWithMetaData.list || [];
        const totalCount = productsWithMetaData.totalCount || 0;

        const productUrls = [];
        for (const product of products) {
            if (product.urlPart) {
                const fullUrl = `https://www.automatedtime.be/product-page/${product.urlPart}`;
                productUrls.push(fullUrl);
            }
        }

        return {
            urls: [...new Set(productUrls)],
            totalCount: totalCount,
            productsOnPage: products.length
        };
    } catch (error) {
        console.error('Error extracting product URLs from HTML:', error.message);
        return { urls: [], totalCount: 0, productsOnPage: 0 };
    }
};

// Collect all product URLs from all pages (with pagination)
const collectAllProductUrls = async () => {
    console.log('\n========================================');
    console.log('PHASE 1: COLLECTING ALL PRODUCT URLs FROM ALL PAGES');
    console.log('========================================\n');
    
    const allUrls = [];
    const visitedUrls = new Set();
    let pageNum = 1;
    let totalCount = 0;
    const maxPages = 20;
    
    while (pageNum <= maxPages) {
        const url = pageNum === 1 
            ? 'https://www.automatedtime.be/watches'
            : `https://www.automatedtime.be/watches?page=${pageNum}`;
        
        console.log(`Page ${pageNum}: Fetching ${url}...`);
        
        try {
            const html = await fetchWatchesPage(url);
            const result = extractProductUrlsFromHtml(html);
            
            if (pageNum === 1 && result.totalCount > 0) {
                totalCount = result.totalCount;
                console.log(`Total products available: ${totalCount}`);
            }
            
            if (result.productsOnPage === 0) {
                console.log(`No products found. Reached end of pagination.`);
            break;
        }
            
            let newUrlsCount = 0;
            for (const url of result.urls) {
            if (!visitedUrls.has(url)) {
                visitedUrls.add(url);
                    allUrls.push(url);
                    newUrlsCount++;
                }
            }
            
            console.log(`  → Added ${newUrlsCount} new URLs (total so far: ${allUrls.length})`);
            
            if (totalCount > 0 && allUrls.length >= totalCount) {
                console.log(`  → Collected all ${totalCount} products!`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            pageNum++;
        } catch (error) {
            console.error(`  ✗ Error fetching page ${pageNum}: ${error.message}`);
            break;
        }
    }

    console.log(`\n=== PHASE 1 COMPLETE ===`);
    console.log(`Total unique URLs collected: ${allUrls.length}`);
    
    return allUrls;
};

// Extract product data from HTML
const extractProductDataFromHtml = (html, watchUrl) => {
    const result = {
        brand: null,
        model: null,
        referenceNumber: null,
        year: null,
        price: null,
        currency: null,
        originalBox: null,
        originalPaper: null,
        condition: null,
        location: 'Turnhout Belgium',
        images: [],
        watchUrl: watchUrl
    };

    try {
        const jsonMatch = html.match(/<script[^>]*id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/);
        if (!jsonMatch) {
            console.error(`  ⚠ No wix-warmup-data script tag found for ${watchUrl}`);
            return result;
        }

        const warmupData = JSON.parse(jsonMatch[1]);
        
        // Check if warmupData is empty (some products have empty {} )
        if (Object.keys(warmupData).length === 0) {
            console.warn(`  ⚠ Empty wix-warmup-data for ${watchUrl} - data may be loaded dynamically`);
            return result;
        }
        
        const appsWarmupData = warmupData.appsWarmupData;
        
        if (!appsWarmupData) {
            console.warn(`  ⚠ No appsWarmupData found in wix-warmup-data for ${watchUrl}`);
            return result;
        }

        let product = null;
        for (const appId in appsWarmupData) {
            const appData = appsWarmupData[appId];
            for (const key in appData) {
                if (appData[key] && appData[key].catalog && appData[key].catalog.product) {
                    product = appData[key].catalog.product;
                    break;
                }
            }
            if (product) break;
        }

        if (!product) {
            return result;
            }

            // Extract price and currency
        if (product.price !== undefined && product.price !== null) {
            result.price = product.price;
        }
        if (product.currency) {
            result.currency = product.currency;
        }

        // FIRST PRIORITY: Extract brand, model, reference, year from additionalInfo array
        if (Array.isArray(product.additionalInfo)) {
            product.additionalInfo.forEach(info => {
                const title = info.title ? info.title.toLowerCase() : '';
                const description = info.description || '';
                const cleanedText = cleanText(description);
                
                if (title === 'brand' && cleanedText) {
                    result.brand = cleanedText;
                } else if (title === 'model' && cleanedText) {
                    result.model = cleanedText;
                } else if (title === 'reference' && cleanedText) {
                    result.referenceNumber = cleanedText;
                } else if (title === 'year') {
                    // Check if it's already in "+/- YYYY" format
                    if (cleanedText && cleanedText.includes('+/-')) {
                        result.year = cleanedText;
                    } else {
                        // Try to extract year number
                        const year = parseInt(cleanedText);
                        if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear() + 1) {
                            result.year = year;
                        }
                    }
                }
            });
        }

        // SECOND PRIORITY: Extract brand, model, reference, year from description if not found in additionalInfo
        if (product.description && (!result.brand || !result.model || !result.referenceNumber || !result.year)) {
            const descText = cleanText(product.description);
            const descLower = descText ? descText.toLowerCase() : '';
            
            // Extract brand (look for common watch brands)
            if (!result.brand) {
                const brandPatterns = [
                    // Multi-word brands first (to avoid partial matches)
                    /\b(audemars\s+piguet|patek\s+philippe|tag\s+heuer|grand\s+seiko|vacheron\s+constantin|jaeger[-\s]?lecoultre)\b/i,
                    // Single-word brands
                    /\b(rolex|cartier|patek|philippe|audemars|piguet|omega|breitling|tudor|iwc|panerai|vacheron|constantin|jaeger|lecoultre|breguet|blancpain|hublot|zenith|seiko|casio|citizen|orient)\b/i
                ];
                for (const pattern of brandPatterns) {
                    const match = descText.match(pattern);
                    if (match) {
                        // Capitalize first letter of each word
                        result.brand = match[1].split(/[\s-]+/).map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                        break;
                    }
                }
            }
            
            // Extract reference number (typically format like: 126710BLNR, 116610LN, etc.)
            if (!result.referenceNumber) {
                // First try: Look for "Reference: 126710BLNR" pattern
                // Match reference number that's followed by keywords like "Condition", "Year", "Set", etc.
                const refMatch = descText.match(/\b(?:[Rr]eference|Ref)[\s:]*([0-9]{5,6}[A-Z]{2,6})(?=Condition|Year|Set|Warranty|$|[^A-Z0-9])/i);
                if (refMatch && refMatch[1]) {
                    const ref = refMatch[1].toUpperCase();
                    // Validate: should be 7-12 characters total (5-6 digits + 2-6 letters)
                    if (ref.length >= 7 && ref.length <= 12 && /^[0-9]{5,6}[A-Z]{2,6}$/.test(ref)) {
                        result.referenceNumber = ref;
                    }
                }
                
                // Fallback: Try pattern without "Reference:" prefix, but look for common keywords after
                if (!result.referenceNumber) {
                    const refPattern = /([0-9]{5,6}[A-Z]{2,6})(?=Condition|Year|Set|Warranty|Model|$|[^A-Z0-9])/i;
                    const match = descText.match(refPattern);
                    if (match && match[1]) {
                        const ref = match[1].toUpperCase();
                        // Validate: should be 7-12 characters total and match pattern
                        if (ref.length >= 7 && ref.length <= 12 && /^[0-9]{5,6}[A-Z]{2,6}$/.test(ref)) {
                            result.referenceNumber = ref;
                        }
                    }
                }
            }
            
            // Extract model (look for model names like "GMT-Master II", "Submariner", "Datejust", "Code 11.59", etc.)
            if (!result.model) {
                // Common watch models - try to match full model names
                const modelPatterns = [
                    /(?:[Mm]odel|Model:)[\s:]*([A-Za-z0-9\s\.-]+?)(?:\s|"|,|$)/,
                    // Specific models with numbers/periods (e.g., "Code 11.59")
                    /(Code\s+11\.59|Code\s+11[\.\s]?59)/i,
                    // Common Rolex models
                    /(GMT[- ]?Master\s+II(?:\s+[^,\s]+)?|Submariner|Datejust|Day[- ]?Date|Yacht[- ]?Master|Sea[- ]?Dweller|Explorer\s+I{1,2}|Air[- ]?King|Milgauss|Sky[- ]?Dweller|Cellini|Oyster\s+Perpetual)/i,
                    /("Batgirl"|"Batman"|"Pepsi"|"Hulk"|"Kermit"|"Starbucks")/i,
                    /GMT[- ]?Master\s+II\s+([^,\s]+)/i  // Match "GMT Master II Batgirl"
                ];
                
                for (const pattern of modelPatterns) {
                    const match = descText.match(pattern);
                    if (match) {
                        let modelName = match[1] || match[0];
                        // If it's the full match, try to extract just the model part
                        if (match[0] && match[0].includes('GMT')) {
                            const gmtMatch = match[0].match(/(GMT[- ]?Master\s+II(?:\s+[^,\s]+)?)/i);
                            if (gmtMatch) {
                                modelName = gmtMatch[1];
                            }
                        }
                        modelName = modelName.trim();
                        // Clean up common patterns
                        modelName = modelName.replace(/^["']|["']$/g, ''); // Remove quotes
                        // Don't accept single letter models (like "s")
                        if (modelName.length > 1) {
                            result.model = modelName;
                            break;
                        }
                    }
                }
            }
            
            // Extract year (look for dates like 07/2025, 2025, approximately 1970, +/- 1970, etc.)
            if (!result.year) {
                // First try: Look for "Year: 2022" pattern (direct label) - handle cases with or without space before "Year"
                const yearLabelMatch = descText.match(/Year[\s:]+(\d{4})(?=\D|$)/i);
                if (yearLabelMatch) {
                    const year = parseInt(yearLabelMatch[1]);
                    if (year > 1900 && year <= new Date().getFullYear() + 1) {
                        result.year = year;
                    }
                }
                
                // Second try: Look for "+/- 1970" pattern (preserve the +/- prefix)
                if (!result.year) {
                    const plusMinusMatch = descText.match(/\b(\+\/\-|\+\/)\s*(\d{4})\b/i);
                    if (plusMinusMatch) {
                        const year = parseInt(plusMinusMatch[2]);
                        if (year > 1900 && year <= new Date().getFullYear() + 1) {
                            result.year = `+/- ${year}`;
                        }
                    }
                }
                
                // Third try: Look for phrases like "approximately 1970", "around 1970", "dated to 1970"
                if (!result.year) {
                    const yearPhraseMatch = descText.match(/\b(?:approximately|around|dated?\s+to|dated|from|circa)\s*(\d{4})\b/i);
                    if (yearPhraseMatch) {
                        const year = parseInt(yearPhraseMatch[1]);
                        if (year > 1900 && year <= new Date().getFullYear() + 1) {
                            result.year = `+/- ${year}`;
                        }
                    }
                }
                
                // Fourth try: Date format like 07/2025
                if (!result.year) {
                    const dateMatch = descText.match(/\b(\d{1,2})\/(\d{4})\b/);
                    if (dateMatch) {
                        const year = parseInt(dateMatch[2]);
                        if (year > 1900 && year <= new Date().getFullYear() + 1) {
                            result.year = year;
                        }
                    }
                }

                // Fifth try: Simple 4-digit year pattern (but prefer years that appear in context)
                if (!result.year) {
                    // Look for 4-digit years that are likely dates (1900-2050)
                    const yearMatches = descText.match(/\b(19[0-9]{2}|20[0-9]{2})\b/g);
                    if (yearMatches && yearMatches.length > 0) {
                        // Take the first valid year found
                        for (const yearStr of yearMatches) {
                            const year = parseInt(yearStr);
                            if (year > 1900 && year <= new Date().getFullYear() + 1) {
                                result.year = year;
                                break;
                            }
                        }
                    }
                }
            }
        }

        // FIRST PRIORITY: Extract condition, originalBox, originalPaper from description
        let foundBoxInDescription = false;
        let foundConditionInDescription = false;
        
        if (product.description) {
            const descText = product.description.toLowerCase();
            
            // Check for unworn/new condition
            if (descText.includes('new') || descText.includes('unworn') || descText.includes('mint') || descText.includes('like-new') || descText.includes('never worn') || descText.includes('brand new') ||
                /pristine\s+\w*\s*condition/.test(descText)) {
                result.condition = 'unworn';
                foundConditionInDescription = true;
            } 
            // Check for worn/used condition (including excellent condition, very good condition, etc.)
            // Use regex to handle cases like "excellent overall condition", "very good condition", etc.
            else if (descText.includes('worn') || descText.includes('used') || 
                     descText.includes('signs of wear') || descText.includes('shows wear') ||
                     /excellent\s+\w*\s*condition/.test(descText) ||
                     /very\s+good\s+condition/.test(descText) ||
                     /perfect\s+\w*\s*condition/.test(descText) ||
                     /great\s+\w*\s*condition/.test(descText) ||
                     /amazing\s+\w*\s*condition/.test(descText) ||
                     descText.includes('good condition') ||
                     descText.includes('pre-owned') || descText.includes('preowned')) {
                result.condition = 'worn';
                foundConditionInDescription = true;
            }
            
            // Check for box and papers
            if (descText.includes('full set')) {
                        result.originalBox = true;
                        result.originalPaper = true;
                foundBoxInDescription = true;
            } else if (descText.includes('no box') || descText.includes('no papers') || 
                      descText.includes('watch only') || descText.includes('no original box')) {
                // Explicitly states no box/papers
                result.originalBox = false;
                result.originalPaper = false;
                foundBoxInDescription = true;
                    } else {
                const hasBox = descText.includes('box') || descText.includes('ful set');
                const hasPaper = descText.includes('paper') || descText.includes('certificate') || descText.includes('card') || descText.includes('warranty card');
                
                if (hasBox || hasPaper) {
                    result.originalBox = hasBox;
                    result.originalPaper = hasPaper;
                    foundBoxInDescription = true;
                }
            }
        }
        
        if (!foundBoxInDescription) {
            result.originalBox = null;
            result.originalPaper = null;
        }

        // SECOND PRIORITY: Extract condition, originalBox, originalPaper from additionalInfo
        if (Array.isArray(product.additionalInfo)) {
            product.additionalInfo.forEach(info => {
                const title = info.title ? info.title.toLowerCase() : '';
                const description = info.description || '';
                const text = description.replace(/<[^>]*>/g, '').trim();
                const textLower = text.toLowerCase();
                
                if (!foundBoxInDescription && (title === 'box/papers?' || title === 'box/papers' || title === 'set')) {
                    if (textLower.includes('full set')) {
                        result.originalBox = true;
                        result.originalPaper = true;
                        foundBoxInDescription = true;
                    } else {
                        result.originalBox = textLower.includes('box') || textLower.includes('ful set');
                        result.originalPaper = textLower.includes('paper') || textLower.includes('certificate') || textLower.includes('card');
                        foundBoxInDescription = true;
                    }
                }
                
                if (!foundConditionInDescription && title === 'condition') {
                    if (textLower.includes('new') || textLower.includes('unworn') || textLower.includes('mint')) {
                        result.condition = 'unworn';
                        foundConditionInDescription = true;
                    } else if (textLower.trim()) {
                        result.condition = 'worn';
                        foundConditionInDescription = true;
                    }
                    }
                });
            }

        // Extract images from media array
        if (Array.isArray(product.media)) {
            product.media.forEach(mediaItem => {
                if (mediaItem.fullUrl) {
                    let imageUrl = mediaItem.fullUrl;
                    const baseUrlMatch = imageUrl.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^\/]+)/);
                    if (baseUrlMatch) {
                        imageUrl = baseUrlMatch[1];
                    }
                    
                    if (!result.images.includes(imageUrl)) {
                        result.images.push(imageUrl);
                            }
                        }
                    });
                }
        
        // Clean and ensure brand, model, referenceNumber are null if empty
        if (result.brand) result.brand = cleanText(result.brand);
        if (result.model) result.model = cleanText(result.model);
        if (result.referenceNumber) result.referenceNumber = cleanText(result.referenceNumber);
        
        // Set to null if empty strings
        if (result.brand === '') result.brand = null;
        if (result.model === '') result.model = null;
        if (result.referenceNumber === '') result.referenceNumber = null;
        
        if (!foundBoxInDescription) {
            result.originalBox = null;
            result.originalPaper = null;
            }

            return result;
    } catch (error) {
        console.error('Error extracting product data:', error.message);
        return result;
    }
};

// Main scraping function
const scrapeWatchData = async () => {
    console.log('Starting Automated Time Scraper (Request-based)...\n');

    try {
        // PHASE 1: Collect all product URLs
        const allProductUrls = await collectAllProductUrls();
        
        if (allProductUrls.length === 0) {
            console.error('No product URLs collected. Cannot proceed to Phase 2.');
            return [];
        }
        
        console.log('\n========================================');
        console.log('PHASE 2: SCRAPING DETAILED INFORMATION FOR EACH WATCH');
        console.log('========================================\n');
        console.log(`Processing ${allProductUrls.length} product URLs...\n`);

        const watchData = [];
        const BATCH_SIZE = 10;

        // Process URLs in batches of 10
        for (let i = 0; i < allProductUrls.length; i += BATCH_SIZE) {
            const batch = allProductUrls.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(allProductUrls.length / BATCH_SIZE);
            
            console.log(`\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} URLs)...`);

            // Process batch in parallel
            const batchPromises = batch.map(async (productUrl, index) => {
                const globalIndex = i + index + 1;
                console.log(`[${globalIndex}/${allProductUrls.length}] Scraping: ${productUrl}`);

                try {
                    const html = await fetchProductPage(productUrl);
                    const productData = extractProductDataFromHtml(html, productUrl);

                    console.log(`  ✓ Extracted: ${productData.brand || 'N/A'} - ${productData.model || 'N/A'} - ${productData.currency || 'N/A'} ${productData.price || 'N/A'}`);
                    if (productData.images && productData.images.length > 0) {
                        console.log(`    Images: ${productData.images.length} found`);
                    }
                    return productData;
                } catch (error) {
                    console.error(`  ✗ Failed to scrape: ${error.message}`);
                    // Return empty entry with URL for tracking
                    return {
                        brand: null,
                        model: null,
                        referenceNumber: null,
                        year: null,
                        price: null,
                        currency: null,
                        originalBox: null,
                        originalPaper: null,
                        condition: null,
                        location: 'Turnhout Belgium',
                        images: [],
                        watchUrl: productUrl
                    };
                }
            });

            // Wait for all requests in batch to complete
            const batchResults = await Promise.all(batchPromises);
            watchData.push(...batchResults);

            // Add delay between batches (not between individual requests)
            if (i + BATCH_SIZE < allProductUrls.length) {
                console.log(`  Waiting 2 seconds before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Save to watchData.json in project root (not src folder)
        const watchDataPath = path.join(__dirname, '..', 'watchData.json');
        fs.writeFileSync(watchDataPath, JSON.stringify(watchData, null, 2));
        console.log(`\n=== PHASE 2 COMPLETE ===`);
        console.log(`Successfully scraped ${watchData.length} out of ${allProductUrls.length} product URLs`);
        console.log(`Watch data written to ${watchDataPath}`);
        
        if (watchData.length < allProductUrls.length) {
            console.warn(`Warning: Only ${watchData.length}/${allProductUrls.length} watches were successfully scraped.`);
        }

        // Send to backend if configured
        if (config.BACK_END_URL) {
            try {
                const response = await axios.post(config.BACK_END_URL, {
                    parentUrl: config.PARENT_URL,
                    watchData: watchData
                });
                console.log('Watch data posted successfully:', response.data);
            } catch (error) {
                console.error('Error posting to backend:', error.message);
            }
        }

        return watchData;
    } catch (error) {
        console.error('Error scraping watch data:', error.message);
        return [];
    }
};

// Scheduler to run scraping periodically
const startScheduler = async () => {
    const SCRAPE_INTERVAL = 10 * 60 * 60 * 1000; // 10 hours in milliseconds

    console.log('Starting scheduler...');
    console.log(`Scraping interval: 10 hours (${SCRAPE_INTERVAL / 1000 / 60} minutes)`);

    console.log('Running initial scrape...');
    await scrapeWatchData();

    setInterval(async () => {
        try {
            console.log('Running scheduled scrape...');
            await scrapeWatchData();
        } catch (error) {
            console.error('Error in scheduled scrape:', error.message);
        }
    }, SCRAPE_INTERVAL);
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down scheduler...');
    process.exit(0);
});

// Start the scheduler
startScheduler();

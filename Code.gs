// CONFIGURATION
const SHEET_ID = ''; // Replace with your Sheet ID
const GEMINI_API_KEY = ''; // Enter your Gemini API key
const SENDERS = ['facturacion@otro.com']; // Adjust your senders

const LOCAL_CURRENCY = 'CRC'; // YOUR LOCAL CURRENCY CODE (e.g., 'CRC', 'MXN', 'COP', 'EUR')
const USD_TO_LOCAL_RATE = 580.0; // 👈 NEW CONSTANT: Fixed exchange rate (e.g., 1 USD = 580.0 CRC). ADJUST IT!
const CARD_CUT_OFF_DAY = 17; // Credit card cut-off day of the month (e.g., 17)


// 🚀 Main function: searches for emails and saves expenses
function processExpenses() {
  // Sheet initialization and verification
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Expenses');
  if (!sheet) {
    Logger.log('Error: The sheet named "Expenses" does not exist for the provided ID.');
    return;
  }
  
  // SUGGESTION: Ensure your sheet has the following 8 columns in order:
  // Date | Merchant | Category | Local Amount | Original Amount | Original Currency | Email Extract | Email ID

  // Creates the Gmail search query
  const query = SENDERS.map(r => `from:${r}`).join(' OR ');
  // Searches for emails from specified senders newer than 1 day
  const threads = GmailApp.search(`${query} newer_than:1d`);

  // Gets the IDs of emails already processed to prevent duplicates
  const data = sheet.getDataRange().getValues();
  // The email ID is in column H (index 7) in the new format. We use a Set for faster lookups.
  const processedIds = new Set(data.slice(1).map(row => row[7]).filter(id => id));

  threads.forEach(thread => {
    // ITERATES over all messages within the thread
    thread.getMessages().forEach(msg => {
      const id = msg.getId();

      // Prevents processing the same email twice
      if (processedIds.has(id)) return;

      const bodyText = msg.getPlainBody();
      const date = msg.getDate();

      // Calls Gemini for analysis
      const expense = analyzeExpenseWithGemini(bodyText);

      // --- Currency Detection and Amount Processing ---
      const amountString = expense.monto?.toString() || '';
      const amountStringUpper = amountString.toUpperCase(); // For case-insensitive detection
      
      let originalCurrency = LOCAL_CURRENCY; // Assumes local currency by default
      let isUSD = false;
      
      // Attempt more robust USD detection:
      // Look for the '$' symbol OR the word 'USD' in the amount string returned by Gemini
      if (amountStringUpper.includes('$') || amountStringUpper.includes('USD')) {
        isUSD = true;
        originalCurrency = 'USD';
      }
      
      // Cleans the amount to convert it to a number
      let cleanAmountString = amountString;
      
      // 1. Removes non-numeric characters except dots and commas
      cleanAmountString = cleanAmountString.replace(/[^\d.,]/g, ''); 
      
      // 2. Determines the decimal separator and normalizes it to a dot
      const lastComma = cleanAmountString.lastIndexOf(',');
      const lastDot = cleanAmountString.lastIndexOf('.');

      if (lastComma > lastDot) {
        // European format (comma decimal)
        cleanAmountString = cleanAmountString.replace(/\./g, '').replace(',', '.'); 
      } else {
        // American format (dot decimal)
        cleanAmountString = cleanAmountString.replace(/,/g, ''); 
      }
      
      const numericAmount = parseFloat(cleanAmountString) || 0;
      let originalAmount = numericAmount; // We record the original amount

      let finalAmount = numericAmount;
      let adjustedCategory = expense.categoria || 'Uncategorized';

      // 👈 Performs the conversion using the fixed constant if it's USD
      if (isUSD && numericAmount > 0 && LOCAL_CURRENCY !== 'USD' && USD_TO_LOCAL_RATE > 0) {
        const rate = USD_TO_LOCAL_RATE; // Uses the defined constant
        
        finalAmount = numericAmount * rate;
        // The adjusted category indicates that a conversion occurred
        adjustedCategory = `${expense.categoria || 'Uncategorized'} (Converted: 1 USD = ${rate} ${LOCAL_CURRENCY})`;
      } else if (isUSD && USD_TO_LOCAL_RATE <= 0) {
         // In case the fixed rate is not defined correctly (> 0)
         adjustedCategory = `${expense.categoria || 'Uncategorized'} (USD - Fixed Rate Error)`;
         originalCurrency = 'USD'; 
         finalAmount = numericAmount; // Keeps the USD amount unconverted
      }

      // Saves the data to the sheet (Ensure your sheet has 8 columns)
      sheet.appendRow([
        Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
        expense.comercio || 'Not Identified',
        adjustedCategory,
        finalAmount,                   // Column D: Local Amount (Converted or not)
        originalAmount,                // Column E: Original Amount
        originalCurrency,               // Column F: Original Currency
        bodyText.substring(0, 120) + '...', // Column G: Extract
        id                            // Column H: Email ID
      ]);
    }); // End of message iteration
  }); // End of thread iteration
}


// 🧠 Function that calls Gemini to analyze the email text
function analyzeExpenseWithGemini(text) {
  // Ensure the key is available
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    Logger.log('Error: The Gemini API key is not configured.');
    return { comercio: 'Configuration Error', categoria: 'Error', monto: '', razonamiento: 'API Key not configured.' };
  }

  const prompt = `
You are an expert financial data extraction assistant. Analyze the following email containing transaction information and return a single JSON object with the fields: "comercio", "categoria", "monto", and "razonamiento".

Output Rules:
- The JSON must be a valid object without code markers (DO NOT use \`\`\`json).
- Allowed categories: Comida, Transporte, Servicios, Compras, Entretenimiento, Otros.
- The "monto" field MUST contain the numeric value ALONGSIDE ITS CURRENCY SYMBOL or ABBREVIATION as it appears in the email (e.g., "$150.00", "USD 150.00", "6.99 USD", or "₡8500").
- If you do not identify the merchant, use "comercio": "No identificado".
- If you do not identify the amount, use "monto": "No detectado".

Email Text:
"""${text}"""
`;

  const url = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

  // 👈 NEW RETRY CONSTANTS
  const MAX_RETRIES = 3; 
  const RETRY_DELAY_MS = 2000; // 2 second wait between retries
  
  // Retry loop
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const payload = {
          contents: [{ parts: [{ text: prompt }] }]
      };
        
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true, 
        payload: JSON.stringify(payload)
      });

      // Check if the call was successful (Code 200)
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Attempt to parse the JSON (existing code)
        try {
          const cleanOutput = output.replace(/```json|```/g, '').trim();
          return JSON.parse(cleanOutput); // SUCCESS: Return the result
        } catch (e) {
          Logger.log(`Error parsing JSON (Attempt ${attempt}): ${e}. Output: ${output}`);
          // If JSON is malformed, we don't retry (it's a format error, not a network error)
          return { comercio: 'JSON Error', categoria: 'Error', monto: '', razonamiento: output };
        }
      } 
      // If not 200, handle the error and allow retry
      else {
        const errorText = response.getContentText();
        Logger.log(`HTTP Error ${response.getResponseCode()} (Attempt ${attempt}/${MAX_RETRIES}): ${errorText}`);
        // If it's not the last attempt, wait and retry.
        if (attempt < MAX_RETRIES) {
          Utilities.sleep(RETRY_DELAY_MS); 
        }
      }
    } 
    // Catch network or general request errors (e.g., UrlFetchApp failed)
    catch (e) {
      Logger.log(`Request Error (Attempt ${attempt}/${MAX_RETRIES}): ${e}`);
      if (attempt < MAX_RETRIES) {
        Utilities.sleep(RETRY_DELAY_MS);
      }
    }
  } // End of for loop

  // FINAL FALLBACK: If all attempts failed, return an error
  return { comercio: 'API Error', categoria: 'Total Failure', monto: '', razonamiento: `Failed after ${MAX_RETRIES} attempts.` };
}

# Gemini-Expense-Tracker

## 🚀 The ultimate **free** and secure solution for automated multi-currency expense tracking, powered by Google's full stack (Gmail, Gemini AI, Apps Script, & Sheets).

This project implements a robust, end-to-end automation pipeline designed to eliminate manual data entry for financial transactions. It leverages the power of **Google Apps Script** to connect your Gmail inbox, the **Gemini API** for intelligent data extraction, and **Google Sheets** for logging and reporting.

It's 100% built on the Google ecosystem, ensuring superior security and privacy.

---

### ✨ Key Features

* **Intelligent Data Extraction (Gemini AI):** Uses the Gemini API with a highly structured prompt to reliably extract the vendor, amount, and category from unstructured transaction emails, regardless of formatting changes across different banks/senders.
* **Multi-Currency Conversion:** Automatically detects USD expenses and converts them to your local currency (`MONEDA_LOCAL`) using a configurable fixed exchange rate, logging both the original and converted amounts.
* **High Reliability & Retry Logic:** Implements a **3-Attempt Retry Logic** with a backoff delay (`Utilities.sleep`) to handle temporary API rate limits or transient network failures, ensuring no transaction is ever missed.
* **AI-Powered Reporting:** A secondary script generates a powerful financial analysis report tailored for **credit card cycles**, including:
    * **Predictive Cost Analysis:** Calculates Average Daily Spend (ADS) and projects total expenditure by the cut-off date.
    * **Behavioral Insights:** Compares current spending to historical data and provides actionable financial recommendations (e.g., "reduce daily spending").

### 🛠️ Getting Started (Setup)

1.  **Clone the Repository:** Download the `.gs` files (or copy the code from the Gist).
2.  **Setup Google Sheets:** Create a new Google Sheet that will store your expenses.
3.  **Setup Apps Script:** Open the Sheet, go to **Extensions** $\rightarrow$ **Apps Script**, and paste the code from `procesarGastos.gs` (or your main file).
4.  **Configure Constants:** In the code file, update the following variables with your specific details:
    * `SHEET_ID`
    * `GEMINI_API_KEY`
    * `REMITENTES` (Your bank/transaction sender emails)
    * `USD_TO_LOCAL_RATE` (Your conversion rate)
5.  **Set the Trigger:** In the Apps Script dashboard, set up a time-based trigger to run the `procesarGastos()` function every hour or day.

---

### 📚 Full Guide & Detailed Explanation

For a comprehensive, step-by-step tutorial on the prompt engineering, the retry logic implementation, and the full value proposition of this solution, read the full article:

**[Stop Manual Expense Tracking: Automate Your Multi-Currency Spend with Gemini and Google Sheets (Free Tutorial)](YOUR MEDIUM ARTICLE LINK HERE)**

---

### 💬 Connect & Support

If you have any questions, feedback, or ideas for the next iteration of this project, feel free to reach out! I am actively developing the reporting functionality and would love to hear your input.

**Connect with me on LinkedIn:** [YOUR LINKEDIN PROFILE LINK HERE]

*(Please star the repo if you find this solution useful!)*

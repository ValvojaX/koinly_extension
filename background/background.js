chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get-transactions") {
        getTransactions(sender.url)
        .then(t => sendResponse({transactions: t}));
    }

    if (request.action === "calculate-profits") {
        getTransactions(sender.url)
        .then(t => calculate(t))
        .then(r => sendResponse({result: r}));
    }

    return true;
})

async function getTransactions(sender_url) {
    let url = "https://app.koinly.io";
    let cookieApiKey = await chrome.cookies.get({name: "API_KEY", url: url});
    let cookiePortfolioId = await chrome.cookies.get({name: "PORTFOLIO_ID", url: url});
    
    const clienturl = new URL(sender_url);
    let fromDate = clienturl.searchParams.get('from');
    let toDate = clienturl.searchParams.get('to');

    let apiUrl = "https://api.koinly.io/api/transactions?per_page=25&order=date";
    if (fromDate != null) {
        apiUrl += `&q[date_gteq]=${fromDate}`;
    }
    if (toDate != null) {
        apiUrl += `&q[date_lt]=${toDate}`;
    }

    let pageCount = 2;
    let requestData = {"headers": {
        "x-auth-token": cookieApiKey.value,
        "x-portfolio-token": cookiePortfolioId.value
        }
    }

    let transactionsList = [];
    for (let i = 1; i <= pageCount; i++) {
        let response = await fetch(apiUrl + "&page=" + i, requestData);
        let jsonData = await response.json();

        pageCount = jsonData["meta"]["page"]["total_pages"];
        transactionsList = transactionsList.concat(jsonData["transactions"]);
    }

    return transactionsList
}

async function calculate(transactions) {
    let value_in = 0;
    let value_out = 0;
    for (let i = 0; i < transactions.length; i++){
        let transaction = transactions[i];

        if (transaction["from"] != null) {
            if (transaction["from"]["currency"]["symbol"] === "EUR") {
                transaction["from"]["cost_basis"] = transaction["from"]["amount"];
            }
        }

        if (transaction["to"] != null) {
            if (transaction["to"]["currency"]["symbol"] === "EUR") {
                transaction["to"]["cost_basis"] = transaction["to"]["amount"];
            }
        }

        // EUR -> BANK
        if (transaction["type"] === "fiat_withdrawal") {
            continue;
        }

        // BANK -> EUR
        if (transaction["type"] === "fiat_deposit") {
            continue;
        }

        // XRP -> Ledger
        if (transaction["type"] === "crypto_deposit" && transaction["label"] == null) {
            continue;
        }

        // EUR -> XLM
        if (transaction["type"] === "buy") {
            continue;
        }

        // REALIZED PROFIT
        if (transaction["type"] === "crypto_deposit" && transaction["label"] === "realized_gain") {
            value_out += parseFloat(transaction["to"]["cost_basis"]);
            continue;
        }

        // REALIZED LOSS
        if (transaction["type"] === "crypto_withdrawal" && transaction["label"] === "realized_gain") {
            value_out += parseFloat(transaction["gain"]);
            continue;
        }

        // ETH -> BTC
        if (transaction["type"] === "exchange") {
            value_in += parseFloat(transaction["from"]["cost_basis"]);
            value_out += parseFloat(transaction["to"]["cost_basis"]);
            continue;
        }

        // ETH -> EUR
        if (transaction["type"] === "sell") {
            value_in += parseFloat(transaction["from"]["cost_basis"]);
            value_out += parseFloat(transaction["to"]["cost_basis"]) - parseFloat(transaction["fee_value"]);
            continue;
        }

        // LTC -> EUR
        if (transaction["type"] === "crypto_withdrawal") {
            value_in += parseFloat(transaction["from"]["cost_basis"]);
            value_out += parseFloat(transaction["net_value"]);
            continue;
        }

        // Binance -> Ledger
        if (transaction["type"] === "transfer") {
            value_in += parseFloat(transaction["from"]["cost_basis"]);
            value_out += parseFloat(transaction["fee_value"]);
            continue;
        }

        // EUR -> LTC
        if (transaction["type"] === "exchange") {
            value_in += parseFloat(transaction["from"]["cost_basis"]);
            value_out += parseFloat(transaction["to"]["cost_basis"]) - parseFloat(transaction["fee_value"]);
            continue;
        }
    };

    return {"value_in": value_in.toFixed(2), "value_out": value_out.toFixed(2), "profit": (value_out - value_in).toFixed(2)};
}
let enabledButtonStyle = "background:#0052cc;padding:0.375rem 0.75rem;margin:5px;border-radius:0.25rem;border:1px solid #0052cc;color:white;vertical-align:middle;";
let disabledButtonStyle = "background:#cccccc;padding:0.375rem 0.75rem;margin:5px;border-radius:0.25rem;border:1px solid #999999;color:#666666;vertical-align:middle;";

// ----------------------------------- OBSERVER -----------------------------------

let mutationObserver = new MutationObserver((mutations, observer) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.className === "content ") {
                if (location.href.includes("https://app.koinly.io/p/transactions")) {
                    let parent = node.querySelector("div.dropdown");
                    let jsonDownloadButton = createButton("Download JSON", downloadJSON);
                    let calculateButton = createButton("Calculate Profits", calculateProfits);
                    parent.insertBefore(jsonDownloadButton, parent.children[0]);
                    parent.insertBefore(calculateButton, parent.children[0]);
                }
            }
        });
    });
});

mutationObserver.observe(document.body, {childList: true, subtree: true});

// ----------------------------------- HELPERS -----------------------------------

function downloadFile(filename, data) {
    let link = document.createElement("a");
    let dataStream = new Blob([data], {type: "octet/stream"});
    let url = window.URL.createObjectURL(dataStream);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();
}

function toggleButton(button) {
    if (button.disabled == false) {
        button.disabled = true;
        button.style = disabledButtonStyle;
    } else {
        button.disabled = false;
        button.style = enabledButtonStyle;
    }
}

function createButton(text, callback) {
    let button = document.createElement("button");
    button.type = "button";
    button.innerHTML = text;
    button.style = enabledButtonStyle;
    button.onclick = callback;
    return button;
}

// ----------------------------------- CALLBACKS -----------------------------------

function downloadJSON(e) {
    toggleButton(e.target);
    chrome.runtime.sendMessage({action: "get-transactions"}, transactions => {
        downloadFile("transactions.json", JSON.stringify(transactions, null, 4));
        toggleButton(e.target);
    });
}

function calculateProfits(e) {
    toggleButton(e.target);
    chrome.runtime.sendMessage({action: "calculate-profits"}, result => {
        alert(JSON.stringify(result.result));
        toggleButton(e.target);
    });
}
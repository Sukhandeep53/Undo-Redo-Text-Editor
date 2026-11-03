const documentBox = document.getElementById("document");
const newTextBox = document.getElementById("newText");
const insertBtn = document.getElementById("insertBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const messageBox = document.getElementById("message");

const findTextBox = document.getElementById("findText");
const replaceTextBox = document.getElementById("replaceText");
const findBtn = document.getElementById("findBtn");
const replaceBtn = document.getElementById("replaceBtn");
const findResult = document.getElementById("findResult");

const highlightLayer = document.getElementById("highlightLayer");

let currentSearchText = "";

function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.toggle("error", isError);
}

async function sendRequest(endpoint, body = null) {
    const options = { method: "POST" };

    if (body !== null) {
        options.headers = {
            "Content-Type": "text/plain; charset=UTF-8"
        };

        options.body = body;
    }

    const response = await fetch(endpoint, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

// ESCAPE HTML
function escapeHTML(text) {
    return text.replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// HIGHLIGHT SEARCHED WORDS
function highlightSearchText(searchText) {
    const content = documentBox.value;

    if (!searchText) {
        highlightLayer.innerHTML = escapeHTML(content);
        return;
    }

    const escapedText = searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const regex = new RegExp(escapedText, "gi");

    let highlightedHTML = "";
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        highlightedHTML += escapeHTML(
            content.substring(lastIndex, match.index)
        );

        highlightedHTML +=
            `<mark class="highlighted-word">${escapeHTML(match[0])}</mark>`;

        lastIndex = match.index + match[0].length;
    }

    highlightedHTML += escapeHTML(content.substring(lastIndex));

    highlightLayer.innerHTML = highlightedHTML;
}

// KEEP SCROLL POSITION IN SYNC
documentBox.addEventListener("scroll", () => {
    highlightLayer.scrollTop = documentBox.scrollTop;
    highlightLayer.scrollLeft = documentBox.scrollLeft;
});

// UPDATE EDITOR AND STATISTICS
function updateEditor(state) {
    documentBox.value = state.content;

    undoBtn.disabled = !state.undoAvailable;
    redoBtn.disabled = !state.redoAvailable;

    document.getElementById("undoCount").textContent =
        state.undoCount;

    document.getElementById("redoCount").textContent =
        state.redoCount;

    document.getElementById("historyCount").textContent =
        state.history.length;

    const characters = state.content.length;

    const words = state.content.trim()
        ? state.content.trim().split(/\s+/).length
        : 0;

    document.getElementById("charCount").textContent =
        `${characters} ${characters === 1 ? "character" : "characters"}`;

    document.getElementById("wordCount").textContent =
        `${words} ${words === 1 ? "word" : "words"}`;

    const historyList = document.getElementById("historyList");

    historyList.innerHTML = "";

    if (state.history.length === 0) {
        const item = document.createElement("li");

        item.className = "empty-history";
        item.textContent = "No edits yet. Start writing!";

        historyList.appendChild(item);

    } else {
        state.history.forEach(action => {
            const item = document.createElement("li");

            item.textContent = action;
            historyList.appendChild(item);
        });
    }

    highlightSearchText(currentSearchText);
}

// REFRESH STATE
async function refreshState() {
    try {
        const response = await fetch("/api/state");

        if (!response.ok) {
            throw new Error("Could not load editor state.");
        }

        updateEditor(await response.json());

    } catch (error) {
        showMessage(
            "Cannot connect to the C++ server. Please start the backend.",
            true
        );
    }
}

// INSERT TEXT
insertBtn.addEventListener("click", async () => {
    const text = newTextBox.value;

    if (!text.trim()) {
        showMessage("Please type some text before inserting.", true);
        return;
    }

    try {
        const state = await sendRequest("/api/insert", text);

        updateEditor(state);

        newTextBox.value = "";

        showMessage("Text inserted successfully.");

    } catch (error) {
        showMessage(error.message, true);
    }
});

// UNDO
undoBtn.addEventListener("click", async () => {
    try {
        updateEditor(await sendRequest("/api/undo"));

        showMessage("Last action undone.");

    } catch (error) {
        showMessage(error.message, true);
    }
});

// REDO
redoBtn.addEventListener("click", async () => {
    try {
        updateEditor(await sendRequest("/api/redo"));

        showMessage("Action restored successfully.");

    } catch (error) {
        showMessage(error.message, true);
    }
});

// CLEAR DOCUMENT
clearBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to clear the document?")) {
        return;
    }

    try {
        updateEditor(await sendRequest("/api/clear"));

        currentSearchText = "";
        highlightSearchText("");

        findResult.textContent =
            "Search your document for any word.";

        showMessage(
            "Document cleared. You can still undo this action."
        );

    } catch (error) {
        showMessage(error.message, true);
    }
});

// FIND TEXT
findBtn.addEventListener("click", async () => {
    const searchText = findTextBox.value;

    if (!searchText.trim()) {
        findResult.textContent = "Please enter a word to search.";

        currentSearchText = "";
        highlightSearchText("");

        showMessage("Enter text before searching.", true);
        return;
    }

    try {
        const result = await sendRequest("/api/find", searchText);

        currentSearchText = searchText;

        highlightSearchText(searchText);

        findResult.textContent =
            `${result.count} matching occurrence(s) found.`;

        showMessage("Search completed successfully.");

    } catch (error) {
        findResult.textContent = error.message;

        showMessage(error.message, true);
    }
});

// REPLACE ALL TEXT
replaceBtn.addEventListener("click", async () => {
    const searchText = findTextBox.value;
    const replaceText = replaceTextBox.value;

    if (!searchText.trim()) {
        showMessage("Enter the word you want to replace.", true);
        return;
    }

    try {
        const state = await sendRequest(
            "/api/replace",
            searchText + "\n" + replaceText
        );

        updateEditor(state);

        findResult.textContent =
            "Replacement completed successfully.";

        showMessage(
            "All matching occurrences replaced successfully."
        );

    } catch (error) {
        findResult.textContent = error.message;

        showMessage(error.message, true);
    }
});

// LOAD INITIAL EDITOR STATE
refreshState();

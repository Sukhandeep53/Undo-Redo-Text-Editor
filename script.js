const documentBox = document.getElementById("document");
const newTextBox = document.getElementById("newText");
const insertBtn = document.getElementById("insertBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
const messageBox = document.getElementById("message");

function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.toggle("error", isError);
}

async function sendRequest(endpoint, body = null) {
    const options = { method: "POST" };
    if (body !== null) {
        options.headers = { "Content-Type": "text/plain; charset=UTF-8" };
        options.body = body;
    }

    const response = await fetch(endpoint, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }
    return data;
}

function updateEditor(state) {
    documentBox.value = state.content;
    undoBtn.disabled = !state.undoAvailable;
    redoBtn.disabled = !state.redoAvailable;

    document.getElementById("undoCount").textContent = state.undoCount;
    document.getElementById("redoCount").textContent = state.redoCount;
    document.getElementById("historyCount").textContent = state.history.length;

    const characters = state.content.length;
    const words = state.content.trim() ? state.content.trim().split(/\s+/).length : 0;
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
        state.history.forEach((action) => {
            const item = document.createElement("li");
            item.textContent = action;
            historyList.appendChild(item);
        });
    }
}

async function refreshState() {
    try {
        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("Could not load editor state.");
        updateEditor(await response.json());
    } catch (error) {
        showMessage("Cannot connect to the C++ server. Please start the backend.", true);
    }
}

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

undoBtn.addEventListener("click", async () => {
    try {
        updateEditor(await sendRequest("/api/undo"));
        showMessage("Last action undone.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

redoBtn.addEventListener("click", async () => {
    try {
        updateEditor(await sendRequest("/api/redo"));
        showMessage("Action restored successfully.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

clearBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to clear the document?")) return;

    try {
        updateEditor(await sendRequest("/api/clear"));
        showMessage("Document cleared. You can still undo this action.");
    } catch (error) {
        showMessage(error.message, true);
    }
});

refreshState();

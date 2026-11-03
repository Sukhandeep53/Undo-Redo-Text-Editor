
#include <iostream>
#include <string>
#include <stack>
#include <mutex>
#include <sstream>
#include <algorithm>
#include <cstdlib>
#include "httplib.h"

using namespace std;

// Doubly Linked List: stores the sequence of editor actions.
class HistoryList {
private:
    struct Node {
        string action;
        Node* prev;
        Node* next;

        explicit Node(const string& value)
            : action(value), prev(nullptr), next(nullptr) {}
    };

    Node* head;
    Node* tail;
    int count;

public:
    HistoryList() : head(nullptr), tail(nullptr), count(0) {}

    ~HistoryList() {
        Node* current = head;
        while (current != nullptr) {
            Node* nextNode = current->next;
            delete current;
            current = nextNode;
        }
    }

    void add(const string& action) {
        Node* newNode = new Node(action);

        if (head == nullptr) {
            head = tail = newNode;
        } else {
            tail->next = newNode;
            newNode->prev = tail;
            tail = newNode;
        }

        count++;

        if (count > 100) {
            Node* oldHead = head;
            head = head->next;
            head->prev = nullptr;
            delete oldHead;
            count--;
        }
    }

    string toJson() const;
};

// Escape special characters for JSON.
string jsonEscape(const string& value) {
    string result;

    for (char ch : value) {
        switch (ch) {
            case '"': result += "\\\""; break;
            case '\\': result += "\\\\"; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default:
                if (static_cast<unsigned char>(ch) < 32) {
                    result += ' ';
                } else {
                    result += ch;
                }
        }
    }

    return result;
}

string HistoryList::toJson() const {
    string result = "[";
    Node* current = head;
    bool first = true;

    while (current != nullptr) {
        if (!first) result += ",";
        result += "\"" + jsonEscape(current->action) + "\"";
        first = false;
        current = current->next;
    }

    result += "]";
    return result;
}

// Stack: previous document states for Undo and Redo.
stack<string> undoStack;
stack<string> redoStack;
string documentText;
HistoryList editHistory;
mutex editorMutex;

string makeStateJson() {
    string result = "{";
    result += "\"content\":\"" + jsonEscape(documentText) + "\",";
    result += "\"undoAvailable\":" + string(undoStack.empty() ? "false" : "true") + ",";
    result += "\"redoAvailable\":" + string(redoStack.empty() ? "false" : "true") + ",";
    result += "\"undoCount\":" + to_string(undoStack.size()) + ",";
    result += "\"redoCount\":" + to_string(redoStack.size()) + ",";
    result += "\"history\":" + editHistory.toJson();
    result += "}";

    return result;
}

int main() {
    httplib::Server server;

    // Serve website files from public folder.
    server.set_mount_point("/", "./public");

    server.Get("/api/state", [](const httplib::Request&, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);
        response.set_content(makeStateJson(), "application/json");
    });

    server.Post("/api/insert", [](const httplib::Request& request, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        if (request.body.empty()) {
            response.status = 400;
            response.set_content("{\"message\":\"Please enter some text.\"}", "application/json");
            return;
        }

        undoStack.push(documentText);
        while (!redoStack.empty()) redoStack.pop();

        documentText += request.body;
        editHistory.add("Inserted text (" + to_string(request.body.size()) + " characters)");

        response.set_content(makeStateJson(), "application/json");
    });

    server.Post("/api/find", [](const httplib::Request& request, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        string searchText = request.body;

        if (searchText.empty()) {
            response.status = 400;
            response.set_content("{\"message\":\"Please enter a word to search.\"}", "application/json");
            return;
        }

        int count = 0;
        size_t position = 0;

        while ((position = documentText.find(searchText, position)) != string::npos) {
            count++;
            position += searchText.length();
        }

        response.set_content("{\"count\":" + to_string(count) + "}", "application/json");
    });

    server.Post("/api/replace", [](const httplib::Request& request, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        size_t separator = request.body.find('\n');

        if (separator == string::npos) {
            response.status = 400;
            response.set_content("{\"message\":\"Invalid replacement request.\"}", "application/json");
            return;
        }

        string searchText = request.body.substr(0, separator);
        string replaceText = request.body.substr(separator + 1);

        if (searchText.empty()) {
            response.status = 400;
            response.set_content("{\"message\":\"Please enter a word to find.\"}", "application/json");
            return;
        }

        size_t position = 0;
        int count = 0;

        while ((position = documentText.find(searchText, position)) != string::npos) {
            position += searchText.length();
            count++;
        }

        if (count == 0) {
            response.status = 404;
            response.set_content("{\"message\":\"Word not found in the document.\"}", "application/json");
            return;
        }

        undoStack.push(documentText);
        while (!redoStack.empty()) redoStack.pop();

        position = 0;

        while ((position = documentText.find(searchText, position)) != string::npos) {
            documentText.replace(position, searchText.length(), replaceText);
            position += replaceText.length();
        }

        editHistory.add("Replaced " + to_string(count) + " occurrence(s)");

        response.set_content(makeStateJson(), "application/json");
    });

    server.Post("/api/undo", [](const httplib::Request&, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        if (undoStack.empty()) {
            response.status = 400;
            response.set_content("{\"message\":\"Nothing to undo.\"}", "application/json");
            return;
        }

        redoStack.push(documentText);
        documentText = undoStack.top();
        undoStack.pop();
        editHistory.add("Undo performed");

        response.set_content(makeStateJson(), "application/json");
    });

    server.Post("/api/redo", [](const httplib::Request&, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        if (redoStack.empty()) {
            response.status = 400;
            response.set_content("{\"message\":\"Nothing to redo.\"}", "application/json");
            return;
        }

        undoStack.push(documentText);
        documentText = redoStack.top();
        redoStack.pop();
        editHistory.add("Redo performed");

        response.set_content(makeStateJson(), "application/json");
    });

    server.Post("/api/clear", [](const httplib::Request&, httplib::Response& response) {
        lock_guard<mutex> lock(editorMutex);

        if (!documentText.empty()) {
            undoStack.push(documentText);
            documentText.clear();
            while (!redoStack.empty()) redoStack.pop();
            editHistory.add("Document cleared");
        }

        response.set_content(makeStateJson(), "application/json");
    });

    cout << "========================================\n";
    cout << "       UNDO-REDO TEXT EDITOR\n";
    cout << "========================================\n";

    // Render provides the port through the PORT environment variable.
    const char* portEnv = getenv("PORT");
    int port = portEnv ? stoi(portEnv) : 8080;

    cout << "Server running on port: " << port << "\n";

    if (!server.listen("0.0.0.0", port)) {
        cerr << "Could not start server.\n";
        return 1;
    }

    return 0;
}

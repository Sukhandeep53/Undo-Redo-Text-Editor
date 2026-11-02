# Undo–Redo Text Editor

A mini project for Advanced Data Structures, built using C++ with a browser-based frontend.

## Project details

- **Project:** Undo–Redo Text Editor
- **Language:** C++17
- **Frontend:** HTML, CSS and JavaScript
- **HTTP server library:** cpp-httplib
- **Data structures:** Stack and Doubly Linked List

## Features

1. Insert text into the document.
2. Undo the last insertion or clear operation.
3. Redo an undone operation.
4. Display the current document.
5. Display recent edit history.
6. Show undo/redo counts, word count and character count.

## How data structures are used

### 1. Stack

Two stacks are used:

- `undoStack` stores previous document states.
- `redoStack` stores states that can be restored.

When new text is inserted, the current document is pushed onto the undo stack and the redo stack is cleared.

When Undo is selected, the current document is pushed onto the redo stack and the previous state is restored.

When Redo is selected, the current document is pushed onto the undo stack and the latest redo state is restored.

### 2. Doubly Linked List

A custom doubly linked list stores editor actions. Each node contains an action and two pointers:

- `prev` points to the previous node.
- `next` points to the next node.

This allows the application to maintain the sequence of edit-history actions. The latest 100 actions are retained.

## Project structure

```text
undo-redo-text-editor/
│
├── src/
│   └── main.cpp
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── CMakeLists.txt
├── .gitignore
└── README.md
```

## Requirements

- C++17 compiler (MinGW-w64 or Visual Studio C++ build tools)
- CMake
- Git
- Internet connection for the first CMake build (to download cpp-httplib)

## Run on Windows

Open Git Bash or a terminal in the project folder.

### Step 1: Configure the project

```bash
cmake -S . -B build
```

If CMake cannot identify your compiler, install MinGW-w64 or Visual Studio C++ Build Tools and configure the compiler first.

### Step 2: Build

```bash
cmake --build build --config Release
```

### Step 3: Run the C++ server

For a typical MinGW build:

```bash
./build/undo_redo_editor.exe
```

For a Visual Studio build, the executable is usually:

```bash
./build/Release/undo_redo_editor.exe
```

### Step 4: Open the website

Visit this address in your browser:

```text
http://localhost:8080
```

Keep the terminal running while using the website. Press `Ctrl + C` in the terminal to stop the server.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/state` | Get document and editor state |
| POST | `/api/insert` | Insert text (request body is plain text) |
| POST | `/api/undo` | Undo the last action |
| POST | `/api/redo` | Redo an undone action |
| POST | `/api/clear` | Clear the document |

## Upload to GitHub using Git Bash

Create an empty repository on GitHub named `undo-redo-text-editor`. Do not initialize it with a README if you already have this project README.

Then run these commands from the project folder:

```bash
git init
git add .
git commit -m "Initial commit: Undo Redo Text Editor"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/undo-redo-text-editor.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

## Test checklist

- Insert `Hello` and check that it appears in the document.
- Insert ` World` and check that the document reads `Hello World`.
- Press Undo and check that the document reads `Hello`.
- Press Redo and check that the document reads `Hello World`.
- Clear the document and then press Undo to restore the previous content.
- Check that the edit history records each action.

## Notes

- The editor state is stored in the running C++ server's memory. Restarting the server resets the document and history.
- The server listens on port `8080`.
- The frontend and backend are served from the same local server, so no separate frontend hosting setup is needed for local testing.

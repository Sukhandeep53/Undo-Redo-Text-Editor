FROM gcc:13

WORKDIR /app

COPY . .

RUN g++ -std=c++17 -pthread main.cpp -o undo_redo_editor

EXPOSE 8080

CMD ["./undo_redo_editor"]

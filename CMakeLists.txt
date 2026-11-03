cmake_minimum_required(VERSION 3.15)

project(UndoRedoEditor)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(undo_redo_editor main.cpp)

target_include_directories(undo_redo_editor PRIVATE ${CMAKE_SOURCE_DIR})

find_package(Threads REQUIRED)
target_link_libraries(undo_redo_editor PRIVATE Threads::Threads)

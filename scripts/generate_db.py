"""Generate books.db from books.json (run in PROJECT_ACTUAL folder).

Usage:
  python scripts/generate_db.py

This script reads books.json (handles BOM) and writes books.db SQLite file.
"""
import json
import sqlite3
import os

SRC = 'books.json'
OUT = 'books.db'

with open(SRC, 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

if os.path.exists(OUT):
    print('Removing existing', OUT)
    os.remove(OUT)

conn = sqlite3.connect(OUT)
cur = conn.cursor()
cur.execute('''
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file TEXT,
  title TEXT,
  author TEXT,
  grades TEXT,
  genre TEXT,
  year INTEGER,
  desc TEXT,
  img TEXT,
  recommended INTEGER,
  literature TEXT
)
''')

insert_sql = 'INSERT INTO books (file,title,author,grades,genre,year,desc,img,recommended,literature) VALUES (?,?,?,?,?,?,?,?,?,?)'
count = 0
for b in data:
    file = b.get('file')
    title = b.get('title')
    author = b.get('author')
    grades_json = json.dumps(b.get('grades') or [])
    genre = b.get('genre')
    year = b.get('year') if isinstance(b.get('year'), int) else None
    desc = b.get('desc')
    img = b.get('img')
    recommended = 1 if b.get('recommended') else 0
    literature = b.get('literature')
    cur.execute(insert_sql, (file,title,author,grades_json,genre,year,desc,img,recommended,literature))
    count += 1

conn.commit()
print('Inserted', count, 'rows into', OUT)
conn.close()

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite DB
const db = new Database(path.join(__dirname, 'eval.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    DEFAULT '',
    name        TEXT    NOT NULL DEFAULT '(미입력)',
    manager     TEXT    DEFAULT '',
    department  TEXT    DEFAULT '',
    eval_date   TEXT    DEFAULT '',
    memo        TEXT    DEFAULT '',
    selections  TEXT    DEFAULT '{}',
    notes       TEXT    DEFAULT '{}',
    is_contract INTEGER DEFAULT 0,
    score1      REAL    DEFAULT 0,
    score2      REAL    DEFAULT 0,
    score3      REAL    DEFAULT 0,
    total       REAL    DEFAULT 0,
    grade       TEXT    DEFAULT '-',
    created_at  TEXT    DEFAULT (datetime('now','localtime')),
    updated_at  TEXT    DEFAULT (datetime('now','localtime'))
  )
`);

// 기존 DB에 code 컬럼 없으면 추가 (마이그레이션)
try {
  db.exec(`ALTER TABLE projects ADD COLUMN code TEXT DEFAULT ''`);
} catch (_) {}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const parse = (p) => ({
  ...p,
  selections: JSON.parse(p.selections || '{}'),
  notes:      JSON.parse(p.notes      || '{}'),
  is_contract: !!p.is_contract
});

// List all
app.get('/api/projects', (_req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all().map(parse));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get one
app.get('/api/projects/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(parse(row));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create
app.post('/api/projects', (req, res) => {
  try {
    const { code, name, manager, department, eval_date, memo, selections, notes,
            is_contract, score1, score2, score3, total, grade } = req.body;
    const r = db.prepare(`
      INSERT INTO projects (code,name,manager,department,eval_date,memo,selections,notes,
                            is_contract,score1,score2,score3,total,grade)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(code||'', name||'(미입력)', manager||'', department||'', eval_date||'', memo||'',
           JSON.stringify(selections||{}), JSON.stringify(notes||{}),
           is_contract?1:0, score1||0, score2||0, score3||0, total||0, grade||'-');
    res.json({ id: r.lastInsertRowid, ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update
app.put('/api/projects/:id', (req, res) => {
  try {
    const { code, name, manager, department, eval_date, memo, selections, notes,
            is_contract, score1, score2, score3, total, grade } = req.body;
    db.prepare(`
      UPDATE projects SET code=?,name=?,manager=?,department=?,eval_date=?,memo=?,
        selections=?,notes=?,is_contract=?,score1=?,score2=?,score3=?,total=?,grade=?,
        updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(code||'', name||'(미입력)', manager||'', department||'', eval_date||'', memo||'',
           JSON.stringify(selections||{}), JSON.stringify(notes||{}),
           is_contract?1:0, score1||0, score2||0, score3||0, total||0, grade||'-',
           req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete
app.delete('/api/projects/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`\n✅  사업성 평가 시스템 실행 중`);
  console.log(`    👉  http://localhost:${PORT}\n`);
});

import express from 'express';
import { initDb, pool } from './db.js';

const MAX_ID = 2147483647; // SERIAL(int4)의 최댓값

const app = express();
app.use(express.json());

// URL의 :id가 올바른 숫자가 아니면 null을 돌려준다.
function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

// 목록
app.get('/api/todos', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, completed, created_at FROM todos ORDER BY id',
  );
  res.json(rows);
});

// 추가
app.post('/api/todos', async (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title은 비어 있지 않은 문자열이어야 합니다.' });
  }
  const { rows } = await pool.query(
    'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at',
    [title.trim()],
  );
  res.status(201).json(rows[0]);
});

// 완료 표시
app.patch('/api/todos/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'id가 올바르지 않습니다.' });

  const completed = req.body?.completed;
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed는 true 또는 false여야 합니다.' });
  }
  const { rows } = await pool.query(
    'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING id, title, completed, created_at',
    [completed, id],
  );
  if (rows.length === 0) return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
  res.json(rows[0]);
});

// 삭제
app.delete('/api/todos/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'id가 올바르지 않습니다.' });

  const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
  res.status(204).end();
});

// 공통 에러 처리 (잘못된 JSON은 400, 그 외는 500)
app.use((err, req, res, next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: '요청 형식이 올바르지 않습니다.' });
  }
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

const port = process.env.PORT || 3000;

try {
  await initDb();
  app.listen(port, () => console.log(`API 서버 실행 중: http://localhost:${port}`));
} catch (err) {
  console.error('DB 초기화 실패:', err.message);
  process.exit(1);
}

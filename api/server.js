import express from 'express';
import { initDb, pool } from './db.js';

const MAX_ID = 2147483647; // SERIAL(int4)의 최댓값
const TODO_COLUMNS = 'id, title, completed, created_at, date::text AS date';

const app = express();
app.use(express.json());

// URL의 :id가 올바른 숫자가 아니면 null을 돌려준다.
function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

// YYYY-MM-DD 형식의 실제 있는 날짜인지 확인한다.
function isDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

// {"09": "회의"} 형태인지 확인하고, 내용이 빈 시간대는 뺀다. 올바르지 않으면 null.
function parseSchedule(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const schedule = {};
  for (const [hour, text] of Object.entries(value)) {
    if (!/^([01]\d|2[0-3])$/.test(hour) || typeof text !== 'string') return null;
    if (text.trim() !== '') schedule[hour] = text;
  }
  return schedule;
}

// 목록 (?date=YYYY-MM-DD를 주면 그 날짜만)
app.get('/api/todos', async (req, res) => {
  const { date } = req.query;
  if (date === undefined) {
    const { rows } = await pool.query(`SELECT ${TODO_COLUMNS} FROM todos ORDER BY id`);
    return res.json(rows);
  }
  if (!isDate(date)) return res.status(400).json({ error: 'date가 올바르지 않습니다.' });

  const { rows } = await pool.query(
    `SELECT ${TODO_COLUMNS} FROM todos WHERE date = $1 ORDER BY id`,
    [date],
  );
  res.json(rows);
});

// 추가
app.post('/api/todos', async (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title은 비어 있지 않은 문자열이어야 합니다.' });
  }
  const date = req.body?.date;
  if (!isDate(date)) return res.status(400).json({ error: 'date가 올바르지 않습니다.' });

  const { rows } = await pool.query(
    `INSERT INTO todos (title, date) VALUES ($1, $2) RETURNING ${TODO_COLUMNS}`,
    [title.trim(), date],
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
    `UPDATE todos SET completed = $1 WHERE id = $2 RETURNING ${TODO_COLUMNS}`,
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

// 날짜별 일정과 메모 조회 (아직 저장한 적 없으면 빈 값)
app.get('/api/days/:date', async (req, res) => {
  const { date } = req.params;
  if (!isDate(date)) return res.status(400).json({ error: 'date가 올바르지 않습니다.' });

  const { rows } = await pool.query('SELECT schedule, memo FROM days WHERE date = $1', [date]);
  res.json({ date, schedule: rows[0]?.schedule ?? {}, memo: rows[0]?.memo ?? '' });
});

// 날짜별 일정과 메모 저장
app.put('/api/days/:date', async (req, res) => {
  const { date } = req.params;
  if (!isDate(date)) return res.status(400).json({ error: 'date가 올바르지 않습니다.' });

  const schedule = parseSchedule(req.body?.schedule);
  if (schedule === null) return res.status(400).json({ error: 'schedule이 올바르지 않습니다.' });

  const memo = req.body?.memo;
  if (typeof memo !== 'string') return res.status(400).json({ error: 'memo는 문자열이어야 합니다.' });

  await pool.query(
    `INSERT INTO days (date, schedule, memo) VALUES ($1, $2, $3)
     ON CONFLICT (date) DO UPDATE SET schedule = $2, memo = $3`,
    [date, JSON.stringify(schedule), memo],
  );
  res.json({ date, schedule, memo });
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

import 'dotenv/config';
import pg from 'pg';

// 접속 정보는 환경 변수(PGHOST, PGUSER, PGPASSWORD 등)에서 pg가 자동으로 읽는다.
export const pool = new pg.Pool();

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      completed  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // 기존 할 일은 만든 날짜(한국 시간)로 채운다. 재시작해도 안전하게 다시 실행된다.
  await pool.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS date DATE');
  await pool.query(`
    UPDATE todos SET date = (created_at AT TIME ZONE 'Asia/Seoul')::date
    WHERE date IS NULL
  `);
  await pool.query('ALTER TABLE todos ALTER COLUMN date SET NOT NULL');

  // 날짜별 시간대 일정과 메모. schedule은 {"09": "회의"} 형태다.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS days (
      date     DATE PRIMARY KEY,
      schedule JSONB NOT NULL DEFAULT '{}',
      memo     TEXT NOT NULL DEFAULT ''
    )
  `);
}

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
}

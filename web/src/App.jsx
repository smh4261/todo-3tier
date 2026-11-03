import { useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = '/api/todos'
const DAYS_URL = '/api/days'
const SAVE_DELAY_MS = 500

// 시간대별 일정에 보여줄 시간 (06시 ~ 23시)
const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0'))

// 사용자의 현지 날짜를 YYYY-MM-DD로 돌려준다. (toISOString은 UTC 기준이라 그대로 쓰지 않는다)
function today() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

// fetch를 감싸서, 실패하면 서버가 보낸 에러 메시지로 예외를 던진다.
async function request(url, options) {
  const res = await fetch(url, options)
  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? '서버에 연결할 수 없습니다.')
  return data
}

function sendJson(url, method, body) {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function App() {
  const [date, setDate] = useState(today)
  const [todos, setTodos] = useState([])
  const [day, setDay] = useState(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentDate = useRef(date)
  const pendingDay = useRef(null) // 아직 서버에 보내지 않은 일정·메모
  const saveTimer = useRef(null)
  const saveQueue = useRef(Promise.resolve()) // 저장을 입력한 순서대로 보낸다.

  // 날짜가 바뀌면 그날의 데이터를 불러온다. 앞선 저장이 끝난 뒤에 읽어야 최신 값이 보인다.
  useEffect(() => {
    let stale = false

    saveQueue.current
      .then(() =>
        Promise.all([
          request(`${API_URL}?date=${date}`),
          request(`${DAYS_URL}/${date}`),
        ]),
      )
      .then(([loadedTodos, loadedDay]) => {
        if (stale) return
        setTodos(loadedTodos)
        setDay(loadedDay)
      })
      .catch((err) => {
        if (!stale) setError(err.message)
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })

    return () => {
      stale = true
    }
  }, [date])

  // 추가, 완료 표시, 삭제의 공통 에러 처리
  async function run(action) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleDateChange(event) {
    const next = event.target.value
    if (next === '') return

    flushDay()
    setError('')
    setLoading(true)
    setTodos([])
    setDay(null)
    currentDate.current = next
    setDate(next)
  }

  function handleAdd(event) {
    event.preventDefault()
    if (title.trim() === '') return

    run(async () => {
      const todo = await sendJson(API_URL, 'POST', { title, date })
      if (todo.date === currentDate.current) {
        setTodos((prev) => [...prev, todo])
      }
      setTitle('')
    })
  }

  function handleToggle(todo) {
    run(async () => {
      const updated = await sendJson(`${API_URL}/${todo.id}`, 'PATCH', {
        completed: !todo.completed,
      })
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    })
  }

  function handleDelete(id) {
    run(async () => {
      await request(`${API_URL}/${id}`, { method: 'DELETE' })
      setTodos((prev) => prev.filter((t) => t.id !== id))
    })
  }

  // 일정·메모는 입력이 멈추면 저장한다.
  function updateDay(changes) {
    const next = { ...day, ...changes }
    setDay(next)
    pendingDay.current = next
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flushDay, SAVE_DELAY_MS)
  }

  function flushDay() {
    clearTimeout(saveTimer.current)
    const pending = pendingDay.current
    if (pending === null) return

    pendingDay.current = null
    saveQueue.current = saveQueue.current
      .then(() =>
        sendJson(`${DAYS_URL}/${pending.date}`, 'PUT', {
          schedule: pending.schedule,
          memo: pending.memo,
        }),
      )
      .catch((err) => setError(err.message))
  }

  const remaining = todos.filter((todo) => !todo.completed).length

  return (
    <main className="app">
      <header className="app-header">
        <h1>할 일 목록</h1>
        <input
          type="date"
          className="date-picker"
          value={date}
          onChange={handleDateChange}
          aria-label="날짜"
        />
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="planner">
        <div className="column">
          <section>
            <div className="section-header">
              <h2>할 일</h2>
              {todos.length > 0 && (
                <span className="count">남은 일 {remaining}개</span>
              )}
            </div>

            <form className="add-form" onSubmit={handleAdd}>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="할 일을 입력하세요"
                aria-label="새 할 일"
              />
              <button type="submit">추가</button>
            </form>

            {loading && <p className="status">불러오는 중...</p>}
            {!loading && !error && todos.length === 0 && (
              <p className="status">아직 할 일이 없습니다.</p>
            )}

            {todos.length > 0 && (
              <ul className="todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} className={todo.completed ? 'done' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggle(todo)}
                      />
                      <span>{todo.title}</span>
                    </label>
                    <button
                      type="button"
                      className="delete"
                      onClick={() => handleDelete(todo.id)}
                      aria-label={`${todo.title} 삭제`}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="section-header">
              <h2>메모</h2>
            </div>
            <textarea
              className="memo"
              rows={6}
              value={day?.memo ?? ''}
              onChange={(event) => updateDay({ memo: event.target.value })}
              onBlur={flushDay}
              disabled={day === null}
              placeholder="오늘의 메모를 남겨보세요"
              aria-label="메모"
            />
          </section>
        </div>

        <section>
          <div className="section-header">
            <h2>시간대별 일정</h2>
          </div>
          <ol className="schedule">
            {HOURS.map((hour) => (
              <li key={hour}>
                <label>
                  <span className="hour">{hour}:00</span>
                  <input
                    type="text"
                    value={day?.schedule[hour] ?? ''}
                    onChange={(event) =>
                      updateDay({
                        schedule: { ...day.schedule, [hour]: event.target.value },
                      })
                    }
                    onBlur={flushDay}
                    disabled={day === null}
                    aria-label={`${hour}시 일정`}
                  />
                </label>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}

export default App

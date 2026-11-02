import { useEffect, useState } from 'react'
import './App.css'

const API_URL = '/api/todos'

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
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 처음 화면이 열릴 때 목록을 불러온다.
  useEffect(() => {
    request(API_URL)
      .then(setTodos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // 추가, 완료 표시, 삭제의 공통 에러 처리
  async function run(action) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleAdd(event) {
    event.preventDefault()
    if (title.trim() === '') return

    run(async () => {
      const todo = await sendJson(API_URL, 'POST', { title })
      setTodos((prev) => [...prev, todo])
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

  return (
    <main className="app">
      <h1>할 일 목록</h1>

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

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="status">불러오는 중...</p>}
      {!loading && !error && todos.length === 0 && (
        <p className="status">아직 할 일이 없습니다.</p>
      )}

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
    </main>
  )
}

export default App

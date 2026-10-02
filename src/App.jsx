import { useEffect, useRef, useState } from 'react'
import { applyNotification, newChat, toPhone } from './chat.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const readJson = async (res) => {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}
const formatTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function apiUrl({ host, idInstance, apiTokenInstance }, method) {
  return `${host.replace(/\/+$/, '')}/waInstance${idInstance}/${method}/${apiTokenInstance}`
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ host: 'https://api.green-api.com', idInstance: '', apiTokenInstance: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl(form, 'getStateInstance'))
      if (!res.ok) throw new Error(`Ошибка ${res.status}: проверьте учетные данные`)
      onLogin(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const field = (name, label, type = 'text') => (
    <label>
      {label}
      <input
        type={type}
        required
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value.trim() })}
      />
    </label>
  )

  return (
    <div className="login">
      <form onSubmit={submit}>
        <h1>Telegram</h1>
        <p>Введите учетные данные GREEN-API</p>
        {field('host', 'apiUrl', 'url')}
        {field('idInstance', 'idInstance')}
        {field('apiTokenInstance', 'apiTokenInstance', 'password')}
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>{loading ? 'Проверка…' : 'Войти'}</button>
      </form>
    </div>
  )
}

function Sidebar({ chats, activeId, onSelect, onCreate, onLogout }) {
  const [phone, setPhone] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const digits = toPhone(phone)
    if (digits.length < 10) return
    onCreate(digits)
    setPhone('')
  }

  return (
    <aside className="sidebar">
      <form className="new-chat" onSubmit={submit}>
        <input
          type="tel"
          placeholder="Номер, например 79991234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label="Номер телефона получателя"
        />
        <button aria-label="Создать чат" title="Создать чат">+</button>
      </form>
      <ul>
        {chats.map((chat) => {
          const last = chat.messages.at(-1)
          return (
            <li key={chat.chatId}>
              <button
                className={chat.chatId === activeId ? 'active' : ''}
                onClick={() => onSelect(chat.chatId)}
              >
                <div className="avatar">{chat.name.replace('+', '').slice(0, 1).toUpperCase()}</div>
                <div className="preview">
                  <div className="row">
                    <b>{chat.name}</b>
                    {last && <small>{formatTime(last.time)}</small>}
                  </div>
                  <span>{last ? last.text : 'Нет сообщений'}</span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <button className="logout" onClick={onLogout}>Выйти</button>
    </aside>
  )
}

function ChatWindow({ chat, onSend, onBack }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef(null)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages.length])

  const submit = async (e) => {
    e.preventDefault()
    const message = text.trim()
    if (!message) return
    setSending(true)
    setError('')
    try {
      await onSend(chat, message)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="chat">
      <header>
        <button className="back" onClick={onBack} aria-label="Назад">‹</button>
        <b>{chat.name}</b>
      </header>
      <div className="messages">
        {chat.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.out ? 'out' : 'in'}`}>
            {m.text}
            <small>{formatTime(m.time)}</small>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error && <div className="error">{error}</div>}
      <form className="composer" onSubmit={submit}>
        <input
          placeholder="Сообщение"
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          aria-label="Сообщение"
        />
        <button disabled={sending || !text.trim()} aria-label="Отправить">➤</button>
      </form>
    </section>
  )
}

export default function App() {
  const [creds, setCreds] = useState(null)
  const [chats, setChats] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [pollError, setPollError] = useState('')

  useEffect(() => {
    if (!creds) return
    const controller = new AbortController()
    const { signal } = controller

    const poll = async () => {
      while (!signal.aborted) {
        try {
          const res = await fetch(`${apiUrl(creds, 'receiveNotification')}?receiveTimeout=20`, { signal })
          if (!res.ok) throw new Error(`Ошибка получения сообщений: ${res.status}`)
          const data = await readJson(res)
          setPollError('')
          if (!data) continue
          setChats((current) => applyNotification(current, data.body))
          await fetch(`${apiUrl(creds, 'deleteNotification')}/${data.receiptId}`, { method: 'DELETE', signal })
        } catch (err) {
          if (signal.aborted) return
          setPollError(err.message)
          await sleep(5000)
        }
      }
    }
    poll()

    return () => controller.abort()
  }, [creds])

  const createChat = (phone) => {
    const existing = chats.find((c) => c.phone === phone)
    if (existing) return setActiveId(existing.chatId)
    const chat = newChat(phone)
    setChats((current) => [chat, ...current])
    setActiveId(chat.chatId)
  }

  const sendMessage = async (chat, message) => {
    const res = await fetch(apiUrl(creds, 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chat.chatId, message }),
    })
    if (!res.ok) throw new Error(`Не удалось отправить: ${res.status}`)
    const { idMessage = String(Date.now()) } = (await readJson(res)) ?? {}
    const sent = { id: idMessage, text: message, out: true, time: Date.now() }
    setChats((current) =>
      current.map((c) => (c.chatId === chat.chatId ? { ...c, messages: [...c.messages, sent] } : c)),
    )
  }

  const logout = () => {
    setCreds(null)
    setChats([])
    setActiveId(null)
    setPollError('')
  }

  if (!creds) return <Login onLogin={setCreds} />

  const active = chats.find((c) => c.chatId === activeId)

  return (
    <div className={`app ${active ? 'has-active' : ''}`}>
      <Sidebar chats={chats} activeId={activeId} onSelect={setActiveId} onCreate={createChat} onLogout={logout} />
      {active ? (
        <ChatWindow key={active.chatId} chat={active} onSend={sendMessage} onBack={() => setActiveId(null)} />
      ) : (
        <section className="chat empty">
          <span>Введите номер телефона, чтобы начать чат</span>
        </section>
      )}
      {pollError && <div className="poll-error">{pollError}</div>}
    </div>
  )
}

export default function Toast({ toasts }) {
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type==='success'?'✓':t.type==='error'?'✕':'●'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

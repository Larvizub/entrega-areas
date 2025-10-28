import { useState, useEffect } from 'preact/hooks'
import { useAuth } from '../hooks/useAuth'
import { getPool, setPool, subscribePool } from '../config/emailPools'

const STORAGE_KEY_REVISION = 'revision_areas'
const STORAGE_KEY_DANOS = 'reporte_danos'

const InputAdd = ({ onAdd, placeholder = 'email@ejemplo.com' }) => {
  const [v, setV] = useState('')
  const add = () => {
    const trimmed = (v || '').trim()
    if (!trimmed) return
    onAdd(trimmed)
    setV('')
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
      <input className="form-input" value={v} onInput={e => setV(e.target.value)} placeholder={placeholder} style={{ flex: 1, minWidth: '200px' }} />
      <button className="btn btn-primary" onClick={add} style={{ whiteSpace: 'nowrap' }}>
        <i className="fas fa-plus"></i>
        <span className="hide-mobile"> Agregar</span>
      </button>
    </div>
  )
}

const ListEditor = ({ title, storageKey }) => {
  const [items, setListState] = useState([])

  useEffect(() => {
    let mounted = true
  getPool(storageKey).then(arr => { if (mounted) setListState(arr || []) })
  const unsub = subscribePool(storageKey, arr => { if (mounted) setListState(arr || []) })
    return () => { mounted = false; if (typeof unsub === 'function') unsub() }
  }, [storageKey])

  const add = async (email) => {
  if (items.includes(email)) return
  const next = [...items, email]
  setListState(next)
    await setPool(storageKey, next)
  }

  const removeAt = async (i) => {
  const next = items.filter((_, idx) => idx !== i)
  setListState(next)
    await setPool(storageKey, next)
  }

  const list = items || []

  return (
    <div className="card mb-lg">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="card-body">
        <InputAdd onAdd={add} />
        {list.length === 0 ? (
          <div className="text-muted">No hay correos configurados.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {list.map((e, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border-light)', gap: '8px' }}>
                <div style={{ color: 'var(--color-text-primary)', flex: 1, wordBreak: 'break-all', fontSize: '14px' }}>{e}</div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button 
                    className="btn btn-sm btn-ghost" 
                    onClick={() => navigator.clipboard?.writeText(e)}
                    title="Copiar email"
                    style={{ padding: '6px 8px', minWidth: '32px' }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => removeAt(i)}
                    title="Eliminar email"
                    style={{ padding: '6px 8px', minWidth: '32px' }}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const Correos = () => {
  const { user, loading } = useAuth()

  if (loading) return <div className="container">Cargando...</div>
  if (!user) return <div className="container">Debes iniciar sesión para ver esta sección.</div>

  return (
    <div className="container">
      <h2 className="mb-lg">Gestión de Pools de Correos</h2>
      <p className="text-muted">Aquí puedes configurar los pools de destinatarios usados por la aplicación.</p>

      <ListEditor title="Pool: Revisión de Áreas" storageKey={STORAGE_KEY_REVISION} />
      <ListEditor title="Pool: Reporte de Daños" storageKey={STORAGE_KEY_DANOS} />
    </div>
  )
}

export default Correos

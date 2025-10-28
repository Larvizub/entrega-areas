import Login from './Login'
import { useAuth } from '../hooks/useAuth'

const Navigation = ({ currentModule, setCurrentModule, showModalMessage }) => {
  const { user, userRole } = useAuth()

  return (
    <div className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">Acta de Entrega de Áreas</h1>
          </div>
          <div className="header-right">
            <Login showModalMessage={showModalMessage} />
          </div>
        </div>
        <div className="nav-container">
          <div className="nav">
            <button
              className={`nav-item ${currentModule === 'revision' ? 'active' : ''}`}
              onClick={() => setCurrentModule('revision')}
              type="button"
            >
              <i className="nav-icon fas fa-home"></i>
              <span className="nav-label">Revisión</span>
            </button>
            <button
              className={`nav-item ${currentModule === 'consulta' ? 'active' : ''}`}
              onClick={() => setCurrentModule('consulta')}
              type="button"
            >
              <i className="nav-icon fas fa-search"></i>
              <span className="nav-label">Consulta</span>
            </button>
            <button
              className={`nav-item ${currentModule === 'danos' ? 'active' : ''}`}
              onClick={() => setCurrentModule('danos')}
              type="button"
            >
              <i className="nav-icon fas fa-exclamation-triangle"></i>
              <span className="nav-label">Daños</span>
            </button>
            {user && userRole === 'administrador' && (
              <button
                className={`nav-item ${currentModule === 'correos' ? 'active' : ''}`}
                onClick={() => setCurrentModule('correos')}
                type="button"
              >
                <i className="nav-icon fas fa-envelope"></i>
                <span className="nav-label">Correos</span>
              </button>
            )}
            {user && userRole === 'administrador' && (
              <button
                className={`nav-item ${currentModule === 'usuarios' ? 'active' : ''}`}
                onClick={() => setCurrentModule('usuarios')}
                type="button"
              >
                <i className="nav-icon fas fa-users"></i>
                <span className="nav-label">Usuarios</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Navigation

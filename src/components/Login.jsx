import { useAuth } from '../hooks/useAuth'

// Componente de logo Microsoft adaptable al tema
const MicrosoftLogo = ({ className = "", style = {} }) => (
  <svg 
    className={`microsoft-logo ${className}`}
    style={style}
    viewBox="0 0 20 20" 
    xmlns="http://www.w3.org/2000/svg"
    width="16" 
    height="16"
  >
    <rect x="1" y="1" width="8" height="8" fill="currentColor" opacity="0.9" rx="1"/>
    <rect x="11" y="1" width="8" height="8" fill="currentColor" opacity="0.7" rx="1"/>
    <rect x="1" y="11" width="8" height="8" fill="currentColor" opacity="0.5" rx="1"/>
    <rect x="11" y="11" width="8" height="8" fill="currentColor" opacity="0.8" rx="1"/>
  </svg>
)

const Login = ({ showModalMessage }) => {
  const { user, login, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
      if (showModalMessage) {
        showModalMessage(
          'Error de Autenticación',
          'No se pudo iniciar sesión con Microsoft. Por favor, inténtelo nuevamente.',
          'error'
        )
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  return (
    <div className="login-container">
      {user && (
        <div className="user-info">
          <span className="text-sm font-medium">{user.displayName}</span>
        </div>
      )}
      <button
        className={`btn ${user ? 'btn-secondary' : 'btn-primary'}`}
        onClick={user ? handleLogout : handleLogin}
      >
        {user ? (
          <>
            <i className="fas fa-sign-out-alt"></i>
            Cerrar Sesión
          </>
        ) : (
          <>
            <MicrosoftLogo style={{ marginRight: '8px' }} />
            Iniciar Sesión
          </>
        )}
      </button>
    </div>
  )
}

export default Login

import { useState, useCallback } from 'preact/hooks'
import { useAuth } from './hooks/useAuth'
import { useEntregas } from './hooks/useEntregas'
import { useUsuarios } from './hooks/useUsuarios'
import { sendEmailWithAccountViaFunction } from './config/email'
import { renderActaHtml } from './config/emailTemplates'
import { getLogo } from './utils/constants'
import { getPool } from './config/emailPools'

import Navigation from './components/Navigation'
import Footer from './components/Footer'
import Modal from './components/Modal'
import Spinner from './components/Spinner'

import ModuloRevisionArea from './modules/ModuloRevisionArea'
import ModuloConsultaEntregas from './modules/ModuloConsultaEntregas'
import ModuloReporteDanos from './modules/ModuloReporteDanos'
import ModuloUsuarios from './modules/ModuloUsuarios'
import Correos from './modules/Correos'

export function App() {
  const [currentModule, setCurrentModule] = useState("")
  const [showSpinner, setShowSpinner] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' // 'success', 'error', 'info'
  })
  
  const { user, userRole, loading } = useAuth()
  const { entregas, saveEntrega, loading: entregasLoading } = useEntregas()
  const { usuarios } = useUsuarios()

  // Debug: mostrar información de conexión
  console.log('🔧 App Debug:', { 
    entregasCount: entregas?.length || 0, 
    entregasLoading, 
    userLoading: loading,
    hasUser: !!user 
  })

  // Función para mostrar modales
  const showModalMessage = (title, message, type = 'info') => {
    setModalConfig({ title, message, type })
    setShowModal(true)
  }

  // Function para cambios de módulo
  const handleSetCurrentModule = useCallback((module) => {
    setCurrentModule(module)
  }, [])

  const handleSaveEntrega = async (data) => {
    setShowSpinner(true)
    
    try {
      // Guardar en Firebase
      await saveEntrega(data)
      
      // Preparar las novedades encontradas para el correo
      const novedadesHtml = data.salones.map(salon => {
        const novedades = salon.infraestructura
          .filter(item => item.estado === "Novedad Encontrada")
          .map(item => `
            <div style="padding: 0.8rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #6c757d; color: #333;">
              <strong style="color: #333;">${item.nombre}:</strong> ${item.hallazgo || ""} ${item.comentarios || ""}
              ${item.esDano && ((Array.isArray(item.imagenUrl) && item.imagenUrl.length > 0) || (item.imagenUrl && !Array.isArray(item.imagenUrl))) ? (Array.isArray(item.imagenUrl) ? item.imagenUrl : [item.imagenUrl]).map(url => `<div style="margin-top: 10px;"><img src="${url}" alt="Imagen del daño" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;" /></div>`).join('') : ''}
            </div>
          `).join('')
        
        return novedades ? `
          <div style="background: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #e9ecef;">
            <h4 style="color: #495057; margin-bottom: 1rem; border-bottom: 1px solid #e9ecef; padding-bottom: 0.5rem;">
              ${salon.salon}
            </h4>
            ${novedades}
          </div>
        ` : ''
      }).join('')

      // Preparar el template para el correo
      const defaultTo = "planeacion.eventos@costaricacc.com, luis.arvizu@costaricacc.com, yoxsy.chaves@costaricacc.com, seguridad@costaricacc.com, centralseguridad@costaricacc.com"
      const pool = await getPool('revision_areas')
      const poolStr = (pool && pool.length) ? pool.join(', ') : defaultTo

      const templateParams = {
        subject: `Acta de Entrega de Áreas | ${data.nombreEvento}`,
        to_email: poolStr + (data.correoPersonaEntrega ? ", " + data.correoPersonaEntrega : ""),
        body: renderActaHtml({
          logo_url: getLogo(data.recinto),
          title: 'Acta de Entrega de Áreas',
          general: {
            recinto: data.recinto,
            nombreEvento: data.nombreEvento,
            fechaEvento: data.fechaEvento,
            tipo_entrega: data.tipoEntrega,
            organizador: data.organizador,
            encargado_entrega: data.encargadoEntrega,
            persona_entrega: data.personaEntrega,
            correo_persona: data.correoPersonaEntrega
          },
          salones: data.salones.map(s => ({
            salon: s.salon,
            novedades: s.infraestructura.filter(i => i.estado === 'Novedad Encontrada').map(i => ({
              nombre: i.nombre,
              hallazgo: i.hallazgo,
              comentarios: i.comentarios,
              imagenUrl: i.imagenUrl
            }))
          }))
        })
      }

  // Enviar correo (vía Function server-side)
  await sendEmailWithAccountViaFunction(templateParams)
      
      showModalMessage(
        '¡Datos guardados correctamente!',
        'La información del acta está lista y se ha enviado por correo electrónico.',
        'success'
      )
    } catch (error) {
      console.error("Error:", error)
      showModalMessage(
        'Error al procesar',
        'Hubo un error al procesar la solicitud. Por favor, inténtelo nuevamente.',
        'error'
      )
    } finally {
      setShowSpinner(false)
    }
  }

  const handleConfirmModal = () => {
    setShowModal(false)
    if (modalConfig.type === 'success') {
      setCurrentModule("revision")
    }
  }

  const renderModule = () => {
    if (!currentModule) {
      return (
        <div className="container">
          <div className="text-center mt-lg">
            <i className="fas fa-arrow-up text-muted" style={{ fontSize: '3rem' }}></i>
            <h2 className="mt-md text-muted">Seleccione un módulo</h2>
            <p className="text-secondary">Elija una opción del menú superior para comenzar</p>
          </div>
        </div>
      )
    }

    switch (currentModule) {
      case "revision":
        return <ModuloRevisionArea onSave={handleSaveEntrega} />
      
      case "consulta":
        if (loading) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-spinner fa-spin text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Verificando autenticación...</h2>
                <p className="text-secondary">Por favor, espere un momento</p>
              </div>
            </div>
          )
        }
        if (!user) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-lock text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Acceso Restringido</h2>
                <p className="text-secondary">Debes iniciar sesión con Microsoft para usar este módulo</p>
                <button 
                  className="btn btn-primary mt-md"
                  onClick={() => showModalMessage(
                    'Inicio de Sesión Requerido',
                    'Para acceder al módulo de Consulta, necesitas iniciar sesión con tu cuenta de Microsoft usando el botón "Iniciar Sesión" en la parte superior derecha.',
                    'info'
                  )}
                >
                  <i className="fas fa-info-circle"></i>
                  Más información
                </button>
              </div>
            </div>
          )
        }
        return <ModuloConsultaEntregas entregas={entregas} />
      
      case "danos":
        if (loading) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-spinner fa-spin text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Verificando autenticación...</h2>
                <p className="text-secondary">Por favor, espere un momento</p>
              </div>
            </div>
          )
        }
        if (!user) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-lock text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Acceso Restringido</h2>
                <p className="text-secondary">Debes iniciar sesión con Microsoft para usar este módulo</p>
                <button 
                  className="btn btn-primary mt-md"
                  onClick={() => showModalMessage(
                    'Inicio de Sesión Requerido',
                    'Para acceder al módulo de Daños, necesitas iniciar sesión con tu cuenta de Microsoft usando el botón "Iniciar Sesión" en la parte superior derecha.',
                    'info'
                  )}
                >
                  <i className="fas fa-info-circle"></i>
                  Más información
                </button>
              </div>
            </div>
          )
        }
        return <ModuloReporteDanos entregas={entregas} />

      case 'correos':
        return <Correos />
      
      case 'usuarios':
        if (loading) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-spinner fa-spin text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Verificando permisos...</h2>
                <p className="text-secondary">Por favor, espere un momento</p>
              </div>
            </div>
          )
        }
        if (!user) {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-lock text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Acceso Restringido</h2>
                <p className="text-secondary">Debes iniciar sesión con Microsoft para usar este módulo</p>
                <button 
                  className="btn btn-primary mt-md"
                  onClick={() => showModalMessage(
                    'Inicio de Sesión Requerido',
                    'Para acceder al módulo de Usuarios, necesitas iniciar sesión con tu cuenta de Microsoft usando el botón "Iniciar Sesión" en la parte superior derecha.',
                    'info'
                  )}
                >
                  <i className="fas fa-info-circle"></i>
                  Más información
                </button>
              </div>
            </div>
          )
        }
        if (userRole !== 'administrador') {
          return (
            <div className="container">
              <div className="text-center mt-lg">
                <i className="fas fa-shield-alt text-muted" style={{ fontSize: '3rem' }}></i>
                <h2 className="mt-md text-muted">Acceso Denegado</h2>
                <p className="text-secondary">Solo los administradores pueden acceder al módulo de usuarios</p>
              </div>
            </div>
          )
        }
        return <ModuloUsuarios />
      
      default:
        return (
          <div className="container">
            <div className="text-center mt-lg">
              <i className="fas fa-exclamation-triangle text-muted" style={{ fontSize: '3rem' }}></i>
              <h2 className="mt-md text-muted">Módulo no encontrado</h2>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="app-root">
      <div className="app-content">
        <Navigation 
          currentModule={currentModule}
          setCurrentModule={handleSetCurrentModule}
          showModalMessage={showModalMessage}
        />
        
        {renderModule()}
      </div>

      <Footer />

      {/* Spinner y modal de confirmación (overlays) */}
      {showSpinner && <Spinner />}
      
      <Modal
        isOpen={showModal}
        onClose={handleConfirmModal}
        title={modalConfig.title}
      >
        <p className="mb-lg">{modalConfig.message}</p>
        <div className="flex justify-center">
          <button
            onClick={handleConfirmModal}
            className={`btn ${modalConfig.type === 'error' ? 'btn-secondary' : 'btn-primary'}`}
          >
            {modalConfig.type === 'error' ? 'Entendido' : 'Aceptar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

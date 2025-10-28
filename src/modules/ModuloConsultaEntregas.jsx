import { useState, useEffect } from 'preact/hooks'
import { getLogo } from '../utils/constants'
import { sendEmailWithAccountViaFunction } from '../config/email'
import { renderActaHtml } from '../config/emailTemplates'
import { getPool } from '../config/emailPools'
import { useEntregas } from '../hooks/useEntregas'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'

const ModuloConsultaEntregas = ({ entregas: propEntregas }) => {
  const [busqueda, setBusqueda] = useState("")
  const [resultados, setResultados] = useState([])
  const [selectedEntrega, setSelectedEntrega] = useState(null)
  const [showSpinner, setShowSpinner] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [duplicatesCount, setDuplicatesCount] = useState(0)
  const [showDeleteDuplicatesModal, setShowDeleteDuplicatesModal] = useState(false)
  const [showDeleteEntregaModal, setShowDeleteEntregaModal] = useState(false)
  const [entregaToDelete, setEntregaToDelete] = useState(null)
  
  const { cleanDuplicates, deleteEntrega } = useEntregas()
  const { userRole } = useAuth()

  console.log('🔍 ModuloConsultaEntregas - entregas recibidas:', propEntregas)

  // Detectar duplicados
  useEffect(() => {
    if (propEntregas && propEntregas.length > 0) {
      const seen = new Set()
      let duplicates = 0
      
      propEntregas.forEach(entrega => {
        const key = `${entrega.recinto}-${entrega.nombreEvento}-${entrega.fechaEvento}-${entrega.tipoEntrega || ''}`
        if (seen.has(key)) {
          duplicates++
        } else {
          seen.add(key)
        }
      })
      
      setDuplicatesCount(duplicates)
    }
  }, [propEntregas])

  useEffect(() => {
    console.log('🔍 Filtrado - búsqueda:', busqueda, 'entregas:', propEntregas?.length || 0)
    if (!busqueda.trim()) {
      // Si no hay búsqueda, no mostrar resultados
      setResultados([])
      return
    }
    const filtered = (propEntregas || []).filter((entrega) =>
      entrega.nombreEvento && entrega.nombreEvento.toLowerCase().includes(busqueda.toLowerCase())
    )
    console.log('🔍 Resultados filtrados:', filtered)
    setResultados(filtered)
  }, [busqueda, propEntregas])

  const handleCleanDuplicates = () => {
    setShowDeleteDuplicatesModal(true)
  }

  const confirmCleanDuplicates = async () => {
    setShowDeleteDuplicatesModal(false)
    setShowSpinner(true)
    try {
      const cleaned = await cleanDuplicates()
      alert(`Se eliminaron ${cleaned} entregas duplicadas.`)
      setDuplicatesCount(0)
    } catch (error) {
      console.error('Error limpiando duplicados:', error)
      alert('Error al limpiar duplicados.')
    } finally {
      setShowSpinner(false)
    }
  }

  const handleDeleteEntrega = (entrega) => {
    setEntregaToDelete(entrega)
    setShowDeleteEntregaModal(true)
  }

  const confirmDeleteEntrega = async () => {
    if (!entregaToDelete) return
    
    setShowDeleteEntregaModal(false)
    setShowSpinner(true)
    try {
      await deleteEntrega(entregaToDelete.id)
      alert('Entrega eliminada correctamente.')
      setEntregaToDelete(null)
      // La lista se actualizará automáticamente a través del hook
    } catch (error) {
      console.error('Error eliminando entrega:', error)
      alert('Error al eliminar la entrega.')
    } finally {
      setShowSpinner(false)
    }
  }

  const handleEventoSelect = (entrega) => {
    setSelectedEntrega(entrega)
  }

  const handleReenviarCorreo = async (entrega) => {
    setShowSpinner(true)
    
    // Preparar las novedades para el correo
    const novedadesHtml = entrega.salones.map(salon => {
      const novedades = salon.infraestructura
        .filter(item => item.estado === "Novedad Encontrada")
        .map(item => `
          <div style="padding: 0.8rem; background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem; border-left: 3px solid #6c757d; color: #333;">
            <strong style="color: #333;">${item.nombre}:</strong> ${item.hallazgo || ""} ${item.comentarios || ""}
            ${Array.isArray(item.imagenUrl) && item.imagenUrl.length > 0 ? item.imagenUrl.map(url => `<div style="margin-top: 10px;"><img src="${url}" alt="Imagen del daño" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;" /></div>`).join('') : (item.imagenUrl && !Array.isArray(item.imagenUrl) ? `<div style="margin-top: 10px;"><img src="${item.imagenUrl}" alt="Imagen del daño" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;" /></div>` : '')}
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

    const defaultTo = "planeacion.eventos@costaricacc.com, luis.arvizu@costaricacc.com, yoxsy.chaves@costaricacc.com, seguridad@costaricacc.com, centralseguridad@costaricacc.com"
    const pool = await getPool('revision_areas')
    const poolStr = (pool && pool.length) ? pool.join(', ') : defaultTo

    const acta = {
      logo_url: getLogo(entrega.recinto),
      title: 'Acta de Entrega de Áreas',
      general: {
        recinto: entrega.recinto,
        nombreEvento: entrega.nombreEvento,
        fechaEvento: entrega.fechaEvento,
        tipo_entrega: entrega.tipoEntrega,
        organizador: entrega.organizador,
        encargado_entrega: entrega.encargadoEntrega,
        persona_entrega: entrega.personaEntrega,
        correo_persona: entrega.correoPersonaEntrega
      },
      salones: entrega.salones.map(s => ({
        salon: s.salon,
        novedades: s.infraestructura.filter(i => i.estado === 'Novedad Encontrada').map(i => ({
          nombre: i.nombre,
          hallazgo: i.hallazgo,
          comentarios: i.comentarios,
          imagenUrl: i.imagenUrl
        }))
      }))
    }

    const html = renderActaHtml(acta)

    const templateParams = {
      subject: `Acta de Entrega de Áreas | ${entrega.nombreEvento}`,
      to_email: poolStr + (entrega.correoPersonaEntrega ? ", " + entrega.correoPersonaEntrega : ""),
      body: html
    }

    try {
      await sendEmailWithAccountViaFunction(templateParams)
      setShowSuccessModal(true)
    } catch (err) {
      console.error("Error al reenviar el correo:", err)
      alert("Error al reenviar el correo")
    } finally {
      setShowSpinner(false)
    }
  }

  const PrintableActa = ({ entrega }) => {
    return (
      <div className="printable">
        {/* Header */}
        <div className="text-center mb-lg">
          <img src={getLogo(entrega.recinto)} alt="Logo" className="logo" />
          <h2 className="text-center mt-md">Acta de Entrega de Áreas</h2>
        </div>

        {/* Información General */}
        <div className="card mb-lg">
          <div className="card-header">
            <h3 className="card-title">Información General</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-2">
              <div>
                <div className="mb-md">
                  <span className="font-semibold">Recinto:</span> {entrega.recinto}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Nombre del Evento:</span> {entrega.nombreEvento}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Fecha:</span> {entrega.fechaEvento}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Tipo de Entrega:</span> {entrega.tipoEntrega}
                </div>
              </div>
              <div>
                <div className="mb-md">
                  <span className="font-semibold">Organizador:</span> {entrega.organizador}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Encargado de Entrega:</span> {entrega.encargadoEntrega}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Persona que Recibe:</span> {entrega.personaEntrega}
                </div>
                <div className="mb-md">
                  <span className="font-semibold">Correo:</span> {entrega.correoPersonaEntrega}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Salones y Novedades */}
        {entrega.salones.map((salon, idx) => {
          const novedades = salon.infraestructura.filter(item => item.estado === "Novedad Encontrada")
          
          if (novedades.length === 0) return null

          return (
            <div key={idx} className="card mb-lg">
              <div className="card-header">
                <h4 className="card-title">{salon.salon}</h4>
              </div>
              <div className="card-body">
                {novedades.map((item, iIdx) => (
                  <div key={iIdx} className="hallazgo-item">
                    <div className="mb-sm">
                      <span className="font-semibold">{item.nombre}:</span> {item.hallazgo || ""} {item.comentarios || ""}
                    </div>
                    {item.esDano && ((Array.isArray(item.imagenUrl) && item.imagenUrl.length > 0) || (item.imagenUrl && !Array.isArray(item.imagenUrl))) && (
                      <div className="text-center">
                        {(Array.isArray(item.imagenUrl) ? item.imagenUrl : [item.imagenUrl]).map((url, idx) => (
                          <div key={idx} style={{ marginBottom: 10 }}>
                            <img
                              src={url}
                              alt={`Imagen del daño ${idx + 1}`}
                              className="hallazgo-item img"
                              style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                            <div style={{ marginTop: 8 }}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm"
                                style={{ textDecoration: 'none' }}
                              >
                                Descargar foto {idx + 1}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="container">
      {/* Debug info */}
      {console.log('🎯 Renderizando ConsultaEntregas:', { 
        totalEntregas: propEntregas?.length || 0, 
        resultados: resultados?.length || 0, 
        busqueda, 
        selectedEntrega: !!selectedEntrega,
        duplicatesCount
      })}      {/* Búsqueda */}
      <div className="search-container mb-lg">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nombre de evento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Indicador de duplicados y botón de limpieza */}
      {duplicatesCount > 0 && (
        <div className="alert alert-warning mb-lg">
          <div className="flex items-center justify-between">
            <div>
              <i className="fas fa-exclamation-triangle"></i>
              <strong>Advertencia:</strong> Se encontraron {duplicatesCount} entregas duplicadas.
            </div>
            <button 
              className="btn btn-sm btn-danger" 
              onClick={handleCleanDuplicates}
              disabled={showSpinner}
            >
              <i className="fas fa-trash"></i> Limpiar duplicados
            </button>
          </div>
        </div>
      )}

      {/* Debug visual */}
      {(!propEntregas || propEntregas.length === 0) && (
        <div className="text-center mt-lg">
          <p className="text-secondary">No hay entregas disponibles o aún cargando...</p>
          <p className="text-muted">Total entregas: {propEntregas?.length || 0}</p>
        </div>
      )}

      {/* Lista de resultados */}
      {!selectedEntrega && (
        <div className="grid">
          {resultados.length > 0 ? resultados.map((entrega, idx) => (
            <div
              key={idx}
              className="result-card"
              onClick={() => handleEventoSelect(entrega)}
            >
              <div className="result-header">
                <div className="result-title-section">
                  <h3 className="result-title">{entrega.nombreEvento}</h3>
                  <span className="result-date text-muted">{entrega.fechaEvento}</span>
                </div>
                {userRole === 'administrador' && (
                  <button
                    className="btn btn-sm btn-danger result-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation() // Evitar que se active el onClick del card
                      handleDeleteEntrega(entrega)
                    }}
                    disabled={showSpinner}
                    title="Eliminar entrega"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                )}
              </div>
              <div className="text-sm text-secondary">
                <div>Recinto: {entrega.recinto}</div>
                <div>Organizador: {entrega.organizador}</div>
              </div>
            </div>
          )) : (
            <div className="text-center mt-lg">
              <i className="fas fa-search text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="mt-md text-muted">
                {busqueda ? 'No se encontraron entregas que coincidan con la búsqueda' : 'Ingrese el nombre del evento para buscar entregas'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Detalle de la entrega seleccionada */}
      {selectedEntrega && (
        <div>
          {/* Botones de acción */}
          <div className="flex gap-md mb-lg">
            <button
              onClick={() => setSelectedEntrega(null)}
              className="btn btn-secondary"
            >
              <i className="fas fa-arrow-left"></i>
              Volver a la búsqueda
            </button>
            <button
              onClick={() => handleReenviarCorreo(selectedEntrega)}
              className="btn btn-primary"
            >
              <i className="fas fa-envelope"></i>
              Reenviar Correo
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-ghost"
            >
              <i className="fas fa-print"></i>
              Imprimir
            </button>
          </div>
          
          {/* Contenido del acta */}
          <PrintableActa entrega={selectedEntrega} />
        </div>
      )}

      {/* Spinner y modal de éxito */}
      {showSpinner && <Spinner />}
      
      {/* Modal de confirmación para eliminar duplicados */}
      <Modal
        isOpen={showDeleteDuplicatesModal}
        onClose={() => setShowDeleteDuplicatesModal(false)}
        title="Confirmar eliminación"
      >
        <p className="mb-lg">
          ¿Estás seguro de que quieres eliminar <strong>{duplicatesCount}</strong> entregas duplicadas?<br />
          <span style={{color: '#dc3545'}}>Esta acción no se puede deshacer.</span>
        </p>
        <div className="flex justify-end gap-md">
          <button
            onClick={() => setShowDeleteDuplicatesModal(false)}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={confirmCleanDuplicates}
            className="btn btn-danger"
          >
            Eliminar duplicados
          </button>
        </div>
      </Modal>

      {/* Modal de confirmación para eliminar entrega individual */}
      <Modal
        isOpen={showDeleteEntregaModal}
        onClose={() => setShowDeleteEntregaModal(false)}
        title="Confirmar eliminación"
      >
        <p className="mb-lg">
          ¿Estás seguro de que quieres eliminar la entrega <strong>"{entregaToDelete?.nombreEvento}"</strong>?<br />
          <span style={{color: '#dc3545'}}>Esta acción no se puede deshacer.</span>
        </p>
        <div className="flex justify-end gap-md">
          <button
            onClick={() => setShowDeleteEntregaModal(false)}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDeleteEntrega}
            className="btn btn-danger"
          >
            Eliminar entrega
          </button>
        </div>
      </Modal>
      
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Éxito!"
      >
        <p className="mb-lg">El correo se ha reenviado correctamente</p>
        <div className="flex justify-center">
          <button
            onClick={() => setShowSuccessModal(false)}
            className="btn btn-primary"
          >
            Aceptar
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default ModuloConsultaEntregas

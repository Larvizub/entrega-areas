import { useState, useEffect } from 'preact/hooks'
import { getLogo } from '../utils/constants'
import { sendEmailWithAccountViaFunction } from '../config/email'
import { renderActaHtml } from '../config/emailTemplates'
import { getPool } from '../config/emailPools'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'

const ModuloReporteDanos = ({ entregas }) => {
  const [danosState, setDanosState] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [danosFiltrados, setDanosFiltrados] = useState([])
  const [showSpinner, setShowSpinner] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    const danosAcumulados = []
    entregas.forEach((entrega) => {
      if (entrega.salones) {
        entrega.salones.forEach((salon) => {
          salon.infraestructura.forEach((item) => {
            if (item.esDano) {
              danosAcumulados.push({
                nombreEvento: entrega.nombreEvento,
                recinto: entrega.recinto,
                salon: salon.salon,
                infraestructura: item.nombre,
                comentarios: item.comentarios,
                estado: item.estado,
                hallazgo: item.hallazgo,
                precio: 0,
                imagenUrl: Array.isArray(item.imagenUrl) ? item.imagenUrl : (item.imagenUrl ? [item.imagenUrl] : []),
                imagenId: Array.isArray(item.imagenId) ? item.imagenId : (item.imagenId ? [item.imagenId] : []),
              })
            }
          })
        })
      }
    })
    setDanosState(danosAcumulados)
  }, [entregas])

  useEffect(() => {
    if (!busqueda.trim()) {
      setDanosFiltrados([])
      return
    }
    const filtered = danosState.filter((dano) =>
      dano.nombreEvento.toLowerCase().includes(busqueda.toLowerCase())
    )
    setDanosFiltrados(filtered)
  }, [busqueda, danosState])

  const handlePrecioChange = (index, value) => {
    const newList = [...danosFiltrados]
    newList[index].precio = parseFloat(value) || 0
    setDanosFiltrados(newList)
  }

  const handleEnviarDanos = async () => {
    if (danosFiltrados.length === 0) {
      alert("No hay daños para enviar")
      return
    }

    setShowSpinner(true)
    
    const nombreEvento = danosFiltrados[0]?.nombreEvento || "Sin nombre"
    const recinto = danosFiltrados[0]?.recinto || "CCCR"
    
    // Preparar la tabla HTML para el correo
    const tablaDanosHtml = `
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${getLogo(recinto)}" alt="Logo ${recinto}" style="max-width: 200px; height: auto; margin-bottom: 20px;">
        <h2 style="color: #495057; margin: 0;">Reporte de Daños - ${nombreEvento}</h2>
        <p style="color: #6c757d;">Fecha del reporte: ${new Date().toLocaleDateString()}</p>
      </div>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #dee2e6;">
        <thead style="background-color: #f8f9fa;">
          <tr>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Evento</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Recinto</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Salón</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Infraestructura</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Estado</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Hallazgo</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Comentarios</th>
            <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Precio (USD)</th>
          </tr>
        </thead>
        <tbody>
          ${danosFiltrados.map(d => `
            <tr>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.nombreEvento}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.recinto}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.salon}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.infraestructura}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.estado}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">${d.hallazgo || 'N/A'}</td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">
                ${d.comentarios || 'N/A'}
                ${Array.isArray(d.imagenUrl) && d.imagenUrl.length > 0 ? d.imagenUrl.map(url => `<div style="margin-top: 10px;"><img src="${url}" alt="Imagen del daño" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;" /></div>`).join('') : (d.imagenUrl && !Array.isArray(d.imagenUrl) ? `<div style="margin-top: 10px;"><img src="${d.imagenUrl}" alt="Imagen del daño" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 1px solid #ddd;" /></div>` : '')}
              </td>
              <td style="padding: 12px; border: 1px solid #dee2e6;">$${d.precio}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    const totalDanos = danosFiltrados.reduce((sum, d) => sum + Number(d.precio), 0)

    // try to read pool from database; fallback to hardcoded list
    const defaultTo = "planeacion.eventos@costaricacc.com, luis.arvizu@costaricacc.com, yoxsy.chaves@costaricacc.com, maria.pineres@costaricacc.com, mariana.navarro@costaricacc.com, david.correia@costaricacc.com, eduardo.castro@costaricacc.com"
    const pool = await getPool('reporte_danos')
    const poolStr = (pool && pool.length) ? pool.join(', ') : defaultTo

    const acta = {
      logo_url: getLogo(recinto),
      title: `Reporte de Daños - ${nombreEvento}`,
      general: {
        recinto,
        nombreEvento,
        fechaEvento: new Date().toLocaleDateString(),
      },
      salones: danosFiltrados.map(d => ({
        salon: d.salon,
        novedades: [{
          nombre: d.infraestructura,
          hallazgo: d.hallazgo || '',
          comentarios: d.comentarios || '',
          imagenUrl: Array.isArray(d.imagenUrl) ? d.imagenUrl : (d.imagenUrl ? [d.imagenUrl] : []),
          precio: (typeof d.precio !== 'undefined' && d.precio !== null) ? Number(d.precio) : null
        }]
      }))
    }

    const html = renderActaHtml(acta)

    const templateParams = {
      subject: `Reporte de Daños | ${nombreEvento}`,
      to_email: poolStr,
      body: html
    }

    try {
      await sendEmailWithAccountViaFunction(templateParams)
      setShowSuccessModal(true)
    } catch (err) {
      console.error("Error al enviar el reporte:", err)
      alert("Error al enviar el reporte de daños")
    } finally {
      setShowSpinner(false)
    }
  }

  const totalGeneral = danosFiltrados.reduce((sum, d) => sum + Number(d.precio), 0)

  return (
    <div className="container">
      <h2 className="mb-lg">Reporte de Daños</h2>
      
      {/* Búsqueda */}
      <div className="search-container mb-lg">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar daños por nombre de evento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Tabla de resultados */}
      {danosFiltrados.length > 0 ? (
        <>
          <div className="card mb-lg">
            <div className="card-body">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Recinto</th>
                      <th>Salón</th>
                      <th>Infraestructura</th>
                      <th>Estado</th>
                      <th>Hallazgo</th>
                      <th>Comentarios</th>
                      <th>Precio (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danosFiltrados.map((d, i) => (
                      <tr key={i}>
                        <td>{d.nombreEvento}</td>
                        <td>{d.recinto}</td>
                        <td>{d.salon}</td>
                        <td>{d.infraestructura}</td>
                        <td>
                          <span className="tag tag-new">{d.estado}</span>
                        </td>
                        <td>
                          {d.hallazgo && (
                            <span className={`tag ${d.hallazgo === 'Nuevo' ? 'tag-new' : 'tag-existing'}`}>
                              {d.hallazgo}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            {d.comentarios || "N/A"}
                            {((Array.isArray(d.imagenUrl) && d.imagenUrl.length > 0) || (d.imagenUrl && !Array.isArray(d.imagenUrl))) && (
                              <div className="mt-sm">
                                {(Array.isArray(d.imagenUrl) ? d.imagenUrl : [d.imagenUrl]).map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Imagen del daño ${idx + 1}`}
                                    style={{ 
                                      maxWidth: "100px", 
                                      maxHeight: "80px",
                                      cursor: "pointer",
                                      borderRadius: "4px",
                                      border: "1px solid var(--color-border)",
                                      marginRight: "5px"
                                    }}
                                    onClick={() => window.open(url, "_blank")}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100px' }}
                            value={d.precio}
                            onChange={(e) => handlePrecioChange(i, e.target.value)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Total y botón de envío */}
          <div className="flex justify-between items-center form-actions">
            <div className="text-lg font-semibold">
              Total: ${totalGeneral.toFixed(2)}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleEnviarDanos}
            >
              <i className="fas fa-paper-plane"></i>
              Enviar Reporte de Daños
            </button>
          </div>
        </>
      ) : (
        <div className="text-center mt-lg">
          <i className="fas fa-search text-muted" style={{ fontSize: '3rem' }}></i>
          <p className="mt-md text-muted">
            {busqueda ? "No se encontraron daños para este evento" : "Ingrese el nombre del evento para buscar daños"}
          </p>
        </div>
      )}

      {/* Spinner y modal de éxito */}
      {showSpinner && <Spinner />}
      
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Éxito!"
      >
        <p className="mb-lg">El reporte de daños se ha enviado correctamente</p>
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

export default ModuloReporteDanos

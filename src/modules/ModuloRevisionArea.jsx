import { useState } from 'preact/hooks'
import { 
  SALONES_CCCR, 
  INFRAESTRUCTURA_ITEMS, 
  RECINTOS, 
  TIPOS_ENTREGA, 
  ESTADOS_INFRAESTRUCTURA, 
  TIPOS_HALLAZGO,
  getLogo 
} from '../utils/constants'
import ImageUpload from '../components/ImageUpload'

const ModuloRevisionArea = ({ onSave }) => {
  // Estados del formulario
  const [recinto, setRecinto] = useState("")
  const [nombreEvento, setNombreEvento] = useState("")
  const [fechaEvento, setFechaEvento] = useState("")
  const [tipoEntrega, setTipoEntrega] = useState("")
  const [organizador, setOrganizador] = useState("")
  const [encargadoEntrega, setEncargadoEntrega] = useState("")
  const [personaEntrega, setPersonaEntrega] = useState("")
  const [correoPersonaEntrega, setCorreoPersonaEntrega] = useState("")

  // Infraestructura inicial
  const initialInfra = INFRAESTRUCTURA_ITEMS.map((item) => ({
    nombre: item,
    estado: "Buen Estado",
    hallazgo: "",
    comentarios: "",
    esDano: null,
    imagenUrl: [],
    imagenId: [],
    notificarCliente: false
  }))

  const [salonesData, setSalonesData] = useState([
    {
      salon: "",
      infraestructura: [...initialInfra],
    },
  ])

  const handleSalonChange = (index, value) => {
    const newSalones = [...salonesData]
    newSalones[index].salon = value
    setSalonesData(newSalones)
  }

  const handleInfraChange = (salonIndex, infraIndex, field, value) => {
    const newSalones = [...salonesData]
    newSalones[salonIndex].infraestructura[infraIndex][field] = value
    if (field === 'hallazgo' && value !== 'Existente') {
      newSalones[salonIndex].infraestructura[infraIndex].notificarCliente = false
    }
    setSalonesData(newSalones)
  }

  const handleImageUploaded = (salonIndex, infraIndex, imageDataArray) => {
    const newSalones = [...salonesData]
    const currentUrls = newSalones[salonIndex].infraestructura[infraIndex].imagenUrl || []
    const currentIds = newSalones[salonIndex].infraestructura[infraIndex].imagenId || []
    newSalones[salonIndex].infraestructura[infraIndex].imagenUrl = [...currentUrls, ...imageDataArray.map(d => d.imageUrl)]
    newSalones[salonIndex].infraestructura[infraIndex].imagenId = [...currentIds, ...imageDataArray.map(d => d.imageId)]
    setSalonesData(newSalones)
  }

  const handleAddSalon = () => {
    setSalonesData(prev => [
      ...prev,
      {
        salon: "",
        infraestructura: [...initialInfra],
      },
    ])
  }

  const handleGuardar = () => {
    // Validación: si tipoEntrega es "Recepción" y hay un hallazgo "Nuevo", es obligatorio responder si entra en reporte de daños
    if (tipoEntrega === 'Recepción') {
      for (let s = 0; s < salonesData.length; s++) {
        const infra = salonesData[s].infraestructura
        for (let i = 0; i < infra.length; i++) {
          const it = infra[i]
          if (it.estado === 'Novedad Encontrada' && it.hallazgo === 'Nuevo') {
            if (it.esDano === null || typeof it.esDano === 'undefined') {
              alert('Por favor responda si el hallazgo entra en el reporte de daños (Sí/No) para todos los hallazgos nuevos en Recepción.')
              return
            }
          }
        }
      }
    }
    const data = {
      recinto,
      nombreEvento,
      fechaEvento,
      tipoEntrega,
      organizador,
      encargadoEntrega,
      personaEntrega,
      correoPersonaEntrega,
      salones: salonesData,
      fechaCreacion: new Date().toISOString()
    }
    onSave(data)
  }

  const limpiarFormulario = () => {
    setRecinto("")
    setNombreEvento("")
    setFechaEvento("")
    setTipoEntrega("")
    setOrganizador("")
    setEncargadoEntrega("")
    setPersonaEntrega("")
    setCorreoPersonaEntrega("")
    setSalonesData([
      {
        salon: "",
        infraestructura: [...initialInfra],
      },
    ])
  }

  return (
    <div className="container">
      {/* Datos Generales - AL INICIO */}
      <div className="card mb-lg">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Datos Generales del Evento</h2>
            {/* Logo del recinto al lado del título */}
            {recinto && (
              <img 
                src={getLogo(recinto)} 
                alt={`Logo ${recinto}`} 
                className="logo-header"
                style={{ height: '40px', width: 'auto' }}
              />
            )}
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Recinto al que pertenece:</label>
              <select
                className="form-select"
                value={recinto}
                onChange={(e) => setRecinto(e.target.value)}
              >
                <option value="">Seleccione un recinto</option>
                {RECINTOS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Entrega:</label>
              <select
                className="form-select"
                value={tipoEntrega}
                onChange={(e) => setTipoEntrega(e.target.value)}
                required
              >
                <option value="">Seleccione tipo</option>
                {TIPOS_ENTREGA.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del Evento:</label>
              <input
                type="text"
                className="form-input"
                value={nombreEvento}
                onChange={(e) => setNombreEvento(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha:</label>
              <input
                type="date"
                className="form-input"
                value={fechaEvento}
                onChange={(e) => setFechaEvento(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Organizador:</label>
              <input
                type="text"
                className="form-input"
                value={organizador}
                onChange={(e) => setOrganizador(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Encargado de Entregar el Área:</label>
              <input
                type="text"
                className="form-input"
                value={encargadoEntrega}
                onChange={(e) => setEncargadoEntrega(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Persona a la que se le entrega:</label>
              <input
                type="text"
                className="form-input"
                value={personaEntrega}
                onChange={(e) => setPersonaEntrega(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo de la persona:</label>
              <input
                type="email"
                className="form-input"
                value={correoPersonaEntrega}
                onChange={(e) => setCorreoPersonaEntrega(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Salones */}
      {salonesData.map((salonItem, sIndex) => (
        <div key={sIndex} className="card mb-lg">
          <div className="card-header">
            <h3 className="card-title">
              {salonItem.salon || `Salón ${sIndex + 1}`}
            </h3>
          </div>
          <div className="card-body">
            <div className="form-group mb-lg">
              <label className="form-label">Seleccionar Salón:</label>
              <select
                className="form-select"
                value={salonItem.salon}
                onChange={(e) => handleSalonChange(sIndex, e.target.value)}
              >
                <option value="">Seleccione un salón</option>
                {SALONES_CCCR.map((salon, i) => (
                  <option key={i} value={salon}>{salon}</option>
                ))}
              </select>
            </div>

            {/* Infraestructura */}
            <div className="grid">
              {salonItem.infraestructura.map((item, iIndex) => (
                <div key={iIndex} className="infrastructure-item">
                  <h4 className="infrastructure-title">{item.nombre}</h4>
                  
                  <div className="form-group">
                    <label className="form-label">Estado:</label>
                    <select
                      className="form-select"
                      value={item.estado}
                      onChange={(e) => handleInfraChange(sIndex, iIndex, "estado", e.target.value)}
                    >
                      {ESTADOS_INFRAESTRUCTURA.map(estado => (
                        <option key={estado.value} value={estado.value}>
                          {estado.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {item.estado === "Novedad Encontrada" && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Hallazgo:</label>
                        <select
                          className="form-select"
                          value={item.hallazgo}
                          onChange={(e) => handleInfraChange(sIndex, iIndex, "hallazgo", e.target.value)}
                        >
                          <option value="">Seleccione</option>
                          {TIPOS_HALLAZGO.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(item.hallazgo === "Nuevo" || item.hallazgo === "Existente") && (
                        <>
                          <div className="form-group">
                            <label className="form-label">Comentarios:</label>
                            <textarea
                              className="form-textarea"
                              value={item.comentarios}
                              onChange={(e) => handleInfraChange(sIndex, iIndex, "comentarios", e.target.value)}
                              rows="3"
                            />
                          </div>

                          {/* Mantener checkbox de '¿Entra en reporte de daños?' para Recepción/Nuevo */}
                          {tipoEntrega === "Recepción" && item.hallazgo === "Nuevo" && (
                            <div className="form-group">
                              <label className="form-label">¿Entra en reporte de daños? *</label>
                              <div className="form-radio">
                                <label style={{ marginRight: 12 }}>
                                  <input
                                    type="radio"
                                    name={`esDano-${sIndex}-${iIndex}`}
                                    value="si"
                                    checked={item.esDano === true}
                                    onChange={() => handleInfraChange(sIndex, iIndex, "esDano", true)}
                                    aria-required="true"
                                  />
                                  <span style={{ marginLeft: 6 }}>Sí</span>
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name={`esDano-${sIndex}-${iIndex}`}
                                    value="no"
                                    checked={item.esDano === false}
                                    onChange={() => handleInfraChange(sIndex, iIndex, "esDano", false)}
                                    aria-required="true"
                                  />
                                  <span style={{ marginLeft: 6 }}>No</span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Pregunta de notificación para hallazgos existentes */}
                          {item.hallazgo === "Existente" && (
                            <div className="form-group">
                              <label className="form-label">Notificar al Cliente?</label>
                              <div className="form-radio">
                                <label style={{ marginRight: 12 }}>
                                  <input
                                    type="radio"
                                    name={`notificar-${sIndex}-${iIndex}`}
                                    value="si"
                                    checked={item.notificarCliente === true}
                                    onChange={() => handleInfraChange(sIndex, iIndex, 'notificarCliente', true)}
                                  />
                                  <span style={{ marginLeft: 6 }}>Sí</span>
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name={`notificar-${sIndex}-${iIndex}`}
                                    value="no"
                                    checked={item.notificarCliente === false}
                                    onChange={() => handleInfraChange(sIndex, iIndex, 'notificarCliente', false)}
                                  />
                                  <span style={{ marginLeft: 6 }}>No</span>
                                </label>
                              </div>
                              <p className="text-muted text-sm" style={{ marginTop: 6 }}>
                                Selecciona "Sí" para incluir este hallazgo existente en el correo al cliente.
                              </p>
                            </div>
                          )}

                          {/* Siempre permitir adjuntar imagen cuando hallazgo sea Nuevo o Existente */}
                          <div style={{ marginTop: 8 }}>
                            <label className="form-label">Adjuntar imagen:</label>
                            <ImageUpload
                              onImageUploaded={(imageDataArray) => handleImageUploaded(sIndex, iIndex, imageDataArray)}
                              currentImageUrls={item.imagenUrl}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Botones de acción al final */}
      <div className="flex gap-md justify-center form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddSalon}
        >
          <i className="fas fa-plus"></i>
          Agregar Salón
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={limpiarFormulario}
        >
          <i className="fas fa-trash"></i>
          Limpiar Formulario
        </button>
        <button
          className="btn btn-primary"
          onClick={handleGuardar}
        >
          <i className="fas fa-save"></i>
          Guardar
        </button>
      </div>
    </div>
  )
}

export default ModuloRevisionArea

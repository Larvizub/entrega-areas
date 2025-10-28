import { useState, useEffect } from 'preact/hooks'
import { useUsuarios } from '../hooks/useUsuarios'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'

const ModuloUsuarios = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showSpinner, setShowSpinner] = useState(false)
  const [usuarioToEdit, setUsuarioToEdit] = useState(null)
  const [usuarioToDelete, setUsuarioToDelete] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'usuario' // 'usuario' o 'administrador'
  })
  const [errors, setErrors] = useState({})

  const { usuarios, loading, saveUsuario, deleteUsuario } = useUsuarios()
  const { user: currentUser } = useAuth()

  // Verificar si el usuario actual es administrador
  const isAdmin = () => {
    const userData = usuarios.find(u => u.email === currentUser?.email)
    return userData?.rol === 'administrador'
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      rol: 'usuario'
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido'
    }

    if (!formData.rol) {
      newErrors.rol = 'El rol es requerido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateUsuario = () => {
    if (!isAdmin()) {
      alert('No tienes permisos para crear usuarios')
      return
    }
    resetForm()
    setShowCreateModal(true)
  }

  const handleEditUsuario = (usuario) => {
    if (!isAdmin()) {
      alert('No tienes permisos para editar usuarios')
      return
    }
    setUsuarioToEdit(usuario)
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    })
    setShowEditModal(true)
  }

  const handleDeleteUsuario = (usuario) => {
    if (!isAdmin()) {
      alert('No tienes permisos para eliminar usuarios')
      return
    }
    setUsuarioToDelete(usuario)
    setShowDeleteModal(true)
  }

  const handleSubmitCreate = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setShowSpinner(true)
    try {
      await saveUsuario(formData)
      setShowCreateModal(false)
      alert('Usuario creado correctamente')
    } catch (error) {
      alert('Error al crear usuario: ' + error.message)
    } finally {
      setShowSpinner(false)
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setShowSpinner(true)
    try {
      await saveUsuario({ ...formData, id: usuarioToEdit.id })
      setShowEditModal(false)
      setUsuarioToEdit(null)
      alert('Usuario actualizado correctamente')
    } catch (error) {
      alert('Error al actualizar usuario: ' + error.message)
    } finally {
      setShowSpinner(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!usuarioToDelete) return

    setShowSpinner(true)
    try {
      await deleteUsuario(usuarioToDelete.id)
      setShowDeleteModal(false)
      setUsuarioToDelete(null)
      alert('Usuario eliminado correctamente')
    } catch (error) {
      alert('Error al eliminar usuario: ' + error.message)
    } finally {
      setShowSpinner(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="text-center py-xl">
          <Spinner />
          <p className="mt-md">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-lg">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        {isAdmin() && (
          <button
            onClick={handleCreateUsuario}
            className="btn btn-primary"
          >
            <i className="fas fa-plus mr-sm"></i>
            Nuevo Usuario
          </button>
        )}
      </div>

      {!isAdmin() && (
        <div className="alert alert-warning mb-lg">
          <strong>Nota:</strong> Solo los administradores pueden gestionar usuarios.
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Lista de Usuarios</h2>
        </div>
        <div className="card-body">
          {usuarios.length === 0 ? (
            <p className="text-center py-lg text-gray-500">
              No hay usuarios registrados
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="table usuarios-table">
                <thead>
                  <tr>
                    <th className="text-left">Nombre</th>
                    <th className="text-left">Correo Electrónico</th>
                    <th className="text-left">Rol</th>
                    <th className="text-left">Fecha de Creación</th>
                    {isAdmin() && (
                      <th className="text-center actions-column">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td className="user-name">{usuario.nombre}</td>
                      <td className="user-email">{usuario.email}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium user-role ${
                          usuario.rol === 'administrador'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {usuario.rol === 'administrador' ? 'Administrador' : 'Usuario'}
                        </span>
                      </td>
                      <td className="user-date">
                        {usuario.createdAt ? new Date(usuario.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      {isAdmin() && (
                        <td className="text-center">
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEditUsuario(usuario)}
                              className="action-btn edit"
                              title="Editar usuario"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDeleteUsuario(usuario)}
                              className="action-btn delete"
                              title="Eliminar usuario"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleSubmitCreate}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={`form-input ${errors.nombre ? 'border-red-500' : ''}`}
              placeholder="Nombre completo"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-xs">{errors.nombre}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-xs">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleInputChange}
              className={`form-select ${errors.rol ? 'border-red-500' : ''}`}
            >
              <option value="usuario">Usuario Estándar</option>
              <option value="administrador">Administrador</option>
            </select>
            {errors.rol && <p className="text-red-500 text-sm mt-xs">{errors.rol}</p>}
          </div>

          <div className="flex justify-end gap-md mt-lg">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Crear Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Usuario"
      >
        <form onSubmit={handleSubmitEdit}>
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={`form-input ${errors.nombre ? 'border-red-500' : ''}`}
              placeholder="Nombre completo"
            />
            {errors.nombre && <p className="text-red-500 text-sm mt-xs">{errors.nombre}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-xs">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Rol *</label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleInputChange}
              className={`form-select ${errors.rol ? 'border-red-500' : ''}`}
            >
              <option value="usuario">Usuario Estándar</option>
              <option value="administrador">Administrador</option>
            </select>
            {errors.rol && <p className="text-red-500 text-sm mt-xs">{errors.rol}</p>}
          </div>

          <div className="flex justify-end gap-md mt-lg">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Actualizar Usuario
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Usuario */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar eliminación"
      >
        <p className="mb-lg">
          ¿Estás seguro de que quieres eliminar al usuario <strong>"{usuarioToDelete?.nombre}"</strong>?<br />
          <span style={{color: '#dc3545'}}>Esta acción no se puede deshacer.</span>
        </p>
        <div className="flex justify-end gap-md">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmDelete}
            className="btn btn-danger"
          >
            Eliminar Usuario
          </button>
        </div>
      </Modal>

      {showSpinner && <Spinner />}
    </div>
  )
}

export default ModuloUsuarios
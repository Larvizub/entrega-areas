import { useState, useEffect } from 'preact/hooks'
import { ref, onValue, push, set, get, update, remove } from 'firebase/database'
import { db } from '../config/firebase'

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 Iniciando conexión con usuarios en Firebase Database...')
    const usuariosRef = ref(db, "usuarios")

    const handleData = (snapshot) => {
      console.log('👥 Datos de usuarios recibidos de Firebase:', snapshot.val())
      const data = snapshot.val()
      if (data) {
        const lista = Object.entries(data).map(([id, usuario]) => ({
          ...usuario,
          id
        }))
        console.log('✅ Usuarios procesados:', lista)
        setUsuarios(lista)
      } else {
        console.log('⚠️ No hay usuarios en Firebase')
        setUsuarios([])
      }
      setLoading(false)
    }

    const handleError = (error) => {
      console.error('❌ Error al conectar con Firebase (usuarios):', error)
      setLoading(false)
    }

    const unsubscribe = onValue(usuariosRef, handleData, handleError)
    return () => unsubscribe()
  }, [])

  const saveUsuario = async (usuarioData) => {
    try {
      console.log('💾 Guardando usuario:', usuarioData)

      // Verificar si el usuario ya existe por email
      const existingUser = usuarios.find(u => u.email === usuarioData.email && u.id !== usuarioData.id)
      if (existingUser) {
        throw new Error('Ya existe un usuario con este correo electrónico')
      }

      if (usuarioData.id) {
        // Actualizar usuario existente
        const usuarioRef = ref(db, `usuarios/${usuarioData.id}`)
        await update(usuarioRef, {
          ...usuarioData,
          updatedAt: new Date().toISOString()
        })
        console.log('✅ Usuario actualizado:', usuarioData.id)
      } else {
        // Crear nuevo usuario
        const usuariosRef = ref(db, "usuarios")
        const newUsuarioRef = push(usuariosRef)
        await set(newUsuarioRef, {
          ...usuarioData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        console.log('✅ Usuario creado:', newUsuarioRef.key)
      }
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
      throw error
    }
  }

  const deleteUsuario = async (usuarioId) => {
    try {
      console.log('🗑️ Eliminando usuario:', usuarioId)
      const usuarioRef = ref(db, `usuarios/${usuarioId}`)
      await remove(usuarioRef)
      console.log('✅ Usuario eliminado:', usuarioId)
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error)
      throw error
    }
  }

  const getUsuarioById = (id) => {
    return usuarios.find(u => u.id === id)
  }

  const getUsuarioByEmail = (email) => {
    return usuarios.find(u => u.email === email)
  }

  const initializeFirstAdmin = async (userEmail, userName) => {
    try {
      console.log('🔧 Inicializando primer administrador:', userEmail)

      // Verificar si ya hay usuarios
      if (usuarios.length > 0) {
        console.log('ℹ️ Ya existen usuarios, no se inicializa administrador')
        return false
      }

      // Crear el primer administrador
      const usuariosRef = ref(db, "usuarios")
      const newUsuarioRef = push(usuariosRef)
      await set(newUsuarioRef, {
        nombre: userName,
        email: userEmail,
        rol: 'administrador',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Primer administrador creado:', newUsuarioRef.key)
      return true
    } catch (error) {
      console.error('❌ Error inicializando primer administrador:', error)
      throw error
    }
  }

  return {
    usuarios,
    loading,
    saveUsuario,
    deleteUsuario,
    getUsuarioByEmail,
    getUsuarioById,
    initializeFirstAdmin
  }
}
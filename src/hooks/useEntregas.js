import { useState, useEffect } from 'preact/hooks'
import { ref, onValue, push, set, get } from 'firebase/database'
import { db } from '../config/firebase'

export const useEntregas = () => {
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔄 Iniciando conexión con Firebase Database...')
    const entregasRef = ref(db, "entregas")
    
    const handleData = (snapshot) => {
      console.log('📦 Datos recibidos de Firebase:', snapshot.val())
      const data = snapshot.val()
      if (data) {
        const lista = Object.entries(data).map(([id, entrega]) => {
          // Normalizar las imágenes para asegurar que sean arrays
          if (entrega.salones) {
            entrega.salones = entrega.salones.map(salon => {
              if (salon.infraestructura) {
                salon.infraestructura = salon.infraestructura.map(item => {
                  if (item.imagenUrl && !Array.isArray(item.imagenUrl)) {
                    item.imagenUrl = [item.imagenUrl]
                  }
                  if (item.imagenId && !Array.isArray(item.imagenId)) {
                    item.imagenId = [item.imagenId]
                  }
                  return item
                })
              }
              return salon
            })
          }
          return { ...entrega, id }
        })
        console.log('✅ Entregas procesadas:', lista)
        console.log('🔍 Primera entrega como ejemplo:', lista[0])
        setEntregas(lista)
      } else {
        console.log('⚠️ No hay datos en Firebase')
        setEntregas([])
      }
      setLoading(false)
    }

    const handleError = (error) => {
      console.error('❌ Error al conectar con Firebase:', error)
      setLoading(false)
    }

    const unsubscribe = onValue(entregasRef, handleData, handleError)
    
    return () => unsubscribe()
  }, [])

  const saveEntrega = async (data) => {
    const entregasRef = ref(db, "entregas")
    
    // Buscar si ya existe una entrega con los mismos datos básicos
    const existingEntrega = entregas.find(entrega => 
      entrega.recinto === data.recinto && 
      entrega.nombreEvento === data.nombreEvento && 
      entrega.fechaEvento === data.fechaEvento &&
      entrega.tipoEntrega === data.tipoEntrega
    )
    
    if (existingEntrega && existingEntrega.id) {
      // Actualizar la entrega existente, manteniendo la fecha de creación
      const entregaRef = ref(db, `entregas/${existingEntrega.id}`)
      const updatedData = {
        ...data,
        fechaCreacion: existingEntrega.fechaCreacion, // Mantener fecha original
        fechaActualizacion: new Date().toISOString()
      }
      await set(entregaRef, updatedData)
      console.log('✅ Entrega actualizada:', existingEntrega.id)
    } else {
      // Crear nueva entrega
      const newRef = push(entregasRef)
      await set(newRef, data)
      console.log('✅ Nueva entrega creada')
    }
  }

  const deleteEntrega = async (entregaId) => {
    const entregaRef = ref(db, `entregas/${entregaId}`)
    await set(entregaRef, null) // Eliminar el registro
    console.log('✅ Entrega eliminada:', entregaId)
  }

  const cleanDuplicates = async () => {
    const entregasRef = ref(db, "entregas")
    const snapshot = await get(entregasRef)
    const data = snapshot.val()
    
    if (!data) return
    
    const entries = Object.entries(data)
    const seen = new Set()
    const duplicates = []
    
    // Identificar duplicados basados en recinto + nombreEvento + fechaEvento + tipoEntrega
    entries.forEach(([id, entrega]) => {
      const key = `${entrega.recinto}-${entrega.nombreEvento}-${entrega.fechaEvento}-${entrega.tipoEntrega || ''}`
      if (seen.has(key)) {
        duplicates.push(id)
      } else {
        seen.add(key)
      }
    })
    
    // Eliminar duplicados, manteniendo solo el más reciente
    for (const duplicateId of duplicates) {
      await deleteEntrega(duplicateId)
    }
    
    console.log(`🧹 Eliminados ${duplicates.length} duplicados`)
    return duplicates.length
  }

  return { entregas, loading, saveEntrega, deleteEntrega, cleanDuplicates }
}

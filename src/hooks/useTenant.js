import { useState, useEffect } from 'preact/hooks'
import { getDatabaseByUrl, DATABASE_URLS } from '../config/firebase'

export const useTenant = (user, authDb) => {
  const [recinto, setRecinto] = useState("")
  const [activeDb, setActiveDb] = useState(authDb)

  useEffect(() => {
    if (user) {
      // Si hay usuario, usamos la DB determinada por useAuth
      setActiveDb(authDb)
    } else {
      // Si no hay usuario, dependemos del recinto seleccionado
      if (recinto === 'CCCI') {
        setActiveDb(getDatabaseByUrl(DATABASE_URLS.CCCI))
      } else if (recinto === 'CEVP') {
        setActiveDb(getDatabaseByUrl(DATABASE_URLS.CEVP))
      } else {
        // Por defecto (CCCR o vacío) usamos la base de datos por defecto
        setActiveDb(getDatabaseByUrl(DATABASE_URLS.DEFAULT))
      }
    }
  }, [user, authDb, recinto])

  return { activeDb, recinto, setRecinto }
}

import { useState, useEffect } from 'preact/hooks'
import { onAuthStateChanged, signInWithPopup, signOut, OAuthProvider } from 'firebase/auth'
import { ref, onValue, push, set } from 'firebase/database'
import { auth, db } from '../config/firebase'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        // Buscar el rol del usuario en la base de datos
        const usuariosRef = ref(db, "usuarios")
        const unsubscribeUsers = onValue(usuariosRef, (snapshot) => {
          const data = snapshot.val()
          
          if (data) {
            const userData = Object.values(data).find(u => u.email?.toLowerCase() === firebaseUser.email?.toLowerCase())
            console.log('🔍 Auth Debug - UserData encontrado:', userData)
            
            if (userData) {
              // Usuario encontrado, asignar su rol
              console.log('🔍 Auth Debug - Rol asignado:', userData.rol || 'usuario')
              setUserRole(userData.rol || 'usuario')
            } else {
              // Usuario no encontrado, crearlo como usuario estándar
              console.log('� Auth Debug - Usuario no encontrado, creando como usuario estándar')
              const newUsuarioRef = ref(db, "usuarios")
              const userRef = push(newUsuarioRef)
              set(userRef, {
                nombre: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                email: firebaseUser.email,
                rol: 'usuario', // Por defecto usuario estándar
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              })
              setUserRole('usuario')
            }
          } else {
            // No hay datos de usuarios, crear primer administrador
            console.log('� Auth Debug - No hay usuarios, creando primer administrador')
            const newUsuarioRef = ref(db, "usuarios")
            const adminRef = push(newUsuarioRef)
            set(adminRef, {
              nombre: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              rol: 'administrador',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            setUserRole('administrador')
          }
          setLoading(false)
        })

        return () => unsubscribeUsers()
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  const login = () => {
    const provider = new OAuthProvider("microsoft.com")
    provider.setCustomParameters({
      tenant: "common"
    })
    return signInWithPopup(auth, provider)
  }

  const logout = () => {
    return signOut(auth)
  }

  return { user, userRole, loading, login, logout }
}

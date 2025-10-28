import { useState } from 'preact/hooks'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

  const login = async () => {
    // Mock login
    setUser({ displayName: 'Usuario Test' })
  }

  const logout = async () => {
    setUser(null)
  }

  return { user, loading, login, logout }
}

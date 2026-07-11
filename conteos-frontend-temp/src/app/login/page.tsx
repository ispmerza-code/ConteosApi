'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    IdUsuarios: '',
    Contraseña: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentials.IdUsuarios || !credentials.Contraseña) {
      setError('Por favor, completa todos los campos')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await login({
        IdUsuarios: parseInt(credentials.IdUsuarios),
        Contraseña: credentials.Contraseña
      })
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sistema de Conteos SCISP
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para continuar
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="IdUsuarios" className="sr-only">
                ID Usuario
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="IdUsuarios"
                  name="IdUsuarios"
                  type="number"
                  required
                  className="pl-10 relative block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ID de Usuario"
                  value={credentials.IdUsuarios}
                  onChange={(e) => setCredentials({ ...credentials, IdUsuarios: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="Contraseña" className="sr-only">
                Contraseña
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="Contraseña"
                  name="Contraseña"
                  type="password"
                  required
                  className="pl-10 relative block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Contraseña"
                  value={credentials.Contraseña}
                  onChange={(e) => setCredentials({ ...credentials, Contraseña: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <FiLogIn className="w-4 h-4 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Ejemplo: Usuario: 47579, Contraseña: tu_contraseña
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

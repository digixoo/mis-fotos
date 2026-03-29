'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const nombreGuardado = localStorage.getItem('misfotos_nombre')
    if (nombreGuardado) setNombre(nombreGuardado)
  }, [])

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    const codigoLimpio = codigo.trim().toUpperCase()
    if (!codigoLimpio) {
      setError('Ingresá el código de la sala.')
      return
    }

    setCargando(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('salas')
      .select('codigo')
      .eq('codigo', codigoLimpio)
      .single()

    setCargando(false)

    if (dbError || !data) {
      setError('No encontramos una sala con ese código. Verificá que esté bien escrito.')
      return
    }

    if (nombre.trim()) {
      localStorage.setItem('misfotos_nombre', nombre.trim())
    }

    router.push(`/sala/${codigoLimpio}`)
  }

  return (
    <main className="min-h-screen bg-rose-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / nombre */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500 mb-4 shadow-md">
            <span className="text-white text-3xl">📷</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">MisFotos</h1>
          <p className="text-gray-500 mt-1 text-sm">Compartí los mejores momentos</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleEntrar} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
              Código de sala
            </label>
            <input
              id="codigo"
              type="text"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase())
                setError('')
              }}
              placeholder="Ej: MARIA2025"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-800 text-lg font-mono tracking-widest placeholder:text-gray-300 placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Tu nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="¿Cómo te llamás? (opcional)"
              autoComplete="name"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition"
            />
          </div>

          {error && (
            <p className="text-rose-500 text-sm bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="h-12 rounded-xl bg-rose-500 text-white font-semibold text-base hover:bg-rose-600 active:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed mt-1"
          >
            {cargando ? 'Verificando...' : 'Entrar a la sala'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿No tenés el código? Pedíselo a los organizadores.
        </p>
      </div>
    </main>
  )
}

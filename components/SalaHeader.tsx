'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  nombre: string
  codigo: string
}

export default function SalaHeader({ nombre, codigo }: Props) {
  const router = useRouter()
  const [nombreInvitado, setNombreInvitado] = useState('')

  useEffect(() => {
    setNombreInvitado(localStorage.getItem('misfotos_nombre') ?? '')
  }, [])

  function handleSalir() {
    router.push('/')
  }

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
      {/* Ícono */}
      <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>

      {/* Info sala */}
      <div className="flex-1 min-w-0">
        <h1 className="font-semibold text-gray-800 truncate leading-tight">{nombre}</h1>
        <p className="text-xs text-gray-400 leading-tight">
          {nombreInvitado ? `Hola, ${nombreInvitado}` : `Código: ${codigo}`}
        </p>
      </div>

      {/* Botón salir */}
      <button
        onClick={handleSalir}
        className="flex-shrink-0 flex items-center gap-1.5 text-sm text-gray-400 hover:text-rose-500 transition px-2 py-1 rounded-lg hover:bg-rose-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span className="hidden sm:inline">Salir</span>
      </button>
    </header>
  )
}

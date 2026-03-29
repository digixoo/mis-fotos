'use client'

import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import { type Foto } from './FotoCard'

interface Props {
  fotos: Foto[]
  fotosLiked: Foto[]
  salaNombre: string
}

interface Progreso {
  actual: number
  total: number
  label: string
}

export default function DescargarFotos({ fotos, fotosLiked, salaNombre }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [progreso, setProgreso] = useState<Progreso | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function descargarZip(lista: Foto[], nombreArchivo: string) {
    setAbierto(false)
    setProgreso({ actual: 0, total: lista.length, label: nombreArchivo })

    const zip = new JSZip()
    const carpeta = zip.folder('fotos')!

    for (let i = 0; i < lista.length; i++) {
      try {
        const res = await fetch(lista[i].url_publica)
        const blob = await res.blob()
        carpeta.file(`foto-${String(i + 1).padStart(3, '0')}.jpg`, blob)
      } catch {
        // skip foto si falla la descarga individual
      }
      setProgreso({ actual: i + 1, total: lista.length, label: nombreArchivo })
    }

    const contenido = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(contenido)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreArchivo.replace(/\s+/g, '-')}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setProgreso(null)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        disabled={!!progreso || fotos.length === 0}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span className="hidden sm:inline">Descargar</span>
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-1.5 bg-white shadow-xl rounded-2xl border border-gray-100 py-1.5 w-60 z-30 overflow-hidden">
          <button
            onClick={() => descargarZip(fotos, salaNombre)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
          >
            <span className="block text-sm font-medium text-gray-800">Todas las fotos</span>
            <span className="text-xs text-gray-400">{fotos.length} foto{fotos.length !== 1 ? 's' : ''} · .zip</span>
          </button>

          {fotosLiked.length > 0 && (
            <>
              <div className="h-px bg-gray-100 mx-3" />
              <button
                onClick={() => descargarZip(fotosLiked, `${salaNombre} — me gustas`)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
              >
                <span className="block text-sm font-medium text-gray-800">Solo mis me gustas</span>
                <span className="text-xs text-gray-400">{fotosLiked.length} foto{fotosLiked.length !== 1 ? 's' : ''} · .zip</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Barra de progreso de descarga */}
      {progreso && (
        <div className="fixed bottom-24 left-4 z-40 bg-white shadow-xl rounded-2xl border border-gray-100 px-4 py-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700 truncate pr-2">Preparando ZIP…</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{progreso.actual}/{progreso.total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 truncate">{progreso.label}</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { comprimirFoto } from '@/lib/compresion'

interface Props {
  salaId: string
  salaCodigo: string
}

type Estado = 'comprimiendo' | 'subiendo' | 'ok' | 'error'

function esVideo(archivo: File): boolean {
  return archivo.type.startsWith('video/')
}

function obtenerExtension(archivo: File): string {
  const ext = archivo.name.split('.').pop()?.toLowerCase()
  if (ext) return ext
  if (archivo.type.startsWith('video/')) return archivo.type.split('/')[1] || 'mp4'
  return 'jpg'
}

interface ProgresoFoto {
  nombre: string
  estado: Estado
}

function Spinner() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-rose-400 border-t-transparent animate-spin flex-shrink-0" />
  )
}

function EstadoIcono({ estado }: { estado: Estado }) {
  if (estado === 'comprimiendo' || estado === 'subiendo') return <Spinner />
  if (estado === 'ok') return <span className="w-4 h-4 flex items-center justify-center text-emerald-500 flex-shrink-0">✓</span>
  return <span className="w-4 h-4 flex items-center justify-center text-rose-400 flex-shrink-0">✕</span>
}

const ETIQUETA: Record<Estado, string> = {
  comprimiendo: 'Comprimiendo',
  subiendo: 'Subiendo',
  ok: 'Listo',
  error: 'Error',
}

const COLOR_ETIQUETA: Record<Estado, string> = {
  comprimiendo: 'text-amber-500',
  subiendo: 'text-rose-400',
  ok: 'text-emerald-500',
  error: 'text-rose-400',
}

export default function SubirFotos({ salaId, salaCodigo }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progresos, setProgresos] = useState<ProgresoFoto[]>([])
  const [subiendo, setSubiendo] = useState(false)

  function actualizarEstado(index: number, estado: Estado) {
    setProgresos((prev) => prev.map((p, i) => (i === index ? { ...p, estado } : p)))
  }

  async function handleArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? [])
    if (archivos.length === 0) return

    const nombre = localStorage.getItem('misfotos_nombre') || null

    setSubiendo(true)
    setProgresos(archivos.map((f) => ({ nombre: f.name, estado: 'comprimiendo' })))

    for (let i = 0; i < archivos.length; i++) {
      try {
        const archivo = archivos[i]
        let archivoFinal: File
        if (esVideo(archivo)) {
          actualizarEstado(i, 'subiendo')
          archivoFinal = archivo
        } else {
          actualizarEstado(i, 'comprimiendo')
          archivoFinal = await comprimirFoto(archivo)
          actualizarEstado(i, 'subiendo')
        }
        const ext = obtenerExtension(archivo)
        const path = `${salaCodigo}/${Date.now()}-${i}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('photo-project')
          .upload(path, archivoFinal, { contentType: archivo.type, upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('photo-project')
          .getPublicUrl(path)

        const { error: dbError } = await supabase.from('fotos').insert({
          sala_id: salaId,
          storage_path: path,
          url_publica: urlData.publicUrl,
          subida_por: nombre,
          tamanio_kb: Math.round(archivoFinal.size / 1024),
        })

        if (dbError) throw dbError

        // Notificar a GaleriaFotos para mostrar la foto sin esperar Realtime
        const { data: fotoInsertada } = await supabase
          .from('fotos')
          .select('id, url_publica, subida_por, subida_en, tamanio_kb')
          .eq('storage_path', path)
          .single()

        if (fotoInsertada) {
          window.dispatchEvent(new CustomEvent('foto-subida', { detail: fotoInsertada }))
        }

        actualizarEstado(i, 'ok')
      } catch {
        actualizarEstado(i, 'error')
      }
    }

    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => setProgresos([]), 4000)
  }

  const totalOk = progresos.filter((p) => p.estado === 'ok').length
  const totalError = progresos.filter((p) => p.estado === 'error').length
  const totalEnProceso = progresos.length - totalOk - totalError

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleArchivos}
      />

      {/* Panel de progreso */}
      {progresos.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {totalEnProceso > 0
                ? `Subiendo ${progresos.length} archivo${progresos.length > 1 ? 's' : ''}…`
                : totalError > 0
                ? `${totalOk} ok · ${totalError} con error`
                : `${totalOk} foto${totalOk > 1 ? 's' : ''} subida${totalOk > 1 ? 's' : ''}`}
            </span>
            {totalEnProceso > 0 && (
              <div className="w-4 h-4 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
            )}
          </div>

          {/* Lista de fotos */}
          <ul className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {progresos.map((p, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <EstadoIcono estado={p.estado} />
                <span className="flex-1 text-sm text-gray-700 truncate">{p.nombre}</span>
                <span className={`text-xs font-medium ${COLOR_ETIQUETA[p.estado]}`}>
                  {ETIQUETA[p.estado]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="fixed bottom-6 right-4 z-40 h-14 px-5 rounded-full bg-rose-500 text-white font-semibold shadow-lg hover:bg-rose-600 active:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-base"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span>{subiendo ? 'Subiendo…' : 'Subir fotos'}</span>
      </button>
    </>
  )
}

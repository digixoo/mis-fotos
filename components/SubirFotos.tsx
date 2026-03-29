'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { comprimirFoto } from '@/lib/compresion'

interface Props {
  salaId: string
  salaCodigo: string
}

interface ProgresoFoto {
  nombre: string
  estado: 'comprimiendo' | 'subiendo' | 'ok' | 'error'
}

const ICONO: Record<ProgresoFoto['estado'], string> = {
  comprimiendo: '⏳',
  subiendo: '⬆️',
  ok: '✅',
  error: '❌',
}

export default function SubirFotos({ salaId, salaCodigo }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progresos, setProgresos] = useState<ProgresoFoto[]>([])
  const [subiendo, setSubiendo] = useState(false)

  function actualizarEstado(index: number, estado: ProgresoFoto['estado']) {
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
        actualizarEstado(i, 'comprimiendo')
        const comprimida = await comprimirFoto(archivos[i])

        actualizarEstado(i, 'subiendo')
        const path = `${salaCodigo}/${Date.now()}-${i}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('photo-project')
          .upload(path, comprimida, { contentType: 'image/jpeg', upsert: false })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('photo-project')
          .getPublicUrl(path)

        const { error: dbError } = await supabase.from('fotos').insert({
          sala_id: salaId,
          storage_path: path,
          url_publica: urlData.publicUrl,
          subida_por: nombre,
          tamanio_kb: Math.round(comprimida.size / 1024),
        })

        if (dbError) throw dbError

        actualizarEstado(i, 'ok')
      } catch {
        actualizarEstado(i, 'error')
      }
    }

    setSubiendo(false)
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => setProgresos([]), 3000)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleArchivos}
      />

      {/* Progreso de subida */}
      {progresos.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2 max-w-[260px]">
          {progresos.map((p, i) => (
            <div
              key={i}
              className="bg-white shadow-md rounded-xl px-3 py-2 text-sm flex items-center gap-2 border border-gray-100"
            >
              <span>{ICONO[p.estado]}</span>
              <span className="truncate text-gray-700">{p.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="fixed bottom-6 right-4 z-40 h-14 px-5 rounded-full bg-rose-500 text-white font-semibold shadow-lg hover:bg-rose-600 active:bg-rose-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-base"
      >
        <span className="text-xl">📷</span>
        <span>{subiendo ? 'Subiendo...' : 'Subir fotos'}</span>
      </button>
    </>
  )
}

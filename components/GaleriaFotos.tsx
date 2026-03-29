'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import FotoCard, { type Foto } from './FotoCard'

interface Props {
  salaId: string
}

export default function GaleriaFotos({ salaId }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [cargando, setCargando] = useState(true)
  const [fotoAmpliada, setFotoAmpliada] = useState<Foto | null>(null)

  useEffect(() => {
    async function cargarFotos() {
      const { data } = await supabase
        .from('fotos')
        .select('id, url_publica, subida_por, subida_en, tamanio_kb')
        .eq('sala_id', salaId)
        .order('subida_en', { ascending: false })

      setFotos(data ?? [])
      setCargando(false)
    }

    cargarFotos()

    const channel = supabase
      .channel(`sala-${salaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setFotos((prev) => [payload.new as Foto, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setFotos((prev) => prev.filter((f) => f.id !== (payload.old as { id: string }).id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [salaId])

  function descargarFoto(foto: Foto) {
    const a = document.createElement('a')
    a.href = foto.url_publica
    a.download = `misfotos-${foto.id}.jpg`
    a.target = '_blank'
    a.click()
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (fotos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <span className="text-5xl mb-4">📷</span>
        <p className="text-gray-500 font-medium">Todavía no hay fotos</p>
        <p className="text-gray-400 text-sm mt-1">¡Sé el primero en subir una!</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
        {fotos.map((foto) => (
          <FotoCard key={foto.id} foto={foto} onClick={() => setFotoAmpliada(foto)} />
        ))}
      </div>

      {/* Lightbox */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div
            className="relative w-full max-w-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ maxHeight: '70vh' }}>
              <Image
                src={fotoAmpliada.url_publica}
                alt="Foto ampliada"
                width={800}
                height={600}
                className="object-contain w-full rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            </div>
            {fotoAmpliada.subida_por && (
              <p className="text-white/60 text-sm mt-3 text-center">
                Foto de <span className="text-white/90">{fotoAmpliada.subida_por}</span>
              </p>
            )}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => descargarFoto(fotoAmpliada)}
                className="h-11 px-6 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition"
              >
                Descargar
              </button>
              <button
                onClick={() => setFotoAmpliada(null)}
                className="h-11 px-6 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

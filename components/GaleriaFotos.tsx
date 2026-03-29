'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import FotoCard, { type Foto } from './FotoCard'
import DestacadasSection from './DestacadasSection'
import DescargarFotos from './DescargarFotos'

interface Props {
  salaId: string
  salaNombre: string
}

const LIKES_KEY = 'misfotos_likes'

function cargarLikes(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function guardarLikes(likes: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]))
}

export default function GaleriaFotos({ salaId, salaNombre }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [cargando, setCargando] = useState(true)
  const [likesGuardados, setLikesGuardados] = useState<Set<string>>(new Set())
  const [fotoAmpliada, setFotoAmpliada] = useState<Foto | null>(null)

  useEffect(() => {
    setLikesGuardados(cargarLikes())

    async function cargarFotos() {
      const { data } = await supabase
        .from('fotos')
        .select('id, url_publica, subida_por, subida_en, tamanio_kb, megustas')
        .eq('sala_id', salaId)
        .order('subida_en', { ascending: false })

      setFotos(data ?? [])
      setCargando(false)
    }

    cargarFotos()

    // Foto subida localmente (sin esperar Realtime)
    function onFotoSubida(e: Event) {
      const foto = (e as CustomEvent<Foto>).detail
      setFotos((prev) => {
        if (prev.some((f) => f.id === foto.id)) return prev
        return [{ ...foto, megustas: 0 }, ...prev]
      })
    }
    window.addEventListener('foto-subida', onFotoSubida)

    const channel = supabase
      .channel(`sala-${salaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setFotos((prev) => {
            if (prev.some((f) => f.id === (payload.new as Foto).id)) return prev
            return [payload.new as Foto, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setFotos((prev) =>
            prev.map((f) =>
              f.id === (payload.new as Foto).id
                ? { ...f, megustas: (payload.new as Foto).megustas }
                : f
            )
          )
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
      window.removeEventListener('foto-subida', onFotoSubida)
      supabase.removeChannel(channel)
    }
  }, [salaId])

  async function handleLike(foto: Foto) {
    const yaLikeado = likesGuardados.has(foto.id)
    const delta = yaLikeado ? -1 : 1

    // Update optimista
    setFotos((prev) =>
      prev.map((f) =>
        f.id === foto.id ? { ...f, megustas: Math.max(0, f.megustas + delta) } : f
      )
    )

    const nuevosLikes = new Set(likesGuardados)
    if (yaLikeado) {
      nuevosLikes.delete(foto.id)
    } else {
      nuevosLikes.add(foto.id)
    }
    setLikesGuardados(nuevosLikes)
    guardarLikes(nuevosLikes)

    await supabase.rpc('votar_foto', { foto_id: foto.id, delta })
  }

  function descargarFoto(foto: Foto) {
    const a = document.createElement('a')
    a.href = foto.url_publica
    a.download = `misfotos-${foto.id}.jpg`
    a.target = '_blank'
    a.click()
  }

  const fotosLiked = fotos.filter((f) => likesGuardados.has(f.id))

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Sección destacadas */}
      <DestacadasSection fotos={fotos} onVerFoto={setFotoAmpliada} />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white sticky top-[57px] z-20">
        <span className="text-sm text-gray-400">
          {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
        </span>
        <DescargarFotos fotos={fotos} fotosLiked={fotosLiked} salaNombre={salaNombre} />
      </div>

      {/* Grid */}
      {fotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <span className="text-5xl mb-4">📷</span>
          <p className="text-gray-500 font-medium">Todavía no hay fotos</p>
          <p className="text-gray-400 text-sm mt-1">¡Sé el primero en subir una!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
          {fotos.map((foto) => (
            <FotoCard
              key={foto.id}
              foto={foto}
              liked={likesGuardados.has(foto.id)}
              onLike={() => handleLike(foto)}
              onClick={() => setFotoAmpliada(foto)}
            />
          ))}
        </div>
      )}

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
            <Image
              src={fotoAmpliada.url_publica}
              alt="Foto ampliada"
              width={800}
              height={600}
              className="object-contain w-full rounded-xl"
              style={{ maxHeight: '70vh' }}
            />

            <div className="flex items-center justify-between w-full mt-3 px-1">
              <div>
                {fotoAmpliada.subida_por && (
                  <p className="text-white/60 text-sm">
                    Foto de <span className="text-white/90">{fotoAmpliada.subida_por}</span>
                  </p>
                )}
                {fotoAmpliada.megustas > 0 && (
                  <p className="text-rose-400 text-xs mt-0.5">❤ {fotoAmpliada.megustas} me gusta{fotoAmpliada.megustas !== 1 ? 's' : ''}</p>
                )}
              </div>
              <button
                onClick={() => handleLike(fotoAmpliada)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm transition ${
                  likesGuardados.has(fotoAmpliada.id)
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/10 text-white hover:bg-rose-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={likesGuardados.has(fotoAmpliada.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Me gusta
              </button>
            </div>

            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => descargarFoto(fotoAmpliada)}
                className="h-11 px-6 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
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

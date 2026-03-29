'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { type Foto } from './FotoCard'

interface Props {
  fotos: Foto[]
  onVerFoto: (foto: Foto) => void
  onDescargar: (foto: Foto) => void
}

const AUTOPLAY_MS = 4000

export default function DestacadasSection({ fotos, onVerFoto, onDescargar }: Props) {
  const destacadas = fotos
    .filter((f) => f.megustas > 0)
    .sort((a, b) => b.megustas - a.megustas)
    .slice(0, 10)

  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resetear índice si las fotos cambian
  useEffect(() => {
    setIndice(0)
  }, [destacadas.length])

  // Autoplay
  useEffect(() => {
    if (destacadas.length < 2 || pausado) return
    timerRef.current = setTimeout(() => {
      setIndice((i) => (i + 1) % destacadas.length)
    }, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [indice, pausado, destacadas.length])

  if (destacadas.length === 0) return null

  const foto = destacadas[indice]

  function anterior() {
    setIndice((i) => (i - 1 + destacadas.length) % destacadas.length)
  }

  function siguiente() {
    setIndice((i) => (i + 1) % destacadas.length)
  }

  return (
    <section className="pt-4 pb-1">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Destacadas
        </h2>
        <span className="text-xs text-gray-300">{indice + 1} / {destacadas.length}</span>
      </div>

      {/* Carrusel */}
      <div className="px-4 md:flex md:justify-center">
      <div
        className="relative w-full md:w-96 rounded-2xl overflow-hidden shadow-md"
        style={{ aspectRatio: '4/3' }}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        onTouchStart={() => setPausado(true)}
        onTouchEnd={() => { setPausado(false) }}
      >
        {/* Imagen */}
        <button
          onClick={() => onVerFoto(foto)}
          className="absolute inset-0 w-full h-full"
        >
          {destacadas.map((f, i) => (
            <div
              key={f.id}
              className={`absolute inset-0 transition-opacity duration-500 ${i === indice ? 'opacity-100' : 'opacity-0'}`}
            >
              <Image
                src={f.url_publica}
                alt={`Foto destacada de ${f.subida_por ?? 'invitado'}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 700px"
                priority={i === 0}
              />
            </div>
          ))}
          {/* Gradiente inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </button>

        {/* Info inferior */}
        <div className="absolute bottom-3 left-4 right-14 pointer-events-none">
          {foto.subida_por && (
            <p className="text-white/80 text-xs mb-0.5">Foto de {foto.subida_por}</p>
          )}
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-white text-xs font-bold">{foto.megustas}</span>
          </div>
        </div>

        {/* Botón descargar */}
        <button
          onClick={(e) => { e.stopPropagation(); onDescargar(foto) }}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        {/* Flechas (solo si hay más de 1) */}
        {destacadas.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); anterior() }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center transition z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); siguiente() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center transition z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </>
        )}

        {/* Puntos indicadores */}
        {destacadas.length > 1 && (
          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {destacadas.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === indice ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      <div className="h-px bg-gray-100 mx-4 mt-4" />
    </section>
  )
}

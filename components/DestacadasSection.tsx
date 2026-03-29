'use client'

import Image from 'next/image'
import { type Foto } from './FotoCard'

interface Props {
  fotos: Foto[]
  onVerFoto: (foto: Foto) => void
}

export default function DestacadasSection({ fotos, onVerFoto }: Props) {
  const destacadas = fotos
    .filter((f) => f.megustas > 0)
    .sort((a, b) => b.megustas - a.megustas)
    .slice(0, 10)

  if (destacadas.length === 0) return null

  return (
    <section className="pt-4 pb-1">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
        Destacadas
      </h2>
      <div className="flex gap-2.5 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {destacadas.map((foto) => (
          <button
            key={foto.id}
            onClick={() => onVerFoto(foto)}
            className="flex-shrink-0 relative w-32 h-32 rounded-2xl overflow-hidden shadow-sm ring-2 ring-rose-200"
          >
            <Image
              src={foto.url_publica}
              alt={`Foto destacada de ${foto.subida_por ?? 'invitado'}`}
              fill
              className="object-cover"
              sizes="128px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-white text-xs font-bold">{foto.megustas}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="h-px bg-gray-100 mx-4 mt-4" />
    </section>
  )
}

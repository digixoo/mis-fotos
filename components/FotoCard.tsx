'use client'

import Image from 'next/image'

export interface Foto {
  id: string
  url_publica: string
  subida_por: string | null
  subida_en: string
  tamanio_kb: number | null
  megustas: number
}

interface Props {
  foto: Foto
  liked: boolean
  onLike: () => void
  onClick: () => void
}

export default function FotoCard({ foto, liked, onLike, onClick }: Props) {
  return (
    <div
      className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 group"
      onClick={onClick}
    >
      <Image
        src={foto.url_publica}
        alt={`Foto de ${foto.subida_por ?? 'invitado'}`}
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-105"
        sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
      />

      {/* Nombre autor */}
      {foto.subida_por && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <p className="text-white text-xs truncate">{foto.subida_por}</p>
        </div>
      )}

      {/* Botón me gusta */}
      <button
        onClick={(e) => { e.stopPropagation(); onLike() }}
        className={`absolute bottom-1.5 right-1.5 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow transition-all duration-150 ${
          liked
            ? 'bg-rose-500 text-white scale-105'
            : 'bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-500'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        {foto.megustas > 0 && <span>{foto.megustas}</span>}
      </button>
    </div>
  )
}

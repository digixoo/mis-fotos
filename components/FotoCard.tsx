'use client'

import Image from 'next/image'

export interface Foto {
  id: string
  url_publica: string
  subida_por: string | null
  subida_en: string
  tamanio_kb: number | null
}

interface Props {
  foto: Foto
  onClick: () => void
}

export default function FotoCard({ foto, onClick }: Props) {
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
      {foto.subida_por && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <p className="text-white text-xs truncate">{foto.subida_por}</p>
        </div>
      )}
    </div>
  )
}

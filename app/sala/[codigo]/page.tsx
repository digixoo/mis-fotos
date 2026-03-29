import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import GaleriaFotos from '@/components/GaleriaFotos'
import SubirFotos from '@/components/SubirFotos'

interface Props {
  params: Promise<{ codigo: string }>
}

export default async function SalaPage({ params }: Props) {
  const { codigo } = await params
  const codigoUpper = codigo.toUpperCase()

  const { data: sala } = await supabase
    .from('salas')
    .select('id, nombre, codigo')
    .eq('codigo', codigoUpper)
    .single()

  if (!sala) {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">📷</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-gray-800 truncate">{sala.nombre}</h1>
          <p className="text-xs text-gray-400">Código: {sala.codigo}</p>
        </div>
      </header>

      {/* Galería */}
      <GaleriaFotos salaId={sala.id} />

      {/* Botón subir fotos */}
      <SubirFotos salaId={sala.id} salaCodigo={sala.codigo} />
    </main>
  )
}

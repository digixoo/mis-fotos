import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SalaHeader from '@/components/SalaHeader'
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
      <SalaHeader nombre={sala.nombre} codigo={sala.codigo} />
      <GaleriaFotos salaId={sala.id} salaNombre={sala.nombre} />
      <SubirFotos salaId={sala.id} salaCodigo={sala.codigo} />
    </main>
  )
}

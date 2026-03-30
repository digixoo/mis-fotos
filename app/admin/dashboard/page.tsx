export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import AdminDashboard from './AdminDashboard'

export default async function DashboardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin')

  const { data: salas } = await supabase
    .from('salas')
    .select('id, nombre, codigo, creada_en, fotos(count)')
    .order('creada_en', { ascending: false })

  const { data: config } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'dominio')
    .single()

  return (
    <AdminDashboard
      salas={salas ?? []}
      adminEmail={user.email ?? ''}
      dominioInicial={config?.valor ?? ''}
    />
  )
}

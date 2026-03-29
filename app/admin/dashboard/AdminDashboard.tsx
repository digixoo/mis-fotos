'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface FotoAdmin {
  id: string
  url_publica: string
  subida_por: string | null
  subida_en: string
  storage_path: string
}

interface Sala {
  id: string
  nombre: string
  codigo: string
  creada_en: string
  fotos: { count: number }[]
}

interface Props {
  salas: Sala[]
  adminEmail: string
}

function generarCodigo(nombre: string): string {
  return nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
}

export default function AdminDashboard({ salas: salasIniciales, adminEmail }: Props) {
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  const [salas, setSalas] = useState<Sala[]>(salasIniciales)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoCodigo, setNuevoCodigo] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  const [salaActiva, setSalaActiva] = useState<Sala | null>(null)
  const [fotosActivas, setFotosActivas] = useState<FotoAdmin[]>([])
  const [cargandoFotos, setCargandoFotos] = useState(false)

  const [qrSala, setQrSala] = useState<Sala | null>(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  async function handleCrearSala(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    const codigo = nuevoCodigo.trim().toUpperCase()
    if (!nombre || !codigo) return

    setCreando(true)
    setErrorCrear('')

    const { data, error } = await supabase
      .from('salas')
      .insert({ nombre, codigo })
      .select('id, nombre, codigo, creada_en, fotos(count)')
      .single()

    if (error) {
      setErrorCrear(
        error.message.includes('unique') ? 'Ese código ya está en uso.' : 'No se pudo crear la sala.'
      )
      setCreando(false)
      return
    }

    setSalas((prev) => [data, ...prev])
    setNuevoNombre('')
    setNuevoCodigo('')
    setCreando(false)
  }

  async function handleEliminarSala(sala: Sala) {
    if (!confirm(`¿Eliminar la sala "${sala.nombre}"? Se borrarán todas sus fotos.`)) return

    const { error } = await supabase.from('salas').delete().eq('id', sala.id)
    if (!error) {
      setSalas((prev) => prev.filter((s) => s.id !== sala.id))
      if (salaActiva?.id === sala.id) setSalaActiva(null)
    }
  }

  async function handleVerFotos(sala: Sala) {
    if (salaActiva?.id === sala.id) {
      setSalaActiva(null)
      return
    }
    setSalaActiva(sala)
    setCargandoFotos(true)

    const { data } = await supabase
      .from('fotos')
      .select('id, url_publica, subida_por, subida_en, storage_path')
      .eq('sala_id', sala.id)
      .order('subida_en', { ascending: false })

    setFotosActivas(data ?? [])
    setCargandoFotos(false)
  }

  async function handleEliminarFoto(foto: FotoAdmin) {
    await supabase.storage.from('photo-project').remove([foto.storage_path])
    await supabase.from('fotos').delete().eq('id', foto.id)
    setFotosActivas((prev) => prev.filter((f) => f.id !== foto.id))
    setSalas((prev) =>
      prev.map((s) =>
        s.id === salaActiva?.id
          ? { ...s, fotos: [{ count: Math.max(0, (s.fotos[0]?.count ?? 1) - 1) }] }
          : s
      )
    )
  }

  const totalFotos = salas.reduce((sum, s) => sum + (s.fotos[0]?.count ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-white">Panel Admin</span>
          <span className="text-gray-400 text-xs ml-2">{adminEmail}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          Salir
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <p className="text-3xl font-bold text-white">{salas.length}</p>
            <p className="text-sm text-gray-400 mt-0.5">Salas activas</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <p className="text-3xl font-bold text-white">{totalFotos}</p>
            <p className="text-sm text-gray-400 mt-0.5">Fotos totales</p>
          </div>
        </div>

        {/* Crear sala */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
          <h2 className="font-semibold text-white mb-4">Nueva sala</h2>
          <form onSubmit={handleCrearSala} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre del evento</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => {
                  setNuevoNombre(e.target.value)
                  setNuevoCodigo(generarCodigo(e.target.value))
                  setErrorCrear('')
                }}
                placeholder="Boda de María y Juan"
                className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Código de acceso</label>
              <input
                type="text"
                value={nuevoCodigo}
                onChange={(e) => { setNuevoCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setErrorCrear('') }}
                placeholder="MARIAJUAN"
                maxLength={20}
                className="w-full h-10 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              />
            </div>
            {errorCrear && (
              <p className="text-rose-400 text-xs">{errorCrear}</p>
            )}
            <button
              type="submit"
              disabled={creando || !nuevoNombre.trim() || !nuevoCodigo.trim()}
              className="h-10 rounded-xl bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creando ? 'Creando...' : 'Crear sala'}
            </button>
          </form>
        </div>

        {/* Lista de salas */}
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-white">Salas ({salas.length})</h2>

          {salas.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">Todavía no hay salas creadas.</p>
          )}

          {salas.map((sala) => (
            <div key={sala.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {/* Sala header */}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{sala.nombre}</p>
                  <p className="text-sm font-mono text-rose-400 mt-0.5">{sala.codigo}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {sala.fotos[0]?.count ?? 0} fotos · creada {new Date(sala.creada_en).toLocaleDateString('es-AR')}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQrSala(qrSala?.id === sala.id ? null : sala)}
                    className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                  >
                    QR
                  </button>
                  <button
                    onClick={() => handleVerFotos(sala)}
                    className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                  >
                    {salaActiva?.id === sala.id ? 'Cerrar' : 'Fotos'}
                  </button>
                  <button
                    onClick={() => handleEliminarSala(sala)}
                    className="px-3 py-1.5 text-xs bg-red-950 text-red-400 rounded-lg hover:bg-red-900 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* QR expandible */}
              {qrSala?.id === sala.id && (
                <div className="border-t border-gray-800 p-4 flex flex-col items-center gap-3">
                  <div className="bg-white p-4 rounded-2xl">
                    <QRCodeSVG
                      value={`${window.location.origin}/sala/${sala.codigo}`}
                      size={180}
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Compartí este QR para que los invitados accedan a la sala.
                  </p>
                  <p className="text-sm font-mono text-rose-400">
                    {window.location.origin}/sala/{sala.codigo}
                  </p>
                </div>
              )}

              {/* Fotos expandibles */}
              {salaActiva?.id === sala.id && (
                <div className="border-t border-gray-800 p-4">
                  {cargandoFotos ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                    </div>
                  ) : fotosActivas.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">No hay fotos en esta sala.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {fotosActivas.map((foto) => (
                        <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden group">
                          <Image
                            src={foto.url_publica}
                            alt={`Foto de ${foto.subida_por ?? 'invitado'}`}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                            <button
                              onClick={() => handleEliminarFoto(foto)}
                              className="opacity-0 group-hover:opacity-100 transition bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                          {foto.subida_por && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1">
                              <p className="text-white text-xs truncate">{foto.subida_por}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

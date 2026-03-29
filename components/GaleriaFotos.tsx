'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import FotoCard, { type Foto } from './FotoCard'
import DestacadasSection from './DestacadasSection'

interface Props {
  salaId: string
  salaNombre: string
}

const LIKES_KEY = 'misfotos_likes'
const LOCAL_ID_KEY = 'misfotos_user_id'

function cargarLikes(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKES_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function guardarLikes(likes: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]))
}

function getLocalId(): string {
  let id = localStorage.getItem(LOCAL_ID_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(LOCAL_ID_KEY, id) }
  return id
}

async function descargarUna(foto: Foto, nombre: string) {
  try {
    const res = await fetch(foto.url_publica)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    window.open(foto.url_publica, '_blank')
  }
}

export default function GaleriaFotos({ salaId, salaNombre }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [cargando, setCargando] = useState(true)
  const [likesGuardados, setLikesGuardados] = useState<Set<string>>(new Set())

  // Vista
  const [vistaFiltro, setVistaFiltro] = useState<'todas' | 'megustas'>('todas')

  // Lightbox
  const [fotoAmpliada, setFotoAmpliada] = useState<Foto | null>(null)
  const [nombresLike, setNombresLike] = useState<string[]>([])

  // Selección
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())

  // Descarga
  const [descargando, setDescargando] = useState<{ actual: number; total: number; label: string } | null>(null)
  const [menuDescarga, setMenuDescarga] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fotos visibles según filtro activo
  const fotosConMegustas = fotos.filter((f) => f.megustas > 0)
  const fotosVisibles = vistaFiltro === 'megustas' ? fotosConMegustas : fotos

  // Índice actual en el lightbox (para navegación)
  const indiceActual = fotoAmpliada
    ? fotosVisibles.findIndex((f) => f.id === fotoAmpliada.id)
    : -1

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

    function onFotoSubida(e: Event) {
      const foto = (e as CustomEvent<Foto>).detail
      setFotos((prev) => prev.some((f) => f.id === foto.id) ? prev : [{ ...foto, megustas: 0 }, ...prev])
    }
    window.addEventListener('foto-subida', onFotoSubida)

    const channel = supabase
      .channel(`sala-${salaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => setFotos((prev) => prev.some((f) => f.id === (payload.new as Foto).id) ? prev : [payload.new as Foto, ...prev])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => {
          const updated = payload.new as Foto
          setFotos((prev) => prev.map((f) => f.id === updated.id ? { ...f, megustas: updated.megustas } : f))
          setFotoAmpliada((prev) => prev?.id === updated.id ? { ...prev, megustas: updated.megustas } : prev)
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'fotos', filter: `sala_id=eq.${salaId}` },
        (payload) => setFotos((prev) => prev.filter((f) => f.id !== (payload.old as { id: string }).id))
      )
      .subscribe()

    return () => {
      window.removeEventListener('foto-subida', onFotoSubida)
      supabase.removeChannel(channel)
    }
  }, [salaId])

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuDescarga(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const cargarNombresLike = useCallback(async (fotoId: string) => {
    setNombresLike([])
    const { data } = await supabase
      .from('megustas_registros')
      .select('nombre')
      .eq('foto_id', fotoId)
      .order('creada_en', { ascending: true })
    setNombresLike(data?.map((r) => r.nombre).filter(Boolean) ?? [])
  }, [])

  async function abrirFoto(foto: Foto) {
    setFotoAmpliada(foto)
    cargarNombresLike(foto.id)
  }

  function cerrarLightbox() {
    setFotoAmpliada(null)
    setNombresLike([])
  }

  function irAnterior() {
    if (indiceActual < 0 || fotosVisibles.length < 2) return
    const idx = (indiceActual - 1 + fotosVisibles.length) % fotosVisibles.length
    const foto = fotosVisibles[idx]
    setFotoAmpliada(foto)
    cargarNombresLike(foto.id)
  }

  function irSiguiente() {
    if (indiceActual < 0 || fotosVisibles.length < 2) return
    const idx = (indiceActual + 1) % fotosVisibles.length
    const foto = fotosVisibles[idx]
    setFotoAmpliada(foto)
    cargarNombresLike(foto.id)
  }

  // Teclado: flechas + Escape
  useEffect(() => {
    if (!fotoAmpliada) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') irAnterior()
      else if (e.key === 'ArrowRight') irSiguiente()
      else if (e.key === 'Escape') cerrarLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fotoAmpliada, indiceActual, fotosVisibles]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLike(foto: Foto) {
    const yaLikeado = likesGuardados.has(foto.id)
    const delta = yaLikeado ? -1 : 1
    const localId = getLocalId()
    const nombre = localStorage.getItem('misfotos_nombre') ?? ''

    setFotos((prev) => prev.map((f) => f.id === foto.id ? { ...f, megustas: Math.max(0, f.megustas + delta) } : f))
    setFotoAmpliada((prev) => prev?.id === foto.id ? { ...prev, megustas: Math.max(0, prev.megustas + delta) } : prev)

    const nuevosLikes = new Set(likesGuardados)
    if (yaLikeado) { nuevosLikes.delete(foto.id) } else { nuevosLikes.add(foto.id) }
    setLikesGuardados(nuevosLikes)
    guardarLikes(nuevosLikes)

    await supabase.rpc('votar_foto', { p_foto_id: foto.id, p_local_id: localId, p_nombre: nombre || null, p_delta: delta })

    if (fotoAmpliada?.id === foto.id) cargarNombresLike(foto.id)
  }

  function handleToggleSeleccion(foto: Foto) {
    const nuevo = new Set(seleccionadas)
    if (nuevo.has(foto.id)) { nuevo.delete(foto.id) } else { nuevo.add(foto.id) }
    setSeleccionadas(nuevo)
  }

  function salirSeleccion() {
    setModoSeleccion(false)
    setSeleccionadas(new Set())
  }

  async function iniciarDescargaIndividual(lista: Foto[], label: string) {
    setMenuDescarga(false)
    if (lista.length === 0) return
    setDescargando({ actual: 0, total: lista.length, label })
    for (let i = 0; i < lista.length; i++) {
      setDescargando({ actual: i + 1, total: lista.length, label })
      await descargarUna(lista[i], `misfotos-${String(i + 1).padStart(3, '0')}.jpg`)
      if (i < lista.length - 1) await new Promise((r) => setTimeout(r, 500))
    }
    setDescargando(null)
  }

  async function iniciarDescargaZip(lista: Foto[], label: string) {
    setMenuDescarga(false)
    if (lista.length === 0) return
    setDescargando({ actual: 0, total: lista.length, label: `${label} (ZIP)` })
    const zip = new JSZip()
    const carpeta = zip.folder('fotos')!
    for (let i = 0; i < lista.length; i++) {
      setDescargando({ actual: i + 1, total: lista.length, label: `${label} (ZIP)` })
      try {
        const res = await fetch(lista[i].url_publica)
        carpeta.file(`foto-${String(i + 1).padStart(3, '0')}.jpg`, await res.blob())
      } catch { /* skip */ }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${label.replace(/\s+/g, '-')}.zip`
    a.click()
    URL.revokeObjectURL(url)
    setDescargando(null)
  }

  const fotosSeleccionadas = fotos.filter((f) => seleccionadas.has(f.id))

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Destacadas */}
      <DestacadasSection
        fotos={fotos}
        onVerFoto={abrirFoto}
        onDescargar={(foto) => iniciarDescargaIndividual([foto], foto.subida_por ?? 'foto')}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100 bg-white sticky top-[57px] z-20">
        {modoSeleccion ? (
          <>
            <span className="text-sm font-medium text-gray-700">
              {seleccionadas.size > 0 ? `${seleccionadas.size} seleccionada${seleccionadas.size !== 1 ? 's' : ''}` : 'Tocá para seleccionar'}
            </span>
            <button onClick={salirSeleccion} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
              Cancelar
            </button>
          </>
        ) : (
          <>
            {/* Toggle vista */}
            {fotos.length > 0 && (
              <div className="flex bg-gray-100 rounded-xl p-0.5 flex-shrink-0">
                <button
                  onClick={() => setVistaFiltro('todas')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition ${vistaFiltro === 'todas' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Todas ({fotos.length})
                </button>
                <button
                  onClick={() => setVistaFiltro('megustas')}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition flex items-center gap-1 ${vistaFiltro === 'megustas' ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  ❤ Me gustas ({fotosConMegustas.length})
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {fotos.length > 0 && (
                <button
                  onClick={() => setModoSeleccion(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  Seleccionar
                </button>
              )}

              {fotos.length > 0 && (
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuDescarga(!menuDescarga)}
                    disabled={!!descargando}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span className="hidden sm:inline">Descargar</span>
                  </button>

                  {menuDescarga && (
                    <div className="absolute right-0 top-full mt-1.5 bg-white shadow-xl rounded-2xl border border-gray-100 py-1.5 w-64 z-30">
                      <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Individual</p>
                      <button onClick={() => iniciarDescargaIndividual(fotosVisibles, salaNombre)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition">
                        <span className="block text-sm font-medium text-gray-800">
                          {vistaFiltro === 'megustas' ? 'Descargar me gustas' : 'Descargar todas'}
                        </span>
                        <span className="text-xs text-gray-400">{fotosVisibles.length} foto{fotosVisibles.length !== 1 ? 's' : ''} · una por una</span>
                      </button>
                      {vistaFiltro === 'todas' && fotosConMegustas.length > 0 && (
                        <button onClick={() => iniciarDescargaIndividual(fotosConMegustas, `${salaNombre} — me gustas`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition">
                          <span className="block text-sm font-medium text-gray-800">Solo me gustas</span>
                          <span className="text-xs text-gray-400">{fotosConMegustas.length} foto{fotosConMegustas.length !== 1 ? 's' : ''} · una por una</span>
                        </button>
                      )}
                      <div className="h-px bg-gray-100 mx-3 my-1.5" />
                      <p className="px-4 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">ZIP</p>
                      <button onClick={() => iniciarDescargaZip(fotosVisibles, salaNombre)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition">
                        <span className="block text-sm font-medium text-gray-800">
                          {vistaFiltro === 'megustas' ? 'Me gustas como ZIP' : 'Todas como ZIP'}
                        </span>
                        <span className="text-xs text-gray-400">{fotosVisibles.length} foto{fotosVisibles.length !== 1 ? 's' : ''} · un solo archivo</span>
                      </button>
                      {vistaFiltro === 'todas' && fotosConMegustas.length > 0 && (
                        <button onClick={() => iniciarDescargaZip(fotosConMegustas, `${salaNombre} — me gustas`)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition">
                          <span className="block text-sm font-medium text-gray-800">Me gustas como ZIP</span>
                          <span className="text-xs text-gray-400">{fotosConMegustas.length} foto{fotosConMegustas.length !== 1 ? 's' : ''} · un solo archivo</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Grid */}
      {fotosVisibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          {vistaFiltro === 'megustas' ? (
            <>
              <span className="text-5xl mb-4">❤️</span>
              <p className="text-gray-500 font-medium">Todavía no hay fotos con me gustas</p>
              <p className="text-gray-400 text-sm mt-1">¡Dale me gusta a las que más te gusten!</p>
            </>
          ) : (
            <>
              <span className="text-5xl mb-4">📷</span>
              <p className="text-gray-500 font-medium">Todavía no hay fotos</p>
              <p className="text-gray-400 text-sm mt-1">¡Sé el primero en subir una!</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-1">
          {fotosVisibles.map((foto) => (
            <FotoCard
              key={foto.id}
              foto={foto}
              liked={likesGuardados.has(foto.id)}
              onLike={() => handleLike(foto)}
              onClick={() => modoSeleccion ? handleToggleSeleccion(foto) : abrirFoto(foto)}
              modoSeleccion={modoSeleccion}
              seleccionada={seleccionadas.has(foto.id)}
            />
          ))}
        </div>
      )}

      {/* Barra flotante selección */}
      {modoSeleccion && seleccionadas.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40 bg-white shadow-xl rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {seleccionadas.size} foto{seleccionadas.size !== 1 ? 's' : ''} seleccionada{seleccionadas.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { iniciarDescargaIndividual(fotosSeleccionadas, 'selección'); salirSeleccion() }}
            className="h-9 px-5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar
          </button>
        </div>
      )}

      {/* Progreso descarga */}
      {descargando && (
        <div className="fixed bottom-24 left-4 z-50 bg-white shadow-xl rounded-2xl border border-gray-100 px-4 py-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700 truncate pr-2">Descargando…</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{descargando.actual}/{descargando.total}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${(descargando.actual / descargando.total) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 truncate">{descargando.label}</p>
        </div>
      )}

      {/* Lightbox */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4"
          onClick={cerrarLightbox}
        >
          <div
            className="relative w-full max-w-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contador */}
            {fotosVisibles.length > 1 && (
              <p className="text-white/40 text-xs mb-2 self-end">
                {indiceActual + 1} / {fotosVisibles.length}
              </p>
            )}

            {/* Imagen + flechas */}
            <div className="relative w-full flex items-center">
              {/* Flecha anterior */}
              {fotosVisibles.length > 1 && (
                <button
                  onClick={irAnterior}
                  className="absolute left-0 -translate-x-2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}

              <Image
                src={fotoAmpliada.url_publica}
                alt="Foto ampliada"
                width={800}
                height={600}
                className="object-contain w-full rounded-xl"
                style={{ maxHeight: '65vh' }}
              />

              {/* Flecha siguiente */}
              {fotosVisibles.length > 1 && (
                <button
                  onClick={irSiguiente}
                  className="absolute right-0 translate-x-2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center transition flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Info + like */}
            <div className="flex items-center justify-between w-full mt-3 px-1">
              <div>
                {fotoAmpliada.subida_por && (
                  <p className="text-white/60 text-sm">
                    Foto de <span className="text-white/90">{fotoAmpliada.subida_por}</span>
                  </p>
                )}
                {fotoAmpliada.megustas > 0 && (
                  <p className="text-rose-400 text-xs mt-0.5 max-w-[200px] line-clamp-2">
                    ❤{' '}
                    {nombresLike.length > 0
                      ? nombresLike.length < fotoAmpliada.megustas
                        ? `${nombresLike.join(', ')} y ${fotoAmpliada.megustas - nombresLike.length} más`
                        : nombresLike.join(', ')
                      : `${fotoAmpliada.megustas} me gusta${fotoAmpliada.megustas !== 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleLike(fotoAmpliada)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm transition ${
                  likesGuardados.has(fotoAmpliada.id) ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-rose-500'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill={likesGuardados.has(fotoAmpliada.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Me gusta
              </button>
            </div>

            {/* Acciones */}
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => descargarUna(fotoAmpliada, `misfotos.jpg`)}
                className="h-11 px-6 bg-rose-500 text-white rounded-xl font-semibold hover:bg-rose-600 transition flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar
              </button>
              <button
                onClick={cerrarLightbox}
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

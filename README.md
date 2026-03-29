# MisFotos

App web para compartir fotos en eventos privados (bodas, cumpleaños, etc.). Los invitados acceden con un código único, suben fotos desde su celular y todos pueden ver, descargar y disfrutar las fotos en tiempo real.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4**
- **Supabase** — PostgreSQL + Storage + Realtime + Auth
- **Vercel** — hosting

## Funcionalidades

### Invitados (sin registro)
- Ingresan con un código de sala, nombre opcional guardado en localStorage
- Suben fotos desde la galería del celular — se comprimen a ≤1 MB antes de subir
- Galería en tiempo real: las fotos de otros aparecen sin recargar
- Me gusta en fotos — muestra quiénes likearon
- Sección de destacadas con carrusel (top fotos por likes)
- Navegar entre fotos con flechas sin salir del lightbox
- Descargar fotos individualmente, por selección o como ZIP
- Vista filtrada: todas las fotos vs solo me gustas
- Compartir sala por WhatsApp, QR o copiando el enlace

### Admin
- Login con email y contraseña (Supabase Auth)
- Crear salas con nombre y código personalizable
- Ver QR de cada sala para compartir o imprimir
- Ver y eliminar fotos por sala
- Eliminar salas completas

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tu URL y anon key de Supabase

# Iniciar servidor
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## Supabase — configuración requerida

1. Crear bucket de Storage llamado `photo-project` (público)
2. Ejecutar el SQL de `/CLAUDE.md` para crear las tablas, políticas RLS y función RPC
3. Crear usuario admin desde Supabase Dashboard → Authentication → Users

## Build

```bash
npm run build   # también valida TypeScript
```

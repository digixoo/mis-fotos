# MisFotos — App de fotos para bodas

## Qué es este proyecto

App web para compartir fotos en eventos privados (bodas, cumpleaños, etc.).
Los invitados acceden con un código único, suben fotos desde su galería móvil,
y todos pueden ver, descargar y disfrutar las fotos en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | Next.js 16 (App Router) | SSR, rutas, performance, Active LTS |
| Estilos | Tailwind CSS | Mobile-first, rápido |
| Backend / DB | Supabase (PostgreSQL) | DB + Storage + Realtime todo en uno |
| Storage fotos | Supabase Storage | Archivos reales, no base64 en BD |
| Hosting | Vercel | Gratis, integración nativa con Next.js |
| Compresión | browser-image-compression | Comprimir en el cliente antes de subir |

---

## Arquitectura general

```
Usuario (celular/PC)
  └── Vercel (sirve Next.js)
        └── Supabase
              ├── PostgreSQL  → tablas: salas, fotos
              ├── Storage     → archivos .jpg organizados por sala
              └── Realtime    → galería se actualiza sin recargar
```

### Flujo de subida de fotos
1. Invitado selecciona fotos desde su galería (input nativo del SO — sin instalar nada)
2. El cliente comprime cada foto a ≤1 MB con browser-image-compression
3. Foto comprimida sube a Supabase Storage → `wedding-photos/{sala_codigo}/{timestamp}.jpg`
4. Se inserta un registro en la tabla `fotos` con la URL pública y metadatos
5. Realtime notifica a todos los invitados conectados → galería se actualiza instantáneamente

---

## Acceso de usuarios

### Invitados (sin registro)
- Solo ingresan el **código de sala** (ej: `MARIA2025`)
- Opcionalmente escriben su **nombre** (para que aparezca "Foto de Juan")
- El nombre se guarda en `localStorage` → no tienen que reescribirlo si vuelven
- Sin email, sin contraseña, sin cuenta

### Admin / Novios (con email)
- Login con email y contraseña via Supabase Auth
- Pueden crear salas, ver el código generado y el QR
- Pueden eliminar fotos inapropiadas desde el panel

---

## Esquema de base de datos

```sql
-- Sala del evento
CREATE TABLE salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,           -- "Boda María & Juan"
  codigo TEXT UNIQUE NOT NULL,    -- "MARIA2025" (compartido a invitados)
  creada_en TIMESTAMPTZ DEFAULT NOW(),
  expira_en TIMESTAMPTZ           -- opcional: X días después del evento
);

-- Fotos subidas por invitados
CREATE TABLE fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID REFERENCES salas(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,     -- ruta en Supabase Storage
  url_publica TEXT NOT NULL,      -- URL directa para mostrar en galería
  subida_por TEXT,                -- nombre del invitado (opcional)
  subida_en TIMESTAMPTZ DEFAULT NOW(),
  tamanio_kb INT                  -- peso en KB post-compresión
);
```

---

## Estructura de carpetas del proyecto

```
misfotos/
├── CLAUDE.md                        ← este archivo
├── app/
│   ├── page.tsx                     ← landing: ingresar código de sala
│   ├── sala/
│   │   └── [codigo]/
│   │       └── page.tsx             ← galería + subir fotos
│   └── admin/
│       ├── page.tsx                 ← login admin
│       └── dashboard/
│           └── page.tsx             ← crear salas, ver QR, moderar
├── components/
│   ├── GaleriaFotos.tsx             ← grid de fotos con Realtime
│   ├── SubirFotos.tsx               ← botón + compresión + upload
│   ├── FotoCard.tsx                 ← foto individual con botón descargar
│   └── CodigoInput.tsx              ← input para ingresar a la sala
├── lib/
│   ├── supabase.ts                  ← cliente de Supabase
│   └── compresion.ts                ← wrapper de browser-image-compression
└── public/
    └── ...
```

---

## Pantallas principales

### 1. Landing (/)
- Input grande para ingresar el código de sala
- Input opcional para el nombre del invitado (se guarda en localStorage)
- Botón "Entrar a la sala"
- Si el código no existe → mensaje de error claro
- Diseño simple, elegante, centrado, mobile-first

### 2. Galería (/sala/[codigo])
- Grid de fotos: 3 columnas en mobile, 4 en tablet, 5 en desktop
- Botón flotante "📷 Subir fotos" (esquina inferior derecha, siempre visible)
- Al tocar el botón → abre selector nativo de galería del SO (iOS y Android)
- Selección múltiple de fotos
- Progreso de subida visible por cada foto
- Al tocar una foto → vista ampliada con botón de descarga
- Nuevas fotos aparecen automáticamente sin recargar (Realtime)
- Mostrar nombre de quien subió cada foto

### 3. Admin — Login (/admin)
- Formulario email + contraseña
- Autenticación via Supabase Auth

### 4. Admin — Dashboard (/admin/dashboard)
- Crear nueva sala: nombre del evento + código personalizable
- Ver código generado + QR para compartir o imprimir
- Lista de salas creadas
- Dentro de cada sala: ver y eliminar fotos

---

## Principios de diseño

- **Mobile-first siempre**: diseñar primero para 390px de ancho, luego escalar
- **Sin registro para invitados**: solo código de sala, máxima simplicidad
- **Rápido**: el invitado debe poder subir su primera foto en menos de 30 segundos
- **Touch-friendly**: botones mínimo 44px de alto
- **Feedback visual**: progreso de subida, confirmación de éxito, errores claros en español
- Paleta: neutros elegantes (blanco, gris suave, acento rosado o dorado)

---

## Configuración de Supabase Storage

- Bucket: `wedding-photos` (lectura pública, escritura sin auth)
- Estructura: `wedding-photos/{sala_codigo}/{timestamp}-{nombre}.jpg`
- Límite por archivo: 50 MB (plan free de Supabase)
- **Regla de oro**: siempre comprimir en el cliente antes de subir, objetivo ≤1 MB

### Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

---

## Reglas de desarrollo

1. **TypeScript siempre** — tipar todo, no usar `any`
2. **Español en la UI** — todos los textos visibles al usuario en español
3. **Mobile-first en Tailwind** — clases base para mobile, luego `md:` y `lg:`
4. **Errores amigables** — nunca mostrar errores técnicos al usuario
5. **Compresión obligatoria** — nunca subir foto sin pasar por `comprimirFoto()` primero
6. **Bundle liviano** — no instalar librerías sin necesidad concreta

---

## Comandos útiles

```bash
npm run dev        # servidor de desarrollo local
npm run build      # build de producción
npm run type-check # verificar tipos TypeScript
```

---

## Checklist de desarrollo

- [ ] Setup inicial Next.js 16 + Tailwind + TypeScript
- [ ] Conexión con Supabase (cliente + variables de entorno)
- [ ] Función comprimirFoto() en lib/compresion.ts
- [ ] Pantalla landing — ingresar código de sala
- [ ] Galería con grid de fotos
- [ ] Realtime — fotos nuevas aparecen sin recargar
- [ ] Subida de fotos con compresión y progreso
- [ ] Vista ampliada + descarga de foto
- [ ] Panel admin — login con email
- [ ] Panel admin — crear sala + mostrar QR
- [ ] Panel admin — eliminar fotos
- [ ] Deploy en Vercel
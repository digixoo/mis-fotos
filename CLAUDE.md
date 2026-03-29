# MisFotos — App de fotos para eventos

## Qué es este proyecto

App web para compartir fotos en eventos privados (bodas, cumpleaños, etc.).
Los invitados acceden con un código único, suben fotos desde su galería móvil,
y todos pueden ver, descargar y disfrutar las fotos en tiempo real.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16.2.1 (App Router) |
| Estilos | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL + Storage + Realtime + Auth) |
| Hosting | Vercel (ya deployado) |
| Compresión | browser-image-compression |
| ZIP | jszip |
| Auth SSR | @supabase/ssr |
| QR | qrcode.react |

---

## Supabase — configuración real

- **Proyecto URL**: en `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`)
- **Anon key**: en `.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Bucket Storage**: `photo-project` (público, con políticas INSERT/SELECT para anon)
- **Ruta archivos**: `{sala_codigo}/{timestamp}-{index}.jpg`

### Esquema de base de datos (estado actual)

```sql
CREATE TABLE salas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  creada_en TIMESTAMPTZ DEFAULT NOW(),
  expira_en TIMESTAMPTZ
);

CREATE TABLE fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id UUID REFERENCES salas(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url_publica TEXT NOT NULL,
  subida_por TEXT,
  subida_en TIMESTAMPTZ DEFAULT NOW(),
  tamanio_kb INT,
  megustas INT NOT NULL DEFAULT 0   -- contador de likes
);

CREATE TABLE megustas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  foto_id UUID REFERENCES fotos(id) ON DELETE CASCADE,
  nombre TEXT,                      -- nombre del invitado (puede ser null)
  local_id TEXT NOT NULL,           -- UUID generado en localStorage del dispositivo
  creada_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(foto_id, local_id)         -- un like por dispositivo por foto
);
```

### Función RPC

```sql
-- Votar una foto (atómica, actualiza contador y registros)
CREATE OR REPLACE FUNCTION votar_foto(p_foto_id UUID, p_local_id TEXT, p_nombre TEXT, p_delta INT)
RETURNS void AS $$
BEGIN
  IF p_delta > 0 THEN
    INSERT INTO megustas_registros (foto_id, local_id, nombre)
    VALUES (p_foto_id, p_local_id, p_nombre)
    ON CONFLICT (foto_id, local_id) DO NOTHING;
  ELSE
    DELETE FROM megustas_registros WHERE foto_id = p_foto_id AND local_id = p_local_id;
  END IF;
  UPDATE fotos SET megustas = (
    SELECT COUNT(*) FROM megustas_registros WHERE foto_id = p_foto_id
  ) WHERE id = p_foto_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION votar_foto(UUID, TEXT, TEXT, INT) TO anon;
```

### Políticas RLS activas

- `salas`: anon SELECT ✓ | authenticated ALL ✓
- `fotos`: anon SELECT ✓ | anon INSERT ✓ | authenticated ALL ✓
- `megustas_registros`: anon SELECT ✓ | anon INSERT ✓ | anon DELETE ✓ | authenticated ALL ✓
- `photo-project` bucket: anon INSERT ✓ | anon SELECT ✓

### Realtime

Para que funcione el Realtime en `fotos`, se debe haber ejecutado:
```sql
ALTER TABLE fotos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE fotos;
```

---

## Estructura de archivos (estado actual)

```
mis-fotos/
├── CLAUDE.md
├── proxy.ts                         ← protege /admin/dashboard (Next.js 16: export default function proxy)
├── middleware.ts                    ← NO existe, se usa proxy.ts
├── app/
│   ├── layout.tsx                   ← lang="es", metadata MisFotos
│   ├── globals.css
│   ├── page.tsx                     ← landing: código de sala + nombre invitado
│   ├── sala/[codigo]/
│   │   └── page.tsx                 ← server component: valida sala, monta galería
│   └── admin/
│       ├── page.tsx                 ← login admin (dark theme)
│       └── dashboard/
│           ├── page.tsx             ← server component: auth check + fetch salas
│           └── AdminDashboard.tsx   ← client component: UI completa admin
├── components/
│   ├── FotoCard.tsx                 ← foto individual, like button, modo selección
│   ├── GaleriaFotos.tsx             ← galería completa: grid, lightbox, likes, descarga, selección
│   ├── SubirFotos.tsx               ← botón flotante + compresión + upload + progreso
│   ├── SalaHeader.tsx               ← header con nombre, saludo, compartir (QR+WhatsApp), salir
│   ├── DestacadasSection.tsx        ← carrusel de fotos con más likes (autoplay, flechas, dots)
│   └── DescargarFotos.tsx           ← NO SE USA (lógica migrada a GaleriaFotos.tsx)
├── lib/
│   ├── supabase.ts                  ← createClient (anon, para data ops server+client)
│   ├── supabase-browser.ts          ← createBrowserClient (para auth admin en browser)
│   ├── supabase-server.ts           ← createServerClient (para auth server-side)
│   └── compresion.ts                ← comprimirFoto(): maxSizeMB:1, maxWidthOrHeight:1920
└── .env.local                       ← NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Funcionalidades implementadas

### Invitados
- [x] Landing: ingresar código de sala + nombre opcional (guardado en localStorage)
- [x] Galería: grid 3/4/5 columnas según viewport
- [x] Subir fotos: selector nativo múltiple, compresión automática, progreso por foto
- [x] Fotos aparecen en tiempo real sin recargar (Realtime + evento local `foto-subida`)
- [x] Lightbox: foto ampliada, navegación ← → con teclado y botones, contador N/total
- [x] Me gusta: botón en cada foto, contador global, muestra nombres de quienes likearon
- [x] Destacadas: carrusel de top 10 fotos por likes (autoplay 4s, flechas, puntos)
- [x] Descarga individual (principal): una por una con progreso
- [x] Descarga ZIP (secundaria): todas o me gustas
- [x] Modo selección: seleccionar fotos del grid → descargar selección
- [x] Vista filtrada: "Todas" vs "❤ Me gustas" en el toolbar
- [x] Compartir sala: Web Share API nativo (mobile) o modal con QR + WhatsApp + copiar enlace
- [x] Header con nombre del invitado y botón salir

### Admin
- [x] Login seguro con email/contraseña (Supabase Auth)
- [x] Middleware proxy.ts protege /admin/dashboard (redirect si no auth)
- [x] Dashboard: crear salas (nombre + código auto-sugerido)
- [x] Ver QR expandible por sala
- [x] Lista de salas con conteo de fotos y fecha
- [x] Expandir sala → ver/eliminar fotos individuales
- [x] Eliminar sala completa (con confirmación)
- [x] Logout

---

## Pendiente / En progreso

- [ ] **DestacadasSection en desktop**: el carrusel se ve mal en pantallas anchas.
  - Tarea activa: restringir ancho máximo (`md:w-96`) y centrar en desktop.
  - El cambio estaba en progreso cuando se interrumpió la sesión.
  - `style={{ aspectRatio: '16/9', maxHeight: 220 }}` → cambiar a `style={{ aspectRatio: '4/3' }}` con `className="w-full md:w-96"`

---

## Decisiones técnicas importantes

- **`proxy.ts`** en vez de `middleware.ts`: Next.js 16 renombró el archivo. Debe exportar `export default function proxy()`.
- **`DescargarFotos.tsx`** existe pero no se usa: la lógica de descarga está en `GaleriaFotos.tsx`.
- **Me gustas globales**: "me gustas" en descargas = `fotos.filter(f => f.megustas > 0)`, NO los likes del usuario actual.
- **local_id**: UUID generado por dispositivo en localStorage (`misfotos_user_id`), permite un like por dispositivo por foto sin login.
- **Subida de fotos**: bucket `photo-project`, no `wedding-photos` (el usuario creó el bucket con ese nombre).
- **Admin crea usuarios**: en Supabase Dashboard → Authentication → Users → Add user.

---

## Reglas de desarrollo

1. **TypeScript siempre** — no usar `any`
2. **Español en la UI** — todos los textos visibles al usuario en español
3. **Mobile-first en Tailwind** — clases base para mobile, luego `md:` y `lg:`
4. **Errores amigables** — nunca mostrar errores técnicos al usuario
5. **Compresión obligatoria** — siempre pasar por `comprimirFoto()` antes de subir
6. **Bundle liviano** — no instalar librerías sin necesidad concreta

---

## Comandos útiles

```bash
npm run dev        # servidor local en localhost:3000
npm run build      # build de producción (también valida TypeScript)
fuser -k 3000/tcp  # matar proceso en puerto 3000
```

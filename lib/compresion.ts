import imageCompression from 'browser-image-compression'

const opciones = {
  maxSizeMB: 4,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
}

export async function comprimirFoto(archivo: File): Promise<File> {
  const comprimido = await imageCompression(archivo, opciones)
  return new File([comprimido], archivo.name, { type: comprimido.type })
}

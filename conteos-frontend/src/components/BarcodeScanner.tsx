'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { FiAlertCircle, FiCamera, FiImage, FiRefreshCw, FiX, FiEdit2, FiCheck } from 'react-icons/fi'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [isDecodingFile, setIsDecodingFile] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [isInsecureContext] = useState(() => typeof window !== 'undefined' && !window.isSecureContext)

  const getCameraErrorMessage = (error: unknown) => {
    const message = String(error || '').toLowerCase()

    if (!window.isSecureContext) {
      return 'La cámara en vivo requiere HTTPS o localhost. Si abriste por IP (ej. 192.168.x.x), usa la opción de foto o abre la app en localhost/HTTPS.'
    }

    if (message.includes('permission') || message.includes('notallowederror') || message.includes('denied')) {
      return 'El navegador bloqueó la cámara. Permite el acceso en el ícono del candado de la barra de direcciones y recarga la página.'
    }

    if (message.includes('notfounderror') || message.includes('device not found')) {
      return 'No se detectó ninguna cámara disponible en este dispositivo.'
    }

    if (message.includes('notreadableerror') || message.includes('could not start video source')) {
      return 'La cámara está siendo usada por otra aplicación. Cierra la otra app e inténtalo de nuevo.'
    }

    return 'No fue posible iniciar la cámara. Verifica permisos del navegador y vuelve a intentar.'
  }

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return

    try {
      await scanner.stop()
    } catch {
      // Scanner could already be stopped
    }

    try {
      await scanner.clear()
    } catch {
      // Ignore clear failures during teardown
    }

    scannerRef.current = null
  }, [])

  const decodeFromImage = useCallback(
    async (file: File) => {
      setIsDecodingFile(true)
      setCameraError('')

      let fileScanner: Html5Qrcode | null = null

      try {
        await stopScanner()

        fileScanner = new Html5Qrcode('barcode-file-reader')
        const decodedText = await fileScanner.scanFile(file, false)

        onScan(decodedText)
        onClose()
      } catch {
        setCameraError('No se pudo leer el código en la imagen. Intenta con una foto más nítida y buena iluminación.')
      } finally {
        if (fileScanner) {
          try {
            await fileScanner.clear()
          } catch {
            // Ignore clear errors on temporary scanner
          }
        }
        setIsDecodingFile(false)
      }
    },
    [onClose, onScan, stopScanner]
  )

  const onImageSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      await decodeFromImage(file)

      event.target.value = ''
    },
    [decodeFromImage]
  )

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim()
    if (!trimmed) return
    onScan(trimmed)
    onClose()
  }

  const startScanner = useCallback(async () => {
    setIsStarting(true)
    setCameraError('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('media devices api not available')
      }

      if (!window.isSecureContext) {
        throw new Error('insecure context')
      }

      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        throw new Error('camera not found')
      }

      const preferredCamera =
        cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label)) || cameras[0]

      const scanner = new Html5Qrcode('barcode-scanner')
      scannerRef.current = scanner

      await scanner.start(
        preferredCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          onScan(decodedText)
          await stopScanner()
          onClose()
        },
        () => {
          // Ignore per-frame decode errors
        }
      )
    } catch (error) {
      setCameraError(getCameraErrorMessage(error))
    } finally {
      setIsStarting(false)
    }
  }, [onClose, onScan, stopScanner])

  useEffect(() => {
    if (isInsecureContext) {
      setIsStarting(false)
      return
    }

    void startScanner()

    return () => {
      void stopScanner()
    }
  }, [isInsecureContext, startScanner, stopScanner])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiCamera className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Escanear Código de Barras</h2>
              <p className="text-sm text-gray-600 mt-1">
                {isInsecureContext
                  ? 'Selecciona una opción para ingresar el código'
                  : 'Posiciona el código de barras frente a la cámara'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Insecure context: skip camera, show alternatives directly */}
          {isInsecureContext ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium mb-1">Cámara en vivo no disponible</p>
              <p>
                La cámara en vivo requiere HTTPS. Como estás accediendo por IP o HTTP, usa una de las
                opciones de abajo.
              </p>
            </div>
          ) : (
            <>
              {/* Live scanner area */}
              <div
                id="barcode-scanner"
                className="rounded-lg overflow-hidden border-2 border-blue-200"
              />

              {isStarting && !cameraError && (
                <p className="mt-3 text-sm text-gray-600">Iniciando cámara...</p>
              )}

              {cameraError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">No se pudo acceder a la cámara</p>
                      <p className="mt-1">{cameraError}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void startScanner()}
                          className="inline-flex items-center px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                        >
                          <FiRefreshCw className="w-4 h-4 mr-2" />
                          Reintentar cámara
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Photo scan option */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FiImage className="w-4 h-4 text-blue-600" />
              Escanear desde una foto
            </p>
            <label className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 cursor-pointer">
              <FiImage className="w-4 h-4 mr-2" />
              Seleccionar imagen
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => void onImageSelected(event)}
              />
            </label>
            {isDecodingFile && (
              <p className="mt-2 text-sm text-gray-600">Procesando imagen...</p>
            )}
          </div>

          {/* Manual input option */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FiEdit2 className="w-4 h-4 text-blue-600" />
              Ingresar código manualmente
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Escribe o pega el código aquí"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="inline-flex items-center px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiCheck className="w-4 h-4 mr-1" />
                Usar
              </button>
            </div>
          </div>

          <div id="barcode-file-reader" className="hidden" />

          {!isInsecureContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <FiCamera className="w-4 h-4 mr-2" />
                Instrucciones:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                <li>Permite el acceso a la cámara cuando el navegador lo solicite</li>
                <li>Si estás en celular por red local, usa HTTPS (no HTTP con IP)</li>
                <li>Si no puedes usar HTTPS, usa el botón "Escanear por foto"</li>
                <li>Mantén el código de barras centrado en el cuadro</li>
                <li>Asegúrate de que haya buena iluminación</li>
                <li>Mantén la cámara estable para un mejor escaneo</li>
                <li>El código se capturará automáticamente al ser detectado</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '../ui/Button';

// Importar estilos necessários
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

/**
 * Componente PdfViewerModal para visualização de PDFs
 * Similar ao ImageViewerModal mas adaptado para PDFs
 */
function PdfViewerModal({ isOpen, pdfUrl, pdfName, onClose }) {
  const [zoom, setZoom] = useState(1);

  // Criar instância do plugin de layout padrão
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      // Manter apenas as abas essenciais
      defaultTabs[0], // Thumbnails
      defaultTabs[1], // Bookmarks
    ],
  });

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfName || 'documento.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-7xl max-h-full w-full h-full flex flex-col">
        {/* Header com controles */}
        <div className="flex items-center justify-between p-4 bg-white rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900">{pdfName}</h3>

          <div className="flex items-center space-x-2">
            {/* Controles de zoom */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="p-2"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <span className="text-sm text-gray-600 min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-2"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="p-2"
              title="Baixar PDF"
            >
              <Download className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Container do PDF */}
        <div className="flex-1 bg-gray-100 rounded-b-lg overflow-hidden relative">
          <div className="w-full h-full">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <div 
                className="h-full"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <Viewer
                  fileUrl={pdfUrl}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </div>
            </Worker>
          </div>
        </div>

        {/* Instruções de uso */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded">
          Clique fora do PDF para fechar
        </div>
      </div>
    </div>
  );
}

export default PdfViewerModal;

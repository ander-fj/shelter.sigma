import React, { useState, useEffect } from 'react';
import { StockMovement, Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FileViewer } from '../common/FileViewer';
import {
  Package,
  Edit,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Building,
  Hash,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  ArrowLeft,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Settings,
  Trash2,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize
} from 'lucide-react';
import { attachmentService } from '../../services/attachmentService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInventory } from '../../contexts/InventoryContext';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import { reservationService } from '../../services/reservationService';
import { offlineStorage } from '../../services/offlineStorageService';
import { EquipmentReservation } from '../../types';
import { safeFormatDate } from '../../utils/dateUtils';

interface ProductDetailsProps {
  product: Product;
  onEdit: () => void;
  onBack: () => void;
}

// **NOVO**: Componente para visualização de PDF integrado
function PDFViewerModal({ isOpen, pdfUrl, pdfName, onClose }: {
  isOpen: boolean;
  pdfUrl: string;
  pdfName: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfName || 'documento.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Erro ao carregar o PDF');
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 ${
        isFullscreen ? 'p-0' : ''
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`relative bg-white rounded-lg overflow-hidden ${
        isFullscreen 
          ? 'w-full h-full rounded-none' 
          : 'max-w-6xl max-h-[90vh] w-full h-full'
      }`}>
        
        {/* Header com controles */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900 truncate">{pdfName}</h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Controles de navegação de página */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm text-gray-600 min-w-[5rem] text-center">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-2"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            {/* Controles de zoom */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
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

            {/* Controle de tela cheia */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="p-2"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>

            {/* Download */}
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

            {/* Fechar */}
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
        <div className="flex-1 bg-gray-100 relative" style={{ height: isFullscreen ? 'calc(100vh - 73px)' : 'calc(90vh - 73px)' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Carregando PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Erro ao carregar PDF</p>
                <p className="text-gray-500 mt-2">Tente baixar o arquivo ou abrir em nova aba</p>
                <div className="mt-4 space-x-2">
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PDF
                  </Button>
                  <Button 
                    onClick={() => window.open(pdfUrl, '_blank')} 
                    variant="outline" 
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir em nova aba
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Iframe para visualização do PDF */}
          <iframe
            src={`${pdfUrl}#page=${currentPage}&zoom=${Math.round(zoom * 100)}`}
            className="w-full h-full border-0"
            title={pdfName}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ 
              display: loading || error ? 'none' : 'block',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`
            }}
          />
        </div>

        {/* Instruções de uso */}
        {!isFullscreen && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded">
            Use os controles acima para navegar • Clique fora para fechar
          </div>
        )}
      </div>
    </div>
  );
}

// Componente ImageViewerModal existente (mantido igual)
function ImageViewerModal({ isOpen, imageUrl, imageAlt, onClose }: {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageAlt || 'anexo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
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
          <h3 className="text-lg font-semibold text-gray-900">{imageAlt}</h3>

          <div className="flex items-center space-x-2">
            {/* Controles de zoom e rotação */}
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
              onClick={handleRotate}
              className="p-2"
              title="Girar imagem"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="p-2"
              title="Baixar imagem"
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

        {/* Container da imagem */}
        <div className="flex-1 bg-gray-100 rounded-b-lg overflow-hidden relative">
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={imageAlt}
              className="max-w-none transition-transform duration-200 ease-in-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Instruções de uso */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded">
          Clique fora da imagem para fechar
        </div>
      </div>
    </div>
  );
}

export function ProductDetails({ product, onEdit, onBack }: ProductDetailsProps) {
  const { movements } = useInventory();
  const { user: currentUser } = useAuth();
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [equipmentReservations, setEquipmentReservations] = useState<EquipmentReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Estados para modais de visualização
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, alt: string}>({url: '', alt: ''});
  
  // **NOVO**: Estados para visualização de PDF
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{url: string, name: string}>({url: '', name: ''});

  // **ADICIONADO**: Verificação de segurança para o produto
  if (!product) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Produto não encontrado</p>
            <p className="text-gray-500 mt-2">O produto solicitado não pôde ser carregado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Função para abrir o modal de visualização de imagem
  const handleImageClick = (imageUrl: string, imageAlt: string) => {
    setSelectedImage({ url: imageUrl, alt: imageAlt });
    setImageViewerOpen(true);
  };

  // **NOVA FUNÇÃO**: Abrir modal de visualização de PDF
  const handlePdfClick = (pdfUrl: string, pdfName: string) => {
    setSelectedPdf({ url: pdfUrl, name: pdfName });
    setPdfViewerOpen(true);
  };

  // **FUNÇÃO MELHORADA**: Detectar tipo de arquivo com mais precisão
  const getFileType = (url: string, fileName?: string): 'image' | 'pdf' | 'document' => {
    // Verificar por extensão no nome do arquivo
    if (fileName) {
      const extension = fileName.toLowerCase().split('.').pop();
      if (['pdf'].includes(extension || '')) return 'pdf';
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension || '')) return 'image';
    }

    // Verificar por URL
    if (url.startsWith('data:image') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)(\?.*)?$/i.test(url)) {
      return 'image';
    }
    
    if (url.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(url)) {
      return 'pdf';
    }

    // Verificar por content-type no data URL
    if (url.startsWith('data:')) {
      if (url.includes('application/pdf')) return 'pdf';
      if (url.includes('image/')) return 'image';
    }

    return 'document';
  };

  // **FUNÇÃO ATUALIZADA**: Visualizar anexos com suporte a PDF
  const handleViewAttachments = (movement: StockMovement) => {
    if (!movement.attachments || movement.attachments.length === 0) return;

    // Se há apenas um anexo, abrir direto no modal apropriado
    if (movement.attachments.length === 1) {
      const attachment = movement.attachments[0];
      const fileType = getFileType(attachment);
      const fileName = `Anexo da movimentação ${movement.reason}`;

      if (fileType === 'image') {
        handleImageClick(attachment, fileName);
        return;
      } else if (fileType === 'pdf') {
        handlePdfClick(attachment, fileName + '.pdf');
        return;
      }
    }

    // Preparar lista de anexos com tipos detectados
    const attachmentsList = movement.attachments.map((attachment, index) => {
      const fileType = getFileType(attachment);
      const baseName = `Anexo ${index + 1}`;
      const fileName = fileType === 'pdf' ? `${baseName}.pdf` : baseName;
      
      return {
        url: attachment,
        name: fileName,
        type: fileType,
        index
      };
    });

    // **CONTEÚDO ATUALIZADO**: HTML para nova janela com suporte a PDF
    const modalContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Anexos da Movimentação - ${product.name || 'Produto'}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
            .attachments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }
            .attachment-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s; }
            .attachment-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            .attachment-preview { height: 150px; display: flex; align-items: center; justify-content: center; background: #f9fafb; position: relative; }
            .attachment-preview img { max-width: 100%; max-height: 100%; object-fit: cover; }
            .attachment-info { padding: 15px; }
            .attachment-name { font-weight: 500; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
            .attachment-actions { display: flex; gap: 8px; flex-wrap: wrap; }
            .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: background-color 0.2s; }
            .btn-primary { background: #3b82f6; color: white; }
            .btn-primary:hover { background: #2563eb; }
            .btn-secondary { background: #6b7280; color: white; }
            .btn-secondary:hover { background: #4b5563; }
            .btn-pdf { background: #dc2626; color: white; }
            .btn-pdf:hover { background: #b91c1c; }
            .file-icon { width: 64px; height: 64px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto; }
            .file-icon.pdf { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; }
            .file-icon.image { background: linear-gradient(135deg, #059669, #10b981); color: white; }
            .file-icon.document { background: linear-gradient(135deg, #6b7280, #9ca3af); color: white; }
            .file-type-badge { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📎 Anexos da Movimentação</h2>
              <p style="color: #666; margin: 8px 0;"><strong>Produto:</strong> ${product.name || 'N/A'} (SKU: ${product.sku || 'N/A'})</p>
              <p style="color: #666; margin: 8px 0;"><strong>Movimentação:</strong> ${movement.reason} - ${safeFormatDate(movement.createdAt, 'dd/MM/yyyy HH:mm')}</p>
              <p style="color: #666; margin: 8px 0;"><strong>Total de anexos:</strong> ${attachmentsList.length}</p>
            </div>
            <div class="attachments-grid">
              ${attachmentsList.map(attachment => `
                <div class="attachment-card">
                  <div class="attachment-preview">
                    <div class="file-type-badge">${attachment.type.toUpperCase()}</div>
                    ${attachment.type === 'image'
                      ? `<img src="${attachment.url}" alt="${attachment.name}" onclick="openImageModal('${attachment.url}', '${attachment.name}')" style="cursor: zoom-in;" />`
                      : `<div class="file-icon ${attachment.type}">
                           ${attachment.type === 'pdf' ? '📄' : attachment.type === 'image' ? '🖼️' : '📄'}
                         </div>`
                    }
                  </div>
                  <div class="attachment-info">
                    <div class="attachment-name">
                      ${attachment.type === 'pdf' ? '📄' : attachment.type === 'image' ? '🖼️' : '📄'}
                      ${attachment.name}
                    </div>
                    <div class="attachment-actions">
                      ${attachment.type === 'image'
                        ? `<button class="btn btn-primary" onclick="openImageModal('${attachment.url}', '${attachment.name}')">👁️ Visualizar</button>`
                        : attachment.type === 'pdf'
                        ? `<button class="btn btn-pdf" onclick="openPdfModal('${attachment.url}', '${attachment.name}')">👁️ Visualizar PDF</button>`
                        : `<a href="${attachment.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">👁️ Abrir</a>`
                      }
                      <a href="${attachment.url}" download="${attachment.name}" class="btn btn-secondary">📥 Baixar</a>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <script>
            function openImageModal(url, name) {
              const modal = window.open('', '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes');
              modal.document.write(\`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>\${name}</title>
                    <style>
                      body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
                      .image-container { text-align: center; }
                      .image-header { background: rgba(255,255,255,0.9); padding: 10px 20px; border-radius: 8px; margin-bottom: 20px; }
                      img { max-width: 90vw; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(255,255,255,0.1); cursor: zoom-in; }
                      img.zoomed { cursor: zoom-out; transform: scale(1.5); transition: transform 0.3s; }
                      .controls { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
                      .btn { padding: 10px 20px; background: rgba(255,255,255,0.9); border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; color: #333; }
                      .btn:hover { background: white; }
                    </style>
                  </head>
                  <body onclick="if(event.target === this) window.close()">
                    <div class="image-container">
                      <div class="image-header">
                        <h3 style="margin: 0;">🖼️ \${name}</h3>
                        <p style="margin: 5px 0 0 0; color: #666;">Clique na imagem para ampliar/reduzir</p>
                      </div>
                      <img src="\${url}" alt="\${name}" onclick="this.classList.toggle('zoomed')" />
                      <div class="controls">
                        <a href="\${url}" download="\${name}" class="btn">📥 Baixar</a>
                        <button onclick="window.close()" class="btn">❌ Fechar</button>
                      </div>
                    </div>
                  </body>
                </html>
              \`);
              modal.document.close();
            }

            function openPdfModal(url, name) {
              const modal = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
              modal.document.write(\`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>\${name}</title>
                    <style>
                      body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
                      .pdf-header { background: white; padding: 15px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: between; align-items: center; }
                      .pdf-container { height: calc(100vh - 60px); }
                      .pdf-iframe { width: 100%; height: 100%; border: none; }
                      .controls { display: flex; gap: 10px; }
                      .btn { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
                      .btn:hover { background: #2563eb; }
                      .btn-secondary { background: #6b7280; }
                      .btn-secondary:hover { background: #4b5563; }
                    </style>
                  </head>
                  <body>
                    <div class="pdf-header">
                      <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                        📄 \${name}
                      </h3>
                      <div class="controls">
                        <a href="\${url}" download="\${name}" class="btn">📥 Baixar</a>
                        <a href="\${url}" target="_blank" class="btn btn-secondary">🔗 Nova aba</a>
                        <button onclick="window.close()" class="btn btn-secondary">❌ Fechar</button>
                      </div>
                    </div>
                    <div class="pdf-container">
                      <iframe src="\${url}" class="pdf-iframe" title="\${name}"></iframe>
                    </div>
                  </body>
                </html>
              \`);
              modal.document.close();
            }
          </script>
        </body>
      </html>
    `;

    const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(modalContent);
      newWindow.document.close();
    }
  };

  // Função para determinar o status operacional real do equipamento
  const getActualOperatorStatus = () => {
    // Verificar se há reserva ativa
    const activeReservation = equipmentReservations.find(r => r.status_reserva === 'Ativo');

    if (activeReservation) {
      // Se há reserva ativa, usar o status da reserva
      return 'Em uso';
    } else {
      // Se não há reserva ativa, usar o status do formulário
      return product.operatorStatus || 'Disponível';
    }
  };

  const actualStatus = getActualOperatorStatus();

  // **MODIFICADO**: Função para obter o nome do usuário responsável com verificações de segurança
  const getUserName = (userId: string) => {
    if (!userId) return 'Usuário não identificado';

    // Primeiro tentar buscar pelo ID exato
    if (userNames[userId]) {
      return userNames[userId];
    }

    // Se for o usuário atual logado, mostrar o nome
    if (currentUser && (currentUser.id === userId || currentUser.email === userId)) {
      return currentUser.name || 'Usuário atual';
    }

    // Fallback para nomes conhecidos
    const fallbackNames: Record<string, string> = {
      '1': 'Admin Master',
      '2': 'Maria Silva',
      '3': 'João Santos',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos'
    };

    return fallbackNames[userId] || `Usuário ${userId}`;
  };

  // Carregar nomes dos usuários
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(user => {
          if (user && user.id && user.name) {
            namesMap[user.id] = user.name;
            if (user.email) {
              namesMap[user.email] = user.name; // Para compatibilidade com emails como ID
            }
          }
        });
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };

    loadUserNames();
  }, []);

  // Carregar reservas do equipamento
  useEffect(() => {
    const loadEquipmentReservations = async () => {
      try {
        setLoadingReservations(true);

        // Tentar carregar do Firebase primeiro
        try {
          const reservations = await reservationService.getAllReservations();
          const equipmentReservations = reservations.filter(r =>
            r && r.equipamento && product && product.name && 
            r.equipamento.toLowerCase() === product.name.toLowerCase()
          );
          setEquipmentReservations(equipmentReservations);
        } catch (firebaseError) {
          console.warn('Erro ao carregar reservas do Firebase:', firebaseError);
          
          // Fallback para dados locais
          try {
            const localReservations = offlineStorage.getCollection('reservations') as EquipmentReservation[];
            const equipmentReservations = localReservations.filter(r =>
              r && r.equipamento && product && product.name && 
              r.equipamento.toLowerCase() === product.name.toLowerCase()
            );
            setEquipmentReservations(equipmentReservations);
          } catch (localError) {
            console.warn('Erro ao carregar reservas locais:', localError);
            setEquipmentReservations([]);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar reservas do equipamento:', error);
        setEquipmentReservations([]);
      } finally {
        setLoadingReservations(false);
      }
    };

    if (product && product.name) {
      loadEquipmentReservations();
    }
  }, [product]);

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Filtrar movimentações do produto
  const productMovements = movements
    .filter(movement => movement && movement.productId === product?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calcular estatísticas das reservas
  const totalUsageHours = equipmentReservations
    .filter(r => r && r.status_reserva === 'Finalizado' && r.data_inicio && r.data_fim)
    .reduce((total, r) => {
      try {
        const start = new Date(r.data_inicio!);
        const end = new Date(r.data_fim!);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + (isNaN(hours) ? 0 : hours);
      } catch (error) {
        console.warn('Erro ao calcular duração da reserva:', error);
        return total;
      }
    }, 0);

  const averageUsagePerReservation = equipmentReservations.length > 0 
    ? totalUsageHours / equipmentReservations.length 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Produto
        </Button>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product?.name || 'Produto sem nome'}</h1>
                <p className="text-gray-500">SKU: {product?.sku || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={product?.isActive ? 'success' : 'secondary'}>
                {product?.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
              <Badge 
                variant={
                  actualStatus === 'Disponível' ? 'success' :
                  actualStatus === 'Em uso' ? 'warning' :
                  actualStatus === 'Manutenção' ? 'destructive' : 'secondary'
                }
              >
                {actualStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-gray-900">{product?.description || 'Sem descrição'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Código de Barras</label>
              <p className="text-gray-900">{product?.barcode || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Unidade</label>
              <p className="text-gray-900">{product?.unit || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Categoria</label>
              <p className="text-gray-900">{product?.category?.name || 'Sem categoria'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estoque e Preços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Informações de Estoque</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Estoque Atual</label>
                <p className="text-2xl font-bold text-gray-900">{product?.currentStock || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Estoque Mínimo</label>
                <p className="text-xl font-semibold text-gray-700">{product?.minStock || 0}</p>
              </div>
            </div>
            {(product?.currentStock || 0) <= (product?.minStock || 0) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Estoque baixo!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Informações de Preço</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Preço de Compra</label>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(product?.purchasePrice || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Preço de Venda</label>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(product?.salePrice || 0)}</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Valor Total em Estoque</label>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency((product?.currentStock || 0) * (product?.purchasePrice || 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Localização e Fornecedor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Localização</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Armazém</label>
                <p className="text-gray-900">{product?.location?.warehouse || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Corredor</label>
                <p className="text-gray-900">{product?.location?.aisle || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Prateleira</label>
                <p className="text-gray-900">{product?.location?.shelf || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Posição</label>
                <p className="text-gray-900">{product?.location?.position || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Fornecedor</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="text-gray-900">{product?.supplier?.name || 'Sem fornecedor'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{product?.supplier?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Telefone</label>
                <p className="text-gray-900">{product?.supplier?.phone || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Imagens do Produto */}
      {product?.images && product.images.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Imagens do Produto</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <div 
                  key={index} 
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleImageClick(image, `${product.name} - Imagem ${index + 1}`)}
                >
                  <img
                    src={image}
                    alt={`${product.name} - Imagem ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Uso (para equipamentos) */}
      {equipmentReservations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold">Estatísticas de Uso</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('usage-stats')}
              >
                {collapsedSections['usage-stats'] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          {!collapsedSections['usage-stats'] && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{equipmentReservations.length}</p>
                  <p className="text-sm text-gray-500">Total de Reservas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{Math.round(totalUsageHours)}h</p>
                  <p className="text-sm text-gray-500">Horas de Uso Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{Math.round(averageUsagePerReservation)}h</p>
                  <p className="text-sm text-gray-500">Média por Reserva</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Movimentações Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Movimentações Recentes</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('movements')}
            >
              {collapsedSections['movements'] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {!collapsedSections['movements'] && (
          <CardContent>
            {productMovements.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhuma movimentação encontrada</p>
            ) : (
              <div className="space-y-4">
                {productMovements.slice(0, 10).map((movement: any) => {
                  if (!movement) return null;
                  
                  return (
                    <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Informações da Movimentação */}
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <label className="text-sm font-medium text-gray-500">Quantidade</label>
                              <div className="flex items-center space-x-2 mt-1">
                                {movement.type === 'entrada' ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                )}
                                <span className={`font-semibold ${
                                  movement.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {movement.type === 'entrada' ? '+' : '-'}{movement.quantity || 0}
                                </span>
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <label className="text-sm font-medium text-gray-500">Estoque</label>
                              <p className="font-semibold text-gray-900 mt-1">{movement.stockAfter || 0}</p>
                            </div>
                            
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <label className="text-sm font-medium text-gray-500">Responsável</label>
                              <p className="font-semibold text-gray-900 mt-1">{getUserName(movement.userId)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Motivo</label>
                              <p className="text-gray-900">{movement.reason || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Data</label>
                              <p className="text-gray-900">{safeFormatDate(movement.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Anexos */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-blue-700">Anexos</label>
                            {movement.attachments && movement.attachments.length > 0 && (
                              <Badge variant="secondary">{movement.attachments.length}</Badge>
                            )}
                          </div>
                          
                          {movement.attachments && movement.attachments.length > 0 ? (
                            <div className="space-y-2">
                              {/* Preview dos primeiros anexos */}
                              <div className="grid grid-cols-2 gap-2">
                                {movement.attachments.slice(0, 2).map((attachment: string, index: number) => {
                                  const fileType = getFileType(attachment);
                                  return (
                                    <div 
                                      key={index}
                                      className="aspect-square bg-white rounded border-2 border-dashed border-blue-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                                      onClick={() => {
                                        if (fileType === 'image') {
                                          handleImageClick(attachment, `Anexo ${index + 1}`);
                                        } else if (fileType === 'pdf') {
                                          handlePdfClick(attachment, `Anexo ${index + 1}.pdf`);
                                        }
                                      }}
                                    >
                                      {fileType === 'image' ? (
                                        <img 
                                          src={attachment} 
                                          alt={`Anexo ${index + 1}`}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      ) : (
                                        <div className="text-center">
                                          <FileText className={`w-8 h-8 mx-auto mb-1 ${
                                            fileType === 'pdf' ? 'text-red-500' : 'text-gray-500'
                                          }`} />
                                          <span className="text-xs text-gray-600">
                                            {fileType.toUpperCase()}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Botão para visualizar todos */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewAttachments(movement)}
                                className="w-full"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {movement.attachments.length === 1 ? 'Visualizar' : `Ver todos (${movement.attachments.length})`}
                              </Button>
                            </div>
                          ) : (
                            <p className="text-blue-600 text-sm">Nenhum anexo</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {productMovements.length > 10 && (
                  <div className="text-center pt-4">
                    <p className="text-gray-500">
                      Mostrando 10 de {productMovements.length} movimentações
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modais de Visualização */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        imageUrl={selectedImage.url}
        imageAlt={selectedImage.alt}
        onClose={() => setImageViewerOpen(false)}
      />

      {/* **NOVO**: Modal de visualização de PDF */}
      <PDFViewerModal
        isOpen={pdfViewerOpen}
        pdfUrl={selectedPdf.url}
        pdfName={selectedPdf.name}
        onClose={() => setPdfViewerOpen(false)}
      />
    </div>
  );
}
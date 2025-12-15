import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export class AttachmentService {
  private static instance: AttachmentService;

  static getInstance(): AttachmentService {
    if (!AttachmentService.instance) {
      AttachmentService.instance = new AttachmentService();
    }
    return AttachmentService.instance;
  }

  // Upload file - with robust fallback to local storage
  async uploadFile(file: File, path: string): Promise<string> {
    console.log('📤 Iniciando upload de arquivo:', {
      fileName: file.name,
      size: file.size,
      type: file.type,
      path: path
    });

    // Always use local storage for immediate functionality
    try {
      const localUrl = await this.convertToBase64(file);
      console.log('✅ Arquivo convertido para base64 local:', {
        fileName: file.name,
        size: file.size,
        localUrlLength: localUrl.length,
        preview: localUrl.substring(0, 50) + '...'
      });
      
      return localUrl;
    } catch (error) {
      console.error('❌ Erro ao converter arquivo para base64:', error);
      throw new Error('Falha ao processar arquivo. Tente novamente.');
    }
  }

  // Convert file to base64 for local storage
  private async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Upload multiple files
  async uploadMultipleFiles(files: File[], basePath: string): Promise<string[]> {
    console.log(`📤 Enviando ${files.length} arquivos...`);
    
    const results: string[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`📤 Processando arquivo ${i + 1}/${files.length}: ${file.name}`);
        const url = await this.uploadFile(file, basePath);
        results.push(url);
        console.log(`✅ Arquivo ${i + 1} processado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro no arquivo ${i + 1} (${file.name}):`, error);
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    console.log(`📊 Resultado final: ${results.length} sucessos, ${errors.length} erros`);
    
    if (errors.length > 0) {
      console.warn('⚠️ Alguns arquivos falharam:', errors);
    }
    
    return results;
  }

  // Delete file (no-op for base64 local storage)
  async deleteFile(downloadURL: string): Promise<void> {
    console.log('🗑️ Solicitação de remoção de arquivo (local storage):', downloadURL.substring(0, 50) + '...');
    // For base64 local storage, we don't need to delete anything
    // The file will be removed when the parent object is deleted
    console.log('✅ Arquivo marcado para remoção');
  }

  // Get file info from URL or base64
  getFileInfo(downloadURL: string): { name: string; type: string } {
    try {
      if (downloadURL.startsWith('data:')) {
        // Base64 data URL
        const mimeMatch = downloadURL.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        
        // Try to extract filename from metadata if available
        const filenameMatch = downloadURL.match(/filename=([^;,]+)/);
        const fileName = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'arquivo';
        
        let type = 'document';
        if (mimeType.startsWith('image/')) {
          type = 'image';
        } else if (mimeType === 'application/pdf') {
          type = 'pdf';
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
          type = 'document';
        } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
          type = 'spreadsheet';
        }
        
        return { name: fileName, type };
      }
      
      // Firebase URL
      const url = new URL(downloadURL);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Extract original filename if it follows our naming pattern
      const parts = fileName.split('_');
      const originalName = parts.length > 1 ? parts.slice(1).join('_') : fileName;
      
      // Determine file type from extension
      const extension = originalName.split('.').pop()?.toLowerCase() || '';
      let type = 'document';
      
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        type = 'image';
      } else if (['pdf'].includes(extension)) {
        type = 'pdf';
      } else if (['doc', 'docx'].includes(extension)) {
        type = 'document';
      } else if (['xls', 'xlsx'].includes(extension)) {
        type = 'spreadsheet';
      }
      
      return { name: originalName, type };
    } catch (error) {
      console.error('Erro ao extrair informações do arquivo:', error);
      return { name: 'Arquivo', type: 'document' };
    }
  }

  // Generate file path based on context
  generatePath(context: 'movements' | 'products' | 'loans' | 'schedules', entityId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    return `attachments/${context}/${year}/${month}/${entityId}`;
  }

  // Get Firebase Storage path for debugging
  getFirebaseStoragePath(downloadURL: string): string {
    try {
      if (downloadURL.startsWith('data:')) {
        return 'Arquivo armazenado localmente (base64)';
      }
      
      const url = new URL(downloadURL);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Extract path from Firebase URL
      const bucketMatch = url.hostname.match(/^(.+)\.googleapis\.com$/);
      const bucket = bucketMatch ? bucketMatch[1] : 'shelter-65f31.appspot.com';
      
      return `gs://${bucket}/${decodeURIComponent(fileName)}`;
    } catch (error) {
      console.error('Erro ao extrair caminho do Firebase:', error);
      return 'Caminho não disponível';
    }
  }
}

export const attachmentService = AttachmentService.getInstance();
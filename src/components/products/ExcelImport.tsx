import { useState, useRef } from 'react';
import { Product, Category, Supplier } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Eye,
  Package,
  Info,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ExcelImportProps {
  categories: Category[];
  suppliers: Supplier[];
  onImport: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  onClose: () => void;
}

interface ImportResult {
  success: boolean;
  data?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[];
  errors?: string[];
  warnings?: string[];
  summary?: {
    totalRows: number;
    validProducts: number;
    skippedRows: number;
    newCategories: number;
    newSuppliers: number;
  };
}

export function ExcelImport({ categories, suppliers, onImport, onClose }: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setPreviewData([]);
      setShowPreview(false);
      processFile(selectedFile);
    }
  };

  const processFile = async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length > 1) {
        setPreviewData(jsonData.slice(0, 6)); // Show first 5 rows + header
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      setResult({
        success: false,
        errors: ['Erro ao ler arquivo Excel. Verifique se o arquivo está correto.']
      });
    }
  };

  const validateAndConvertData = (jsonData: any[]): ImportResult => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const newCategories: Category[] = [];
    const newSuppliers: Supplier[] = [];
    const existingSKUs = new Set<string>();

    if (jsonData.length < 2) {
      return {
        success: false,
        errors: ['Arquivo deve conter pelo menos uma linha de dados além do cabeçalho']
      };
    }

    const headers = jsonData[0];
    const expectedHeaders = [
      'Nome', 'Descrição', 'SKU', 'Código de Barras', 'Categoria', 'Fornecedor',
      'Preço de Compra', 'Preço de Venda', 'Unidade', 'Armazém', 'Corredor',
      'Prateleira', 'Posição', 'Estoque Atual', 'Estoque Mínimo', 'Estoque Máximo',
      'Lote', 'Data de Validade', 'Imagem URL', 'Ativo'
    ];

    // Verificar se pelo menos as colunas básicas estão presentes
    const requiredHeaders = ['Nome', 'SKU'];
    const missingRequired = requiredHeaders.filter(header => !headers.includes(header));
    if (missingRequired.length > 0) {
      return {
        success: false,
        errors: [`Colunas obrigatórias não encontradas: ${missingRequired.join(', ')}`]
      };
    }

    // Processar cada linha de dados
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowData: any = {};
      
      // Pular linhas vazias
      if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
        continue;
      }
      
      // Mapear dados da linha para objeto
      headers.forEach((header: string, index: number) => {
        rowData[header] = row[index];
      });

      try {
        // Validar e converter dados obrigatórios
        const name = rowData['Nome']?.toString().trim();
        if (!name) {
          warnings.push(`Linha ${i + 1}: Nome do produto não informado - usando nome padrão`);
        }
        
        const sku = rowData['SKU']?.toString().trim().toUpperCase();
        if (!sku) {
          warnings.push(`Linha ${i + 1}: SKU não informado - gerando SKU automático`);
        }

        // Verificar SKU duplicado
        const finalSku = sku || `AUTO-${Date.now()}-${i}`;
        if (existingSKUs.has(finalSku)) {
          warnings.push(`Linha ${i + 1}: SKU "${finalSku}" duplicado - ignorando produto`);
          continue;
        }
        existingSKUs.add(finalSku);

        // Encontrar ou criar categoria
        let category = categories.find(c => 
          c.name.toLowerCase() === (rowData['Categoria']?.toString().trim().toLowerCase() || '')
        );
        if (!category) {
          const categoryName = rowData['Categoria']?.toString().trim() || 'Geral';
          category = {
            id: `cat_${Date.now()}_${i}`,
            name: categoryName,
            description: `Categoria criada automaticamente: ${categoryName}`,
            color: '#3B82F6',
            createdAt: new Date()
          };
          newCategories.push(category);
          warnings.push(`Linha ${i + 1}: Categoria "${categoryName}" criada automaticamente`);
        }

        // Encontrar ou criar fornecedor
        let supplier = suppliers.find(s => 
          s.name.toLowerCase() === (rowData['Fornecedor']?.toString().trim().toLowerCase() || '')
        );
        if (!supplier) {
          const supplierName = rowData['Fornecedor']?.toString().trim() || 'Fornecedor Padrão';
          supplier = {
            id: `sup_${Date.now()}_${i}`,
            name: supplierName,
            contact: 'Contato não informado',
            email: undefined,
            phone: undefined,
            address: undefined,
            createdAt: new Date()
          };
          newSuppliers.push(supplier);
          warnings.push(`Linha ${i + 1}: Fornecedor "${supplierName}" criado automaticamente`);
        }

        // Função para converter números de forma segura
        const parseNumber = (value: any, defaultValue: number = 0): number => {
          if (value === null || value === undefined || value === '') return defaultValue;
          
          let stringValue = value.toString().trim();
          
          // Remover símbolos de moeda e espaços
          stringValue = stringValue.replace(/[R$\s]/g, '');
          
          // Converter vírgula para ponto
          stringValue = stringValue.replace(',', '.');
          
          // Remover caracteres não numéricos exceto ponto e sinal negativo
          stringValue = stringValue.replace(/[^\d.-]/g, '');
          
          const parsed = parseFloat(stringValue);
          return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
        };

        // Função para converter inteiros de forma segura
        const parseInteger = (value: any, defaultValue: number = 0): number => {
          if (value === null || value === undefined || value === '') return defaultValue;
          
          const stringValue = value.toString().trim().replace(/[^\d]/g, '');
          const parsed = parseInt(stringValue);
          return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
        };

        // Função para converter booleanos
        const parseBoolean = (value: any, defaultValue: boolean = true): boolean => {
          if (value === null || value === undefined || value === '') return defaultValue;
          
          const stringValue = value.toString().toLowerCase().trim();
          if (['true', 'sim', 'yes', '1', 'ativo', 'verdadeiro'].includes(stringValue)) return true;
          if (['false', 'não', 'no', '0', 'inativo', 'falso'].includes(stringValue)) return false;
          
          return defaultValue;
        };

        // Converter data de validade
        let expiryDate: Date | undefined = undefined;
        if (rowData['Data de Validade']) {
          try {
            const dateValue = rowData['Data de Validade'];
            if (typeof dateValue === 'number') {
              // Excel date serial number
              expiryDate = new Date((dateValue - 25569) * 86400 * 1000);
            } else if (typeof dateValue === 'string') {
              // Try different date formats
              const dateStr = dateValue.trim();
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                expiryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else if (dateStr.includes('-')) {
                expiryDate = new Date(dateStr);
              }
            }
            
            if (expiryDate && isNaN(expiryDate.getTime())) {
              expiryDate = undefined;
              warnings.push(`Linha ${i + 1}: Data de validade inválida - ignorando campo`);
            }
          } catch {
            warnings.push(`Linha ${i + 1}: Erro ao converter data de validade - ignorando campo`);
          }
        }

        // Processar URLs de imagens
        const imageUrls: string[] = [];
        const imageUrlField = rowData['Imagem URL']?.toString().trim();
        if (imageUrlField) {
          // Suportar múltiplas URLs separadas por vírgula ou ponto e vírgula
          const urls = imageUrlField.split(/[,;]/).map(url => url.trim()).filter(url => url);
          
          urls.forEach(url => {
            // Validar se é uma URL válida
            try {
              new URL(url);
              imageUrls.push(url);
            } catch {
              // Se não for URL válida, verificar se é um caminho de arquivo local
              if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                imageUrls.push(url);
              } else {
                warnings.push(`Linha ${i + 1}: URL de imagem inválida "${url}" - ignorando`);
              }
            }
          });
        }
        const product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
          name: name || `Produto ${i}`,
          description: rowData['Descrição']?.toString().trim() || '',
          sku: finalSku,
          barcode: rowData['Código de Barras']?.toString().trim() || undefined,
          category,
          supplier,
          purchasePrice: parseNumber(rowData['Preço de Compra'], 0),
          salePrice: parseNumber(rowData['Preço de Venda'], 0),
          unit: rowData['Unidade']?.toString().trim() || 'UN',
          location: {
            id: `${rowData['Armazém']?.toString().trim() || 'Principal'}-${rowData['Corredor']?.toString().trim() || 'A'}-${rowData['Prateleira']?.toString().trim() || '01'}-${rowData['Posição']?.toString().trim() || ''}`,
            warehouse: rowData['Armazém']?.toString().trim() || 'Principal',
            aisle: rowData['Corredor']?.toString().trim() || 'A',
            shelf: rowData['Prateleira']?.toString().trim() || '01',
            position: rowData['Posição']?.toString().trim() || undefined,
          },
          currentStock: parseInteger(rowData['Estoque Atual'], 0),
          minStock: parseInteger(rowData['Estoque Mínimo'], 0),
          maxStock: rowData['Estoque Máximo'] ? parseInteger(rowData['Estoque Máximo']) : undefined,
          batch: rowData['Lote']?.toString().trim() || undefined,
          expiryDate,
          images: imageUrls,
          isActive: parseBoolean(rowData['Ativo'], true),
        };

        products.push(product);

      } catch (error) {
        errors.push(`Linha ${i + 1}: Erro ao processar dados - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    return {
      success: errors.length === 0,
      data: products,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      summary: {
        totalRows: jsonData.length - 1,
        validProducts: products.length,
        skippedRows: (jsonData.length - 1) - products.length,
        newCategories: newCategories.length,
        newSuppliers: newSuppliers.length
      }
    };
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const result = validateAndConvertData(jsonData);
      setResult(result);

      if (result.success && result.data && result.data.length > 0) {
        await onImport(result.data);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: ['Erro ao processar arquivo Excel. Verifique se o arquivo está no formato correto.']
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      // Cabeçalho com todas as colunas
      [
        'Nome', 'Descrição', 'SKU', 'Código de Barras', 'Categoria', 'Fornecedor',
        'Preço de Compra', 'Preço de Venda', 'Unidade', 'Armazém', 'Corredor',
        'Prateleira', 'Posição', 'Estoque Atual', 'Estoque Mínimo', 'Estoque Máximo',
        'Lote', 'Data de Validade', 'Imagem URL', 'Ativo'
      ],
      // Exemplos de produtos
      [
        'iPhone 15 Pro', 'Smartphone Apple iPhone 15 Pro 128GB Space Black', 'IPH15PRO128', '1234567890123',
        'Eletrônicos', 'Apple Inc', '4500.00', '5999.00', 'UN', 'Principal', 'A', '01', '01',
        '15', '5', '50', 'LT001', '31/12/2025', 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg', 'true'
      ],
      [
        'Mesa de Escritório Premium', 'Mesa de escritório em madeira maciça com gavetas', 'MESA-ESC-001', '9876543210987',
        'Móveis', 'Móveis Premium Ltda', '450.00', '699.00', 'UN', 'Depósito', 'B', '02', '03',
        '8', '2', '20', 'LT002', '', 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg', 'true'
      ],
      [
        'Caneta Esferográfica Azul', 'Caneta esferográfica ponta média cor azul', 'CAN-AZUL-001', '',
        'Material de Escritório', 'Papelaria ABC', '1.50', '3.00', 'UN', 'Almoxarifado', 'C', '03', '01',
        '150', '20', '500', 'LT003', '', 'https://images.pexels.com/photos/159751/book-address-book-learning-learn-159751.jpeg', 'true'
      ],
      [
        'Notebook Dell Inspiron', 'Notebook Dell Inspiron 15 Intel i5 8GB 256GB SSD', 'DELL-INSP-15', '5555666677778',
        'Eletrônicos', 'Dell Technologies', '2800.00', '3499.00', 'UN', 'Principal', 'A', '02', '02',
        '5', '2', '15', 'LT004', '', 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg', 'true'
      ],
      [
        'Cadeira Ergonômica', 'Cadeira de escritório ergonômica com apoio lombar', 'CAD-ERG-001', '',
        'Móveis', 'Móveis Premium Ltda', '320.00', '499.00', 'UN', 'Depósito', 'B', '01', '01',
        '12', '3', '25', '', '', 'https://images.pexels.com/photos/586415/pexels-photo-586415.jpeg', 'true'
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');

    // Ajustar largura das colunas para melhor visualização
    const colWidths = [
      { wch: 25 }, // Nome
      { wch: 40 }, // Descrição
      { wch: 15 }, // SKU
      { wch: 15 }, // Código de Barras
      { wch: 18 }, // Categoria
      { wch: 20 }, // Fornecedor
      { wch: 15 }, // Preço de Compra
      { wch: 15 }, // Preço de Venda
      { wch: 10 }, // Unidade
      { wch: 12 }, // Armazém
      { wch: 10 }, // Corredor
      { wch: 12 }, // Prateleira
      { wch: 10 }, // Posição
      { wch: 12 }, // Estoque Atual
      { wch: 12 }, // Estoque Mínimo
      { wch: 12 }, // Estoque Máximo
      { wch: 12 }, // Lote
      { wch: 15 }, // Data de Validade
      { wch: 50 }, // Imagem URL
      { wch: 8 }   // Ativo
    ];
    worksheet['!cols'] = colWidths;

    // Adicionar comentários nas células do cabeçalho
    const comments = {
      'A1': 'Nome do produto (obrigatório)',
      'C1': 'Código SKU único (obrigatório)',
      'E1': 'Nome da categoria (será criada se não existir)',
      'F1': 'Nome do fornecedor (será criado se não existir)',
      'G1': 'Preço em reais (use ponto ou vírgula)',
      'H1': 'Preço em reais (use ponto ou vírgula)',
      'I1': 'UN, KG, L, M, etc.',
      'R1': 'DD/MM/AAAA ou deixe vazio',
      'S1': 'URL da imagem do produto (opcional)',
      'T1': 'true/false, sim/não, 1/0'
    };

    XLSX.writeFile(workbook, 'template_produtos_completo.xlsx');
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setPreviewData([]);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Importar Produtos via Excel</h2>
                <p className="text-gray-600">Importe produtos em lote usando arquivo Excel</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-3">
                  <h3 className="font-medium text-blue-900">Instruções para Importação</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Preparação:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Baixe o modelo Excel clicando em "Baixar Modelo"</li>
                        <li>• Preencha os dados seguindo os exemplos</li>
                        <li>• Mantenha o cabeçalho original</li>
                        <li>• Salve como arquivo .xlsx ou .xls</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Campos Obrigatórios:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Nome:</strong> Nome do produto</li>
                        <li>• <strong>SKU:</strong> Código único do produto</li>
                        <li>• Outros campos são opcionais</li>
                        <li>• Valores padrão serão usados se não informados</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Formatos Aceitos:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                      <div>
                        <strong>Preços:</strong> 1500.50 ou 1500,50
                      </div>
                      <div>
                        <strong>Datas:</strong> 31/12/2025 ou 2025-12-31
                      </div>
                      <div>
                        <strong>Imagens:</strong> URLs válidas (http/https)
                      </div>
                      <div>
                        <strong>Status:</strong> true/false, sim/não, 1/0
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Download */}
          <div className="flex items-center justify-center">
            <Button
              variant="secondary"
              onClick={downloadTemplate}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Modelo Excel Completo</span>
            </Button>
          </div>

          {/* File Upload */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Selecionar Arquivo Excel</h3>
                
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                      </p>
                      <p className="text-xs text-gray-500">Apenas arquivos Excel (.xlsx, .xls)</p>
                      <p className="text-xs text-gray-400 mt-1">Tamanho máximo: 10MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{file.name}</p>
                        <p className="text-xs text-green-700">
                          {(file.size / 1024).toFixed(1)} KB - {file.type}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {showPreview && previewData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Prévia dos Dados
                  </h3>
                  <Badge variant="info" size="sm">
                    {previewData.length - 1} linhas de exemplo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        {previewData[0]?.map((header: string, index: number) => (
                          <th key={index} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.slice(1).map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-gray-900">
                              {String(cell || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {result && (
            <Card className={`border-2 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-medium text-lg ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.success ? 'Importação Concluída com Sucesso!' : 'Erro na Importação'}
                    </h3>
                    
                    {/* Summary */}
                    {result.summary && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-blue-600">{result.summary.totalRows}</p>
                          <p className="text-xs text-gray-600">Linhas Processadas</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-green-600">{result.summary.validProducts}</p>
                          <p className="text-xs text-gray-600">Produtos Válidos</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-yellow-600">{result.summary.skippedRows}</p>
                          <p className="text-xs text-gray-600">Linhas Ignoradas</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-purple-600">{result.summary.newCategories}</p>
                          <p className="text-xs text-gray-600">Novas Categorias</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg border">
                          <p className="text-2xl font-bold text-indigo-600">{result.summary.newSuppliers}</p>
                          <p className="text-xs text-gray-600">Novos Fornecedores</p>
                        </div>
                      </div>
                    )}

                    {result.success && result.data && (
                      <div className="mt-4 p-4 bg-green-100 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          ✅ {result.data.length} produtos foram importados com sucesso!
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Os produtos foram adicionados ao seu inventário e estão prontos para uso.
                        </p>
                      </div>
                    )}

                    {/* Errors */}
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-red-900 mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Erros Encontrados ({result.errors.length}):
                        </h4>
                        <div className="max-h-32 overflow-y-auto bg-red-100 rounded-lg p-3">
                          <ul className="text-sm text-red-800 space-y-1">
                            {result.errors.map((error, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-red-600 font-bold">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {result.warnings && result.warnings.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Avisos ({result.warnings.length}):
                        </h4>
                        <div className="max-h-32 overflow-y-auto bg-yellow-100 rounded-lg p-3">
                          <ul className="text-sm text-yellow-800 space-y-1">
                            {result.warnings.map((warning, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-yellow-600 font-bold">•</span>
                                <span>{warning}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={onClose}>
                {result?.success ? 'Fechar' : 'Cancelar'}
              </Button>
              
              {!result?.success && (
                <Button
                  variant="secondary"
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Modelo</span>
                </Button>
              )}
            </div>
            
            {file && !result?.success && (
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={importing}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Processar e Importar</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
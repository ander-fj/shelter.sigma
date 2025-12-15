import { useState } from 'react';
import { Product, StockMovement } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useInventory } from '../../contexts/InventoryContext';
import { 
  X, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Info
} from 'lucide-react';

interface StockCorrectionModalProps {
  products: Product[];
  movements: StockMovement[];
  onClose: () => void;
  onProductsUpdated: () => void;
}

interface CorrectionResult {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  calculatedStock: number;
  difference: number;
  needsCorrection: boolean;
}

export function StockCorrectionModal({ 
  products, 
  movements, 
  onClose, 
  onProductsUpdated 
}: StockCorrectionModalProps) {
  const { updateProduct } = useInventory();
  const [analyzing, setAnalyzing] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [results, setResults] = useState<CorrectionResult[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const analyzeStockIntegrity = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      const corrections: CorrectionResult[] = [];
      
      products.forEach(product => {
        // Get all movements for this product
        const productMovements = movements
          .filter(m => m.productId === product.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Calculate stock based on movements
        let calculatedStock = 0;
        
        productMovements.forEach(movement => {
          // Only process approved movements or movements without approval requirement
          if (movement.approvalStatus && movement.approvalStatus !== 'approved') {
            return; // Skip non-approved movements
          }
          
          switch (movement.type) {
            case 'entry':
              calculatedStock += movement.quantity;
              break;
            case 'exit':
              calculatedStock -= movement.quantity;
              break;
            case 'transfer':
              // For transfers, check if it's a location change or actual transfer
              if (movement.reason === 'Mudança de localização') {
                // Location change doesn't affect stock
                break;
              } else if (movement.transferData?.transferStatus === 'received') {
                // If transfer was received, add to stock
                calculatedStock += movement.quantity;
              } else if (movement.transferData?.transferStatus === 'pending' || 
                        movement.transferData?.transferStatus === 'in_transit') {
                // If transfer is pending/in transit, subtract from origin
                calculatedStock -= movement.quantity;
              }
              break;
            case 'adjustment':
              // For adjustments, use the quantity field which represents the final stock
              calculatedStock = movement.quantity;
              break;
          }
          
          // Handle classifications (reemprego/sucata)
          if (movement.classifications && movement.classifications.length > 0) {
            const totalClassified = movement.classifications.reduce((sum, c) => sum + c.quantity, 0);
            // Subtract classified quantities from original product
            calculatedStock -= totalClassified;
          }
        });
        
        // Ensure stock doesn't go negative
        calculatedStock = Math.max(0, calculatedStock);
        
        const difference = product.currentStock - calculatedStock;
        const needsCorrection = Math.abs(difference) > 0;
        
        corrections.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          calculatedStock,
          difference,
          needsCorrection
        });
      });
      
      setResults(corrections);
      setHasAnalyzed(true);
      setAnalyzing(false);
    }, 2000);
  };

  const correctStocks = async () => {
    setCorrecting(true);
    
    try {
      for (const result of results.filter(r => r.needsCorrection)) {
        // Update product stock
        await updateProduct(result.productId, {
          currentStock: result.calculatedStock,
          updatedAt: new Date()
        });
      }
      
      console.log('Saldos corrigidos com sucesso!');
      onProductsUpdated();
      
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao corrigir saldos:', error);
      alert('Erro ao corrigir saldos. Tente novamente.');
    } finally {
      setCorrecting(false);
    }
  };

  const exportReport = () => {
    const exportData = results.map(result => ({
      'Produto': result.productName,
      'SKU': result.sku,
      'Estoque Atual': result.currentStock,
      'Estoque Calculado': result.calculatedStock,
      'Diferença': result.difference,
      'Precisa Correção': result.needsCorrection ? 'Sim' : 'Não',
      'Status': result.needsCorrection ? 'Inconsistente' : 'Correto'
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      'Relatório de Correção de Saldos',
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      `Total de Produtos: ${results.length}`,
      `Produtos com Inconsistências: ${results.filter(r => r.needsCorrection).length}`,
      '',
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `correcao_saldos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const productsNeedingCorrection = results.filter(r => r.needsCorrection);
  const totalDifference = results.reduce((sum, r) => sum + Math.abs(r.difference), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Calculator className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Correção de Saldos</h2>
                <p className="text-gray-600">Analise e corrija inconsistências nos estoques</p>
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
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Como funciona a correção de saldos:</p>
                  <ul className="space-y-1">
                    <li>• Analisa todas as movimentações de cada produto</li>
                    <li>• Calcula o estoque correto baseado no histórico</li>
                    <li>• Identifica produtos com saldos inconsistentes</li>
                    <li>• Permite corrigir automaticamente os saldos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Button */}
          {!hasAnalyzed && (
            <div className="text-center">
              <Button
                onClick={analyzeStockIntegrity}
                loading={analyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                {analyzing ? 'Analisando...' : 'Analisar Integridade dos Dados'}
              </Button>
            </div>
          )}

          {/* Results Summary */}
          {hasAnalyzed && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{results.length}</p>
                  <p className="text-sm text-gray-600">Total de Produtos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{productsNeedingCorrection.length}</p>
                  <p className="text-sm text-gray-600">Com Inconsistências</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{results.length - productsNeedingCorrection.length}</p>
                  <p className="text-sm text-gray-600">Corretos</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{totalDifference}</p>
                  <p className="text-sm text-gray-600">Total de Diferenças</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Table */}
          {hasAnalyzed && results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Resultados da Análise</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      onClick={exportReport}
                      className="flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportar Relatório</span>
                    </Button>
                    {productsNeedingCorrection.length > 0 && (
                      <Button
                        onClick={correctStocks}
                        loading={correcting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {correcting ? 'Corrigindo...' : `Corrigir ${productsNeedingCorrection.length} Produtos`}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estoque Atual
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estoque Calculado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Diferença
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result) => (
                        <tr 
                          key={result.productId} 
                          className={`hover:bg-gray-50 ${result.needsCorrection ? 'bg-red-50' : ''}`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.productName}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {result.sku}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-bold">
                              {result.currentStock}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-bold">
                              {result.calculatedStock}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`text-sm font-bold ${
                              result.difference === 0 ? 'text-green-600' :
                              result.difference > 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {result.difference > 0 ? '+' : ''}{result.difference}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge 
                              variant={result.needsCorrection ? 'danger' : 'success'} 
                              size="sm"
                            >
                              {result.needsCorrection ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Inconsistente
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Correto
                                </>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Issues Found */}
          {hasAnalyzed && productsNeedingCorrection.length === 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Todos os Saldos Estão Corretos!
                </h3>
                <p className="text-green-700">
                  Não foram encontradas inconsistências nos estoques dos produtos.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Fechar
            </Button>
            
            <div className="flex items-center space-x-3">
              {hasAnalyzed && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setHasAnalyzed(false);
                    setResults([]);
                  }}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Nova Análise</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
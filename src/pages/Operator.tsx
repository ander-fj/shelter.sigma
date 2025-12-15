import { useState, useEffect } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { offlineStorage } from '../services/offlineStorageService';
import { EquipmentReservation, Product } from '../types';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { SingleProductSelector } from '../components/common/SingleProductSelector';
import { reservationService } from '../services/reservationService';
import { EquipmentHeatMap } from '../components/operator/EquipmentHeatMap';
import { 
  Settings, 
  Package, 
  User, 
  Fuel, 
  Droplets, 
  Activity, 
  FileText,
  Play,
  Square,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  MapPin,
  Wrench,
  Eye,
  TrendingUp,
  BarChart3,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../utils/dateUtils';
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export function Operator() {
  const { products, updateProduct } = useInventory();
  const { isCollapsed } = useLayout();
  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const [reservations, setReservations] = useState<EquipmentReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsedReservations, setCollapsedReservations] = useState<Record<string, boolean>>({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [reservationStatusFilter, setReservationStatusFilter] = useState('');
  const [expandedReservations, setExpandedReservations] = useState<Record<string, boolean>>({});
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});
  const [lastReservationCheck, setLastReservationCheck] = useState<Date>(new Date());
  
  // Form state
  const [formData, setFormData] = useState({
    operador: user?.name || '',
    nivel_oleo: 'Médio' as 'Baixo' | 'Médio' | 'Alto',
    nivel_combustivel: 'Médio' as 'Baixo' | 'Médio' | 'Alto',
    nivel_poligrama: 'Médio' as 'Baixo' | 'Médio' | 'Alto',
    status_equipamento: 'Disponível' as 'Em uso' | 'Disponível' | 'Manutenção',
    observacoes: '',
  });

  const [selectedEquipment, setSelectedEquipment] = useState<Product | null>(null);

  const [showReasonModal, setShowReasonModal] = useState<{
    type: 'start' | 'finish';
    reservationId?: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
    timestamp: Date;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(true);
  const [isReservationsCollapsed, setIsReservationsCollapsed] = useState(true);

  // Load reservations on component mount
  useEffect(() => {
    const loadReservations = async () => {
      try {
        setLoading(true);
        
        // Load from offline storage first
        const offlineReservations = offlineStorage.getCollection('reservations');
        if (offlineReservations.length > 0) {
          setReservations(offlineReservations);
          console.log('📂 Reservas carregadas offline:', offlineReservations.length);
        }
        
        if (isOnline) {
          // Setup realtime listener if online
          const unsubscribeFunction = reservationService.setupRealtimeListener((fetchedReservations) => {
            // Remove duplicates and use latest data
            const uniqueReservations = new Map<string, EquipmentReservation>();
            
            // Add Firebase reservations first (they are authoritative)
            fetchedReservations.forEach(reservation => {
              const key = `${reservation.operador}-${reservation.equipamento}`;
              const existing = uniqueReservations.get(key);
              
              // Keep the most recent reservation for each operator-equipment combination
              if (!existing || new Date(reservation.updatedAt) > new Date(existing.updatedAt)) {
                uniqueReservations.set(key, reservation);
              }
            });
            
            // Add local reservations only if they don't conflict with Firebase data
            offlineReservations.forEach(reservation => {
              const key = `${reservation.operador}-${reservation.equipamento}`;
              const existing = uniqueReservations.get(key);
              
              // Only add local reservation if:
              // 1. No Firebase reservation exists for this operator-equipment combination
              // 2. Local reservation is newer than Firebase reservation
              if (!existing || (
                !reservation.id.startsWith('local_') && 
                new Date(reservation.updatedAt) > new Date(existing.updatedAt)
              )) {
                uniqueReservations.set(key, reservation);
              }
            });
            
            const mergedReservations = Array.from(uniqueReservations.values());
            setReservations(mergedReservations);
            setLastReservationCheck(new Date());
            
            // Save merged data to offline storage
            offlineStorage.saveCollection('reservations', mergedReservations);
            setLoading(false);
          });
          setRealtimeUnsubscribe(() => unsubscribeFunction);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        setLoading(false);
      }
    };

    loadReservations();
    
    return () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, [isOnline]);

  // Update operator name when user changes
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, operador: user.name }));
    }
  }, [user?.name]);

  // Função para atualizar status operacional do equipamento
  const updateEquipmentStatus = async (productId: string, newStatus: 'Disponível' | 'Em uso') => {
    try {
      await updateProduct(productId, { 
        operatorStatus: newStatus,
        updatedAt: new Date()
      });
      
      console.log(`Status do equipamento atualizado para: ${newStatus}`);
      
      // Mostrar feedback visual
      const statusMessage = newStatus === 'Em uso' 
        ? 'Equipamento marcado como Em Uso' 
        : 'Equipamento marcado como Disponível';
      
      // Aqui você pode adicionar um toast ou notificação
      alert(statusMessage);
      
    } catch (error) {
      console.error('Erro ao atualizar status do equipamento:', error);
      alert('Erro ao atualizar status do equipamento. Tente novamente.');
    }
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      const fetchedReservations = await reservationService.getAllReservations();
      setReservations(fetchedReservations);
    } catch (error) {
      console.error('Erro ao carregar reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStartReservation = () => {
    if (!selectedEquipment) {
      alert('Por favor, selecione um equipamento antes de iniciar a reserva.');
      return;
    }
    
    setShowReasonModal({ type: 'start' });
    setReasonText('');
  };

  const handleFinishReservation = (reservationId: string) => {
    setShowReasonModal({ type: 'finish', reservationId });
    setReasonText('');
  };

  const handleDeleteReservation = async (reservationId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta reserva?')) {
      return;
    }

    try {
      // Find the reservation to delete
      const reservationToDelete = reservations.find(r => r.id === reservationId);
      if (!reservationToDelete) {
        console.error('Reserva não encontrada para exclusão:', reservationId);
        return;
      }
      
      // Encontrar a reserva para obter o equipamento
      const reservation = reservations.find(r => r.id === reservationId);
      if (reservation) {
        // Atualizar status do equipamento para "Disponível"
        const equipment = products.find(p => p.name === reservation.equipamento);
        if (equipment) {
          await updateProduct(equipment.id, {
            operatorStatus: 'Disponível'
          });
          console.log('Status do equipamento atualizado para Disponível:', equipment.name);
        }
      }

      // Remover reserva da lista local
      setReservations(prev => prev.filter(r => r.id !== reservationId));
      
      // Atualizar status do equipamento para "Disponível"
      try {
        console.log('🔄 Atualizando status do equipamento para Disponível:', reservation.equipamento);
        await updateProduct(reservation.equipamento, {
          operatorStatus: 'Disponível'
        });
        console.log('✅ Status do equipamento atualizado para Disponível');
      } catch (error) {
        console.error('❌ Erro ao atualizar status do equipamento:', error);
      }

      // Tentar excluir do Firebase se online
      if (isOnline) {
        try {
          await reservationService.updateReservation(reservationId, {
            status_reserva: 'Finalizado',
            data_fim: new Date(),
            motivo_finalizacao: 'Reserva excluída pelo usuário'
          });
          console.log('Reserva marcada como finalizada no Firebase');
        } catch (error) {
          console.warn('Erro ao finalizar reserva no Firebase:', error);
        }
      }
      
      console.log('Reserva excluída com sucesso');
    } catch (error) {
      console.error('Erro ao excluir reserva:', error);
      alert('Erro ao excluir reserva. Tente novamente.');
    }
  };

  const captureGeolocation = async (): Promise<{
    latitude: number;
    longitude: number;
    address?: string;
    timestamp: Date;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const timestamp = new Date();
          
          try {
            // Try to get address from coordinates
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'User-Agent': 'InventoryApp/1.0'
                }
              }
            );
            
            let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                // Extract relevant address components
                const addressParts = [];
                
                if (data.address.road) {
                  addressParts.push(data.address.road);
                }
                
                if (data.address.house_number) {
                  addressParts[0] = `${data.address.road}, ${data.address.house_number}`;
                }
                
                if (data.address.neighbourhood || data.address.suburb) {
                  addressParts.push(data.address.neighbourhood || data.address.suburb);
                }
                
                if (data.address.city || data.address.town || data.address.village) {
                  addressParts.push(data.address.city || data.address.town || data.address.village);
                }
                
                const formattedAddress = addressParts.join(', ');
                if (formattedAddress.length > 80) {
                  address = formattedAddress.substring(0, 77) + '...';
                } else {
                  address = formattedAddress;
                }
              }
            }
            
            setLocationLoading(false);
            resolve({ latitude, longitude, address, timestamp });
          } catch (error) {
            console.error('Erro ao obter endereço:', error);
            setLocationLoading(false);
            resolve({ latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, timestamp });
          }
        },
        (error) => {
          setLocationLoading(false);
          reject(new Error(`Erro ao obter localização: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  const toggleCardCollapse = (cardId: string) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleConfirmAction = async () => {
    if (!reasonText.trim()) {
      alert('Por favor, preencha o motivo antes de confirmar.');
      return;
    }

    setSubmitting(true);
    try {
      // Capture geolocation, date and time
      let locationData = null;
      try {
        locationData = await captureGeolocation();
        setCapturedLocation(locationData);
        console.log('Localização capturada:', locationData);
      } catch (error) {
        console.warn('Não foi possível capturar a localização:', error);
        // Continue without location data
        locationData = {
          latitude: 0,
          longitude: 0,
          address: 'Localização não disponível',
          timestamp: new Date()
        };
      }

      if (showReasonModal?.type === 'start') {
        // Check for existing active reservation for this operator-equipment combination
        const existingActiveReservation = reservations.find(r => 
          r.operador === formData.operador && 
          r.equipamento === selectedEquipment?.name && 
          r.status_reserva === 'Ativo'
        );
        
        if (existingActiveReservation) {
          // Update existing reservation instead of creating new one
          console.log('🔄 Atualizando reserva existente ao invés de criar nova:', existingActiveReservation.id);
          
          const reservationData = {
            operador: formData.operador,
            equipamento: selectedEquipment?.name || '',
            nivel_oleo: formData.nivel_oleo,
            nivel_combustivel: formData.nivel_combustivel,
            nivel_poligrama: formData.nivel_poligrama,
            status_equipamento: formData.status_equipamento,
            observacoes: `${formData.observacoes || ''}\n\n--- Dados da Reserva ---\nData/Hora: ${format(locationData.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}\nLocalização: ${locationData.address}\nCoordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}\nOperador: ${formData.operador}\nDispositivo: ${navigator.platform}\nNavegador: ${navigator.userAgent.split(' ')[0]}`.trim(),
            motivo_reserva: reasonText.trim(),
            data_inicio: new Date(),
            status_reserva: 'Ativo' as const,
          };
          
          const updatedReservation = {
            ...existingActiveReservation,
            ...reservationData,
            updatedAt: new Date()
          };
          
          // Update local state
          setReservations(prev => prev.map(r => 
            r.id === existingActiveReservation.id ? updatedReservation : r
          ));
          
          // Update in Firebase if online
          if (isOnline) {
            try {
              await reservationService.updateReservation(existingActiveReservation.id, reservationData);
              console.log('✅ Reserva atualizada no Firebase:', reservationData.operador);
            } catch (error) {
              console.warn('❌ Erro ao atualizar no Firebase - adicionando à fila de sincronização:', error);
              offlineStorage.addToSyncQueue('reservations', updatedReservation);
            }
          } else {
            console.log('📴 Offline - reserva adicionada à fila de sincronização:', reservationData.operador);
            offlineStorage.addToSyncQueue('reservations', updatedReservation);
          }
          
          // Reset form
          setFormData(prev => ({
            ...prev,
            observacoes: '',
          }));
          setSelectedEquipment(null);
          alert('Reserva atualizada com sucesso!');
          setShowReasonModal(null);
          setReasonText('');
          return;
        }
        
        // Create new reservation
        const reservationData: Omit<EquipmentReservation, 'id' | 'createdAt' | 'updatedAt'> = {
          operador: formData.operador,
          equipamento: selectedEquipment?.name || '',
          nivel_oleo: formData.nivel_oleo,
          nivel_combustivel: formData.nivel_combustivel,
          nivel_poligrama: formData.nivel_poligrama,
          status_equipamento: formData.status_equipamento,
          observacoes: `${formData.observacoes || ''}\n\n--- Dados da Reserva ---\nData/Hora: ${format(locationData.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}\nLocalização: ${locationData.address}\nCoordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}\nOperador: ${formData.operador}\nDispositivo: ${navigator.platform}\nNavegador: ${navigator.userAgent.split(' ')[0]}`.trim(),
          motivo_reserva: reasonText.trim(),
          data_inicio: new Date(),
          status_reserva: 'Ativo',
        };

        // Create reservation locally first
        const newReservation: EquipmentReservation = {
          ...reservationData,
          id: Date.now().toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Atualizar status do equipamento para "Em uso" automaticamente
        try {
          await updateProduct(selectedEquipment.id, {
            operatorStatus: 'Em uso'
          });
          console.log('✅ Status do equipamento atualizado para "Em uso":', selectedEquipment.name);
        } catch (error) {
          console.error('❌ Erro ao atualizar status do equipamento:', error);
        }
        
        setReservations(prev => [...prev, newReservation]);

        // Save to Firebase if online, otherwise add to sync queue
        if (isOnline) {
          try {
            const firebaseId = await reservationService.createReservation(reservationData);
            // Update local reservation with Firebase ID
            setReservations(prev => prev.map(r => 
              r.id === newReservation.id ? { ...r, id: firebaseId } : r
            ));
            console.log('✅ Reserva salva no Firebase:', firebaseId);
          } catch (error) {
            console.warn('❌ Erro ao salvar no Firebase - adicionando à fila de sincronização:', error);
            offlineStorage.addToSyncQueue('reservations', newReservation);
          }
        } else {
          console.log('📴 Offline - reserva adicionada à fila de sincronização:', newReservation.operador);
          offlineStorage.addToSyncQueue('reservations', newReservation);
        }

        console.log('✅ Reserva salva no Firebase:', {
          id: newReservation.id,
          equipamento: reservationData.equipamento,
          operador: reservationData.operador,
          coordenadas: locationData ? `${locationData.latitude}, ${locationData.longitude}` : 'Não disponível'
        });

        // Reset form
        setFormData(prev => ({
          ...prev,
          observacoes: '',
        }));
        setSelectedEquipment(null);

        alert('Reserva iniciada com sucesso!');
      } else if (showReasonModal?.type === 'finish' && showReasonModal.reservationId) {
        // Find the reservation to finalize
        const reservationToFinalize = reservations.find(r => r.id === showReasonModal.reservationId);
        if (!reservationToFinalize) {
          console.error('Reserva não encontrada para finalização:', showReasonModal.reservationId);
          return;
        }
        
        // Ensure we're finalizing the most recent reservation for this operator-equipment
        const operatorEquipmentReservations = reservations.filter(r => 
          r.operador === reservationToFinalize.operador && 
          r.equipamento === reservationToFinalize.equipamento &&
          r.status_reserva === 'Ativo'
        );
        
        // Sort by creation date and get the most recent
        const latestReservation = operatorEquipmentReservations.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        if (latestReservation && latestReservation.id !== showReasonModal.reservationId) {
          console.log('🔄 Finalizando reserva mais recente ao invés da selecionada:', latestReservation.id);
          showReasonModal.reservationId = latestReservation.id;
        }
        
        // Update existing reservation
        const updateData = {
          motivo_finalizacao: `${reasonText.trim()}\n\n--- Dados da Finalização ---\nData/Hora: ${format(locationData.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}\nLocalização: ${locationData.address}\nCoordenadas: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}\nOperador: ${formData.operador}`,
          data_fim: new Date(),
          status_reserva: 'Finalizado' as const,
        };

        // Update locally first
        setReservations(prev => prev.map(r => 
          r.id === showReasonModal.reservationId ? { ...r, ...updateData } : r
        ));
        
        // Update in Firebase if online, otherwise add to sync queue
        if (isOnline) {
          try {
            await reservationService.updateReservation(showReasonModal.reservationId, updateData);
            console.log('✅ Reserva finalizada no Firebase:', showReasonModal.reservationId);
          } catch (error) {
            console.warn('❌ Erro ao finalizar no Firebase - adicionando à fila de sincronização:', error);
            const updatedReservation = reservations.find(r => r.id === showReasonModal.reservationId);
            if (updatedReservation) {
              offlineStorage.addToSyncQueue('reservations', { ...updatedReservation, ...updateData });
            }
          }
        } else {
          const updatedReservation = reservations.find(r => r.id === showReasonModal.reservationId);
          if (updatedReservation) {
            console.log('📴 Offline - reserva adicionada à fila de sincronização:', updatedReservation.operador);
            offlineStorage.addToSyncQueue('reservations', { ...updatedReservation, ...updateData });
          }
        }
        
        console.log('✅ Reserva finalizada e salva no Firebase:', {
          id: showReasonModal.reservationId,
          coordenadas: `${locationData.latitude}, ${locationData.longitude}`,
          status: 'Finalizado'
        });

        // Update local state if using local ID
        if (showReasonModal.reservationId.startsWith('local_') || !isNaN(Number(showReasonModal.reservationId))) {
          setReservations(prev => prev.map(reservation => 
            reservation.id === showReasonModal.reservationId 
              ? { ...reservation, ...updateData, updatedAt: new Date() }
              : reservation
          ));
        }

        alert('Reserva finalizada com sucesso!');
      }

      setShowReasonModal(null);
      setReasonText('');
    } catch (error) {
      console.error('Erro ao processar reserva:', error);
      alert('Erro ao processar reserva. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAction = () => {
    setShowReasonModal(null);
    setReasonText('');
  };

  // Filter equipment products (assuming equipment are products with certain categories)
  // Use all active products from the Products page
  const equipmentProducts = products.filter(product => 
    product.isActive && product.category.name === 'Ativo'
  );

  // Filter reservations
  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      reservation.operador.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reservation.status_reserva === statusFilter;
    const matchesReservationStatus = !reservationStatusFilter || reservation.status_reserva === reservationStatusFilter;
    
    return matchesSearch && matchesStatus && matchesReservationStatus;
  });

  // Sort reservations (active first, then by date)
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    if (a.status_reserva === 'Ativo' && b.status_reserva !== 'Ativo') return -1;
    if (a.status_reserva !== 'Ativo' && b.status_reserva === 'Ativo') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Obter listas únicas para filtros
  const uniqueReservationStatuses = Array.from(new Set(reservations.map(r => r.status_reserva))).sort();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Ativo':
        return {
          label: 'Ativo',
          variant: 'success' as const,
          icon: Play,
          color: 'text-green-600'
        };
      case 'Finalizado':
        return {
          label: 'Finalizado',
          variant: 'default' as const,
          icon: CheckCircle,
          color: 'text-gray-600'
        };
      default:
        return {
          label: 'Desconhecido',
          variant: 'warning' as const,
          icon: AlertTriangle,
          color: 'text-yellow-600'
        };
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Alto':
        return 'text-green-600 bg-green-100';
      case 'Médio':
        return 'text-yellow-600 bg-yellow-100';
      case 'Baixo':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível':
        return 'text-green-600 bg-green-100';
      case 'Em uso':
        return 'text-blue-600 bg-blue-100';
      case 'Manutenção':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateUsageTime = (startDate: Date, endDate?: Date) => {
    const end = endDate || new Date();
    const totalMinutes = differenceInMinutes(end, startDate);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours < 24) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    
    return `${days} dias`;
  };

  const toggleReservationCollapse = (reservationId: string) => {
    setCollapsedReservations(prev => ({
      ...prev,
      [reservationId]: !prev[reservationId]
    }));
  };

  const toggleReservationExpansion = (reservationId: string) => {
    setExpandedReservations(prev => ({
      ...prev,
      [reservationId]: !prev[reservationId]
    }));
  };

  const handleExportToExcel = () => {
    if (reservations.length === 0) {
      alert('Nenhuma reserva encontrada para exportar.');
      return;
    }

    // Preparar dados para exportação
    const exportData = reservations.map(reservation => {
      const equipment = products.find(p => p.name === reservation.equipamento);
      
      // Extrair coordenadas das observações
      let latitude = '';
      let longitude = '';
      let endereco = '';
      
      if (reservation.observacoes) {
        const coordMatch = reservation.observacoes.match(/Coordenadas:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (coordMatch) {
          latitude = coordMatch[1];
          longitude = coordMatch[2];
        }
        
        const enderecoMatch = reservation.observacoes.match(/Localização:\s*([^\n\r]+)/);
        if (enderecoMatch) {
          endereco = enderecoMatch[1];
        }
      }
      
      return {
        'ID da Reserva': reservation.id,
        'Operador': reservation.operador,
        'Equipamento': reservation.equipamento,
        'SKU do Equipamento': equipment?.sku || 'N/A',
        'Categoria': equipment?.category?.name || 'N/A',
        'Status da Reserva': reservation.status_reserva,
        'Status do Equipamento': reservation.status_equipamento,
        'Data de Início': reservation.data_inicio ? format(reservation.data_inicio, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A',
        'Data de Fim': reservation.data_fim ? format(reservation.data_fim, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A',
        'Tempo de Uso': reservation.data_inicio ? calculateUsageTime(reservation.data_inicio, reservation.data_fim) : 'N/A',
        'Nível de Óleo': reservation.nivel_oleo,
        'Nível de Combustível': reservation.nivel_combustivel,
        'Nível de Poligrama': reservation.nivel_poligrama,
        'Motivo da Reserva': reservation.motivo_reserva || 'N/A',
        'Motivo da Finalização': reservation.motivo_finalizacao || 'N/A',
        'Localização': endereco || 'N/A',
        'Latitude': latitude || 'N/A',
        'Longitude': longitude || 'N/A',
        'Coordenadas': latitude && longitude ? `${latitude}, ${longitude}` : 'N/A',
        'Observações': reservation.observacoes || 'N/A',
        'Data de Criação': safeFormatDate(reservation.createdAt, 'dd/MM/yyyy HH:mm'),
        'Última Atualização': format(reservation.updatedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Armazém do Equipamento': equipment?.location?.warehouse || 'N/A',
        'Corredor': equipment?.location?.aisle || 'N/A',
        'Prateleira': equipment?.location?.shelf || 'N/A',
        'Posição': equipment?.location?.position || 'N/A',
        'Valor do Equipamento': equipment?.purchasePrice ? `R$ ${equipment.purchasePrice.toFixed(2)}` : 'N/A'
      };
    });

    // Adicionar linha de resumo
    const totalReservas = reservations.length;
    const reservasAtivas = reservations.filter(r => r.status_reserva === 'Ativo').length;
    const reservasFinalizadas = reservations.filter(r => r.status_reserva === 'Finalizado').length;
    const equipamentosUnicos = Array.from(new Set(reservations.map(r => r.equipamento))).length;
    const operadoresUnicos = Array.from(new Set(reservations.map(r => r.operador))).length;

    exportData.push({
      'ID da Reserva': '--- RESUMO GERAL ---',
      'Operador': `${operadoresUnicos} operadores únicos`,
      'Equipamento': `${equipamentosUnicos} equipamentos únicos`,
      'SKU do Equipamento': '',
      'Categoria': '',
      'Status da Reserva': `${reservasAtivas} ativas, ${reservasFinalizadas} finalizadas`,
      'Status do Equipamento': '',
      'Data de Início': '',
      'Data de Fim': '',
      'Tempo de Uso': '',
      'Nível de Óleo': '',
      'Nível de Combustível': '',
      'Nível de Poligrama': '',
      'Motivo da Reserva': '',
      'Motivo da Finalização': '',
      'Localização': '',
      'Latitude': '',
      'Longitude': '',
      'Coordenadas': '',
      'Observações': `Total de ${totalReservas} reservas`,
      'Data de Criação': format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Última Atualização': '',
      'Armazém do Equipamento': '',
      'Corredor': '',
      'Prateleira': '',
      'Posição': '',
      'Valor do Equipamento': ''
    });

    // Converter para CSV (compatível com Excel)
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      // Cabeçalho do relatório
      `Relatório de Reservas de Equipamentos`,
      `Total de Reservas: ${totalReservas}`,
      `Reservas Ativas: ${reservasAtivas}`,
      `Reservas Finalizadas: ${reservasFinalizadas}`,
      `Equipamentos Únicos: ${equipamentosUnicos}`,
      `Operadores Únicos: ${operadoresUnicos}`,
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      '', // Linha em branco
      // Cabeçalhos das colunas
      headers.join(','),
      // Dados
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar valores que contêm vírgulas ou aspas
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Criar e baixar arquivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reservas_equipamentos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Exportadas ${totalReservas} reservas para Excel`);
  };

 return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Página Operador – Reserva de Equipamentos</h1>
          <div className="flex items-center space-x-2">
            <Button
            onClick={handleExportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Exportar Excel</span>
          </Button>
          </div>
        </div>
        <p className="text-gray-600 text-lg">
          Gerencie reservas e status dos equipamentos
        </p>
      </div>

      {/* Equipment Heat Map */}
      <EquipmentHeatMap 
        products={products} 
        reservations={reservations} 
      />

      {/* Equipment Status Filter */}
      <div className="hidden flex items-center justify-center space-x-4 p-4 bg-white rounded-lg border border-purple-200">
        <button
          onClick={() => setStatusFilter('available')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            statusFilter === 'available'
              ? 'bg-green-100 text-green-800 border-2 border-green-300 shadow-md'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-green-50 hover:text-green-700'
          }`}
        >
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">Equipamentos Disponíveis</span>
        </button>
        
        <button
          onClick={() => setStatusFilter('in_use')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            statusFilter === 'in_use'
              ? 'bg-red-100 text-red-800 border-2 border-red-300 shadow-md'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-red-50 hover:text-red-700'
          }`}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm font-medium">Equipamentos Em Uso</span>
        </button>
        
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            statusFilter === 'all'
              ? 'bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-md'
              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-700'
          }`}
        >
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium">Todos os Equipamentos</span>
        </button>
      </div>

      {/* Summary Statistics */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-purple-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Resumo das Reservas
            </h3>
            <button
              onClick={() => toggleCardCollapse('summary-card')}
              className="p-1 hover:bg-purple-100 rounded transition-colors"
              title={collapsedCards['summary-card'] ? 'Expandir resumo' : 'Recolher resumo'}
            >
              {collapsedCards['summary-card'] ? (
                <ChevronDown className="w-4 h-4 text-purple-600" />
              ) : (
                <ChevronUp className="w-4 h-4 text-purple-600" />
              )}
            </button>
          </div>
        </CardHeader>
        {!collapsedCards['summary-card'] && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total de Reservas */}
            <div className="text-center p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {reservations.length}
              </div>
              <div className="text-sm text-blue-700 font-medium">Total de Reservas</div>
              <div className="text-xs text-gray-500 mt-1">
                Todas as reservas registradas
              </div>
            </div>

            {/* Reservas Ativas */}
            <div className="text-center p-4 bg-white rounded-lg border border-green-200 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {reservations.filter(r => r.status_reserva === 'Ativo').length}
              </div>
              <div className="text-sm text-green-700 font-medium">Reservas Ativas</div>
              <div className="text-xs text-gray-500 mt-1">
                Equipamentos em uso
              </div>
            </div>

            {/* Reservas Finalizadas */}
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-gray-600 mb-2">
                {reservations.filter(r => r.status_reserva === 'Finalizado').length}
              </div>
              <div className="text-sm text-gray-700 font-medium">Reservas Finalizadas</div>
              <div className="text-xs text-gray-500 mt-1">
                Equipamentos devolvidos
              </div>
            </div>

            {/* Operadores Únicos */}
            <div className="text-center p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Array.from(new Set(reservations.map(r => r.operador))).length}
              </div>
              <div className="text-sm text-purple-700 font-medium">Operadores Únicos</div>
              <div className="text-xs text-gray-500 mt-1">
                Usuários que fizeram reservas
              </div>
            </div>
          </div>

          {/* Estatísticas Adicionais */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Equipamentos Mais Usados
              </h4>
              <div className="space-y-2">
                {(() => {
                  const equipmentUsage = reservations.reduce((acc, reservation) => {
                    acc[reservation.equipamento] = (acc[reservation.equipamento] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(equipmentUsage)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([equipment, count]) => (
                      <div key={equipment} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{equipment}</span>
                        <Badge variant="info" size="sm">{count}x</Badge>
                      </div>
                    ));
                })()}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Operadores Mais Ativos
              </h4>
              <div className="space-y-2">
                {(() => {
                  const operatorUsage = reservations.reduce((acc, reservation) => {
                    acc[reservation.operador] = (acc[reservation.operador] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(operatorUsage)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([operator, count]) => (
                      <div key={operator} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{operator}</span>
                        <Badge variant="success" size="sm">{count}x</Badge>
                      </div>
                    ));
                })()}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Tempo Médio de Uso
              </h4>
              <div className="space-y-2">
                {(() => {
                  const finalizadas = reservations.filter(r => 
                    r.status_reserva === 'Finalizado' && 
                    r.data_inicio && 
                    r.data_fim
                  );
                  
                  if (finalizadas.length === 0) {
                    return (
                      <div className="text-sm text-gray-500 text-center py-2">
                        Nenhuma reserva finalizada
                      </div>
                    );
                  }
                  
                  const totalMinutes = finalizadas.reduce((sum, reservation) => {
                    const startDate = new Date(reservation.data_inicio);
                    const endDate = reservation.data_fim ? new Date(reservation.data_fim) : new Date();
                    
                    // Validate dates before calculating difference
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                      return sum;
                    }
                    
                    try {
                      return sum + differenceInMinutes(endDate, startDate);
                    } catch (error) {
                      console.warn('Erro ao calcular diferença de tempo:', error);
                      return sum;
                    }
                  }, 0);
                  
                  const avgMinutes = Math.round(totalMinutes / finalizadas.length);
                  const avgHours = Math.floor(avgMinutes / 60);
                  const remainingMinutes = avgMinutes % 60;
                  
                  return (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {avgHours > 0 ? `${avgHours}h ${remainingMinutes}min` : `${avgMinutes}min`}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Baseado em {finalizadas.length} reservas
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reservation Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Package className="w-6 h-6 mr-3" />
                  Formulário de Reserva
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFormCollapsed(!isFormCollapsed)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isFormCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {!isFormCollapsed && (
              <CardContent className="space-y-6">
              {/* Operator Name */}
              <Input
                label="Operador - Solicitante"
                name="operador"
                value={formData.operador}
                onChange={handleInputChange}
                placeholder="Nome do usuário logado"
                disabled={true}
                icon={<User className="w-4 h-4" />}
              />

              {/* Equipment Selection using SingleProductSelector */}
              <div className="space-y-4">
                <SingleProductSelector
                  products={equipmentProducts}
                  selectedProduct={selectedEquipment}
                  onSelect={setSelectedEquipment}
                  onClear={() => setSelectedEquipment(null)}
                />
              </div>

              {/* Levels Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível do Óleo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="nivel_oleo"
                      value={formData.nivel_oleo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Baixo, Médio, Alto, 50%, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível do Combustível
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="nivel_combustivel"
                      value={formData.nivel_combustivel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Baixo, Médio, Alto, 75%, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível do Poligrama
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      name="nivel_poligrama"
                      value={formData.nivel_poligrama}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Baixo, Médio, Alto, 80%, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Equipment Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Status do Equipamento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Settings className="w-4 h-4" />
                  </div>
                  <select
                    name="status_equipamento"
                    value={formData.status_equipamento}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Em uso">Em uso</option>
                    <option value="Disponível">Disponível</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <div className="relative">
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observações sobre o equipamento, condições de uso, etc..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                <Button
                  onClick={handleStartReservation}
                  disabled={!selectedEquipment || submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Play className="w-6 h-6 mr-3" />
                  Iniciar Reserva
                </Button>

                <Button
                  onClick={() => {
                    const activeReservation = reservations.find(r => 
                      r.status_reserva === 'Ativo' && 
                      r.operador === formData.operador &&
                      r.equipamento === selectedEquipment?.name
                    );
                    
                    if (activeReservation) {
                      handleFinishReservation(activeReservation.id);
                    } else {
                      alert('Nenhuma reserva ativa encontrada para este equipamento e operador.');
                    }
                  }}
                  disabled={submitting}
                  variant="danger"
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <Square className="w-6 h-6 mr-3" />
                  Finalizar Reserva
                </Button>
              </div>
            </CardContent>
            )}
          </Card>
        </div>

        {/* Reservations List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Clock className="w-6 h-6 mr-3" />
                  Reservas Recentes
                </h2>
                <div className="flex items-center space-x-3">
                  <Badge variant="info" size="md">
                    {reservations.length} reservas
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReservationsCollapsed(!isReservationsCollapsed)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isReservationsCollapsed ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {!isReservationsCollapsed && (
              <CardContent>
              {/* Filters */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 flex items-center">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="flex items-center space-x-1"
                    >
                      {filtersExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span>{filtersExpanded ? 'Recolher' : 'Expandir'}</span>
                    </Button>
                  </div>
                  
                  {filtersExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Buscar por operador ou equipamento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      icon={<Search className="w-4 h-4" />}
                    />
                    
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todos os status</option>
                      <option value="Ativo">Ativos</option>
                      <option value="Finalizado">Finalizados</option>
                    </select>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status da Reserva
                      </label>
                      <select
                        value={reservationStatusFilter}
                        onChange={(e) => setReservationStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os status</option>
                        {uniqueReservationStatuses.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Reservations List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : sortedReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma reserva encontrada</p>
                  </div>
                ) : (
                  sortedReservations.map((reservation) => {
                    const statusInfo = getStatusInfo(reservation.status_reserva);
                    const isExpanded = expandedReservations[reservation.id];
                    return (
                      <Card key={reservation.id} className={`border-l-4 border-l-blue-500 transition-all duration-200 ${
                        isExpanded ? 'shadow-lg' : 'hover:shadow-md'
                      }`}>
                        <CardContent className="p-4 cursor-pointer" onClick={() => toggleReservationExpansion(reservation.id)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {(() => {
                                  const equipment = products.find(p => p.name === reservation.equipamento);
                                  return (
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {equipment?.images[0] ? (
                                          <img
                                            src={equipment.images[0]}
                                            alt={equipment.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-4 h-4 text-gray-400" />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">
                                          {reservation.equipamento}
                                        </h3>
                                        {equipment?.sku && (
                                          <p className="text-xs text-gray-500">
                                            SKU: {equipment.sku}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div className="flex items-center space-x-2">
                                  <Badge variant={reservation.status_reserva === 'Ativo' ? 'warning' : 'success'} size="sm">
                                    <statusInfo.icon className="w-3 h-3 mr-1" />
                                    {reservation.status_reserva === 'Ativo' ? 'Em Uso' : 'Disponível'}
                                  </Badge>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCardCollapse(reservation.id);
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title={collapsedCards[reservation.id] ? 'Expandir detalhes' : 'Recolher detalhes'}
                                  >
                                    {collapsedCards[reservation.id] ? (
                                      <ChevronDown className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <ChevronUp className="w-4 h-4 text-gray-500" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                <User className="w-4 h-4" />
                                <span>{reservation.operador}</span>
                              </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleReservationExpansion(reservation.id);
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                              <div>
                                <span className="text-blue-600 text-xs block">Tempo de Uso</span>
                                <span className="font-semibold text-blue-900">
                                  {calculateUsageTime(reservation.data_inicio || reservation.createdAt, reservation.data_fim)}
                                </span>
                              </div>
                            </div>
                            {reservation.status_reserva === 'Ativo' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFinishReservation(reservation.id);
                                }}
                              >
                                <Square className="w-3 h-3" />
                              </Button>
                            )}
                            <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                              <div>
                                <span className="text-green-600 text-xs block">Data/Hora Início</span>
                                <span className="text-green-900 font-medium">
                                  {format(reservation.data_inicio || reservation.createdAt, 'dd/MM/yyyy HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Localização */}
                          <div className="p-3 bg-purple-50 rounded border border-purple-200">
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-purple-600 text-xs font-medium block mb-1">Localização</span>
                                <span className="text-purple-900 text-sm">
                                  {reservation.observacoes || 'Localização não especificada'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Data de finalização (se aplicável) */}
                          {reservation.status_reserva === 'Finalizado' && reservation.data_fim && (
                            <div className="p-2 bg-red-50 rounded border border-red-200">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-red-600" />
                                <div>
                                  <span className="text-red-600 text-xs block">Finalizado em</span>
                                  <span className="text-red-900 font-medium">
                                    {format(reservation.data_fim, 'dd/MM/yyyy HH:mm')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Motivo da finalização */}
                          {reservation.motivo_finalizacao && (
                            <div className="p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="flex items-start space-x-2">
                                <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                                <div>
                                  <span className="text-gray-600 text-xs block">Motivo da Finalização</span>
                                  <span className="text-gray-900 text-sm">
                                    {reservation.motivo_finalizacao}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                            </div>
                          </div>

                          {/* Informações detalhadas - Mostrar apenas quando expandido */}
                          {isExpanded && (
                            <div className="space-y-3 text-sm border-t border-gray-100 pt-3 mt-3">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                  <span className="text-xs text-gray-500">Óleo</span>
                                  <div className="mt-1">
                                    <Badge 
                                      variant={
                                        reservation.nivel_oleo === 'Alto' ? 'success' :
                                        reservation.nivel_oleo === 'Médio' ? 'warning' : 'danger'
                                      }
                                      size="sm"
                                    >
                                      {reservation.nivel_oleo}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-xs text-gray-500">Combustível</span>
                                  <div className="mt-1">
                                    <Badge 
                                      variant={
                                        reservation.nivel_combustivel === 'Alto' ? 'success' :
                                        reservation.nivel_combustivel === 'Médio' ? 'warning' : 'danger'
                                      }
                                      size="sm"
                                    >
                                      {reservation.nivel_combustivel}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-xs text-gray-500">Poligrama</span>
                                  <div className="mt-1">
                                    <Badge 
                                      variant={
                                        reservation.nivel_poligrama === 'Alto' ? 'success' :
                                        reservation.nivel_poligrama === 'Médio' ? 'warning' : 'danger'
                                      }
                                      size="sm"
                                    >
                                      {reservation.nivel_poligrama}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-600">Status do Equipamento:</span>
                                  <Badge 
                                    variant={
                                      reservation.status_equipamento === 'Disponível' ? 'success' :
                                      reservation.status_equipamento === 'Em uso' ? 'warning' : 'danger'
                                    }
                                    size="sm"
                                  >
                                    {reservation.status_equipamento}
                                  </Badge>
                                </div>

                                <div>
                                  <span className="text-xs text-gray-600 font-medium">Tempo de Uso:</span>
                                  <p className="text-sm text-gray-900 font-semibold">
                                    {(() => {
                                      const startTime = reservation.data_inicio || reservation.createdAt;
                                      const endTime = reservation.status_reserva === 'Finalizado' && reservation.data_fim 
                                        ? reservation.data_fim 
                                        : new Date();
                                      
                                      const diffInMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                                      
                                      if (diffInMinutes < 60) {
                                        return `${diffInMinutes} min`;
                                      } else if (diffInMinutes < 1440) { // Less than 24 hours
                                        const hours = Math.floor(diffInMinutes / 60);
                                        const minutes = diffInMinutes % 60;
                                        return `${hours}h ${minutes}min`;
                                      } else {
                                        const days = Math.floor(diffInMinutes / 1440);
                                        const hours = Math.floor((diffInMinutes % 1440) / 60);
                                        return `${days}d ${hours}h`;
                                      }
                                    })()}
                                  </p>
                                </div>

                                {reservation.data_inicio && (
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">Iniciado:</span>
                                    <span className="text-gray-900">
                                      {format(reservation.data_inicio, 'dd/MM/yyyy HH:mm')}
                                    </span>
                                  </div>
                                )}

                                {reservation.data_fim && (
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-600">Finalizado:</span>
                                    <span className="text-gray-900">
                                      {format(reservation.data_fim, 'dd/MM/yyyy HH:mm')}
                                    </span>
                                  </div>
                                )}

                                {reservation.observacoes && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-500 font-medium">Observações:</span>
                                    <p className="text-gray-700 mt-1">{reservation.observacoes}</p>
                                  </div>
                                )}

                                {reservation.motivo_reserva && (
                                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                    <span className="text-xs text-blue-600 font-medium">Motivo da Reserva:</span>
                                    <p className="text-blue-800 mt-1">{reservation.motivo_reserva}</p>
                                  </div>
                                )}

                                {reservation.motivo_finalizacao && (
                                  <div className="mt-2 p-3 bg-green-50 rounded-lg">
                                    <span className="text-xs text-green-600 font-medium">Motivo da Finalização:</span>
                                    <p className="text-green-800 mt-1">{reservation.motivo_finalizacao}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                {showReasonModal.type === 'start' ? 'Motivo da Reserva' : 'Motivo da Finalização'}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {showReasonModal.type === 'start' 
                    ? 'Por que você está reservando este equipamento?' 
                    : 'Por que você está finalizando esta reserva?'
                  }
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={showReasonModal.type === 'start' 
                    ? 'Ex: Necessário para obra X, manutenção preventiva, etc...' 
                    : 'Ex: Trabalho concluído, equipamento retornado ao depósito, etc...'
                  }
                  autoFocus
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleConfirmAction}
                  loading={submitting}
                  disabled={!reasonText.trim() || submitting}
                  className={`flex-1 ${
                    showReasonModal.type === 'start' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {showReasonModal.type === 'start' ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Confirmar Reserva
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Finalização
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleCancelAction}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
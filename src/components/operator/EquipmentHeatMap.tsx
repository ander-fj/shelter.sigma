import { useState, useEffect, useRef } from 'react';
import { Product, EquipmentReservation } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  Package, 
  User, 
  Calendar, 
  Clock, 
  Settings, 
  CheckCircle, 
  Play, 
  Square,
  X,
  Eye,
  Fuel,
  Droplets,
  Activity,
  FileText
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userService } from '../../services/userService';

// Helper function to safely format dates
const safeFormatDate = (date: Date | string | null | undefined, formatString: string = 'dd/MM/yyyy HH:mm') => {
  try {
    if (!date) return 'Data não informada';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Data Inválida';
    }
    return format(dateObj, formatString, { locale: ptBR });
  } catch (error) {
    return 'Data Inválida';
  }
};

interface EquipmentHeatMapProps {
  products: Product[];
  reservations: EquipmentReservation[];
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  equipments: {
    product: Product;
    reservation?: EquipmentReservation;
    status: 'available' | 'in_use' | 'maintenance';
  }[];
}

export function EquipmentHeatMap({ products, reservations }: EquipmentHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [selectedEquipment, setSelectedEquipment] = useState<{
    product: Product;
    reservation?: EquipmentReservation;
  } | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isGoogleMapsScriptLoaded, setIsGoogleMapsScriptLoaded] = useState(false);
  const [mapFilter, setMapFilter] = useState<'all' | 'available' | 'in_use'>('all');

  // Carregar dados dos usuários
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        const avatarsMap: Record<string, string> = {};
        
        users.forEach(user => {
          namesMap[user.id] = user.name;
          namesMap[user.email] = user.name;
          if (user.avatar) {
            avatarsMap[user.id] = user.avatar;
            avatarsMap[user.email] = user.avatar;
          }
        });
        
        setUserNames(namesMap);
        setUserAvatars(avatarsMap);
      } catch (error) {
        console.error('Erro ao carregar dados dos usuários:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Verificar permissão de geolocalização
  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(permission.state);
          
          permission.addEventListener('change', () => {
            setLocationPermission(permission.state);
          });
        } else {
          setLocationPermission('prompt');
        }
      } catch (error) {
        console.error('Erro ao verificar permissão de localização:', error);
        setLocationPermission('prompt');
      }
    };
    
    checkLocationPermission();
  }, []);

  // Obter localização do usuário
  useEffect(() => {
    const getUserLocation = () => {
      setIsLoadingLocation(true);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            setLocationError(null);
            setIsLoadingLocation(false);
            console.log('Localização obtida:', { latitude, longitude });
          },
          (error) => {
            console.error('Erro ao obter localização:', error);
            setLocationError(error.message);
            // Usar localização padrão (São Paulo)
            setUserLocation({ lat: -23.5505, lng: -46.6333 });
            setIsLoadingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          }
        );
      } else {
        setLocationError('Geolocalização não suportada');
        setUserLocation({ lat: -23.5505, lng: -46.6333 });
        setIsLoadingLocation(false);
      }
    };

    getUserLocation();
  }, []);

  // Carregar Google Maps API apenas uma vez
  useEffect(() => {
    // Verificar se o script já foi carregado
    if (window.google && window.google.maps) {
      setIsGoogleMapsScriptLoaded(true);
      return;
    }

    // Verificar se já existe um script do Google Maps no documento
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Se o script existe mas ainda não carregou, aguardar o carregamento
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          setIsGoogleMapsScriptLoaded(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBldEbTtsLMCV6DR0C4a2KZyyM4xn0rf9U&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Verificar se o objeto google.maps está realmente disponível
      if (window.google && window.google.maps) {
        setIsGoogleMapsScriptLoaded(true);
      } else {
        console.error('Google Maps API carregada mas objeto google.maps não disponível');
      }
    };
    script.onerror = () => {
      console.error('Erro ao carregar Google Maps API');
    };
    document.head.appendChild(script);
  }, []);

  // Função para obter nome do usuário
  const getUserName = (userId: string): string => {
    // Log para debug
    console.log('Buscando nome para userId:', userId);
    console.log('UserNames disponíveis:', userNames);
    
    if (userNames[userId]) {
      return userNames[userId];
    }
    
    // Tentar buscar por email também
    const userByEmail = Object.keys(userNames).find(key => 
      key.toLowerCase() === userId.toLowerCase()
    );
    if (userByEmail && userNames[userByEmail]) {
      return userNames[userByEmail];
    }
    
    const fallbackNames: Record<string, string> = {
      '1': 'Admin Master',
      '2': 'Maria Silva',
      '3': 'João Santos',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos',
      'Anderson.jatai': 'Anderson Jataí',
      'anderson.jatai': 'Anderson Jataí',
      'Anderson Jatai': 'Anderson Jataí',
      'anderson jatai': 'Anderson Jataí'
    };
    
    // Buscar no fallback com case insensitive
    const fallbackKey = Object.keys(fallbackNames).find(key => 
      key.toLowerCase() === userId.toLowerCase()
    );
    
    if (fallbackKey) {
      return fallbackNames[fallbackKey];
    }
    
    // Se não encontrar, tentar extrair nome das observações da reserva
    const reservation = reservations.find(r => r.operador === userId);
    if (reservation && reservation.observacoes) {
      const operatorMatch = reservation.observacoes.match(/Operador:\s*([^\n\r]+)/);
      if (operatorMatch) {
        return operatorMatch[1].trim();
      }
    }
    
    return userId; // Retornar o próprio userId se não encontrar nome
  };

  // Função para obter avatar do usuário
  const getUserAvatar = (userId: string): string | null => {
    return userAvatars[userId] || null;
  };

  // Processar dados de localização dos equipamentos
  const processEquipmentLocations = (): LocationData[] => {
    console.log('Processando localizações dos equipamentos...');
    console.log('Produtos disponíveis:', products.length);
    console.log('Reservas disponíveis:', reservations.length);
    
    // Filtrar apenas produtos da categoria "Ativo" (equipamentos)
    const equipmentProducts = products.filter(product => 
      product.isActive && product.category.name === 'Ativo'
    );
    
    console.log('Equipamentos encontrados:', equipmentProducts.length);
    console.log('Lista de equipamentos:', equipmentProducts.map(p => ({ name: p.name, sku: p.sku })));
    console.log('Lista de reservas:', reservations.map(r => ({ 
      id: r.id, 
      equipamento: r.equipamento, 
      operador: r.operador, 
      status: r.status_reserva 
    })));
    
    // Simular localizações baseadas nos equipamentos
    const locations: LocationData[] = [];
    
    equipmentProducts.forEach((product, index) => {
      // Buscar TODAS as reservas para este equipamento (ativas e finalizadas)
      const equipmentReservations = reservations.filter(r => {
        const equipmentMatch = r.equipamento === product.name || 
                              r.equipamento === product.sku ||
                              product.name.includes(r.equipamento) ||
                              r.equipamento.includes(product.name);
        return equipmentMatch;
      });
      
      // Ordenar reservas por data (mais recente primeiro) para pegar as últimas coordenadas
      const sortedReservations = equipmentReservations.sort((a, b) => {
        const dateA = a.data_fim || a.data_inicio || a.createdAt;
        const dateB = b.data_fim || b.data_inicio || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      // Pegar a reserva mais recente (que pode estar ativa ou finalizada)
      const latestReservation = sortedReservations[0];
      
      // Verificar se há reserva ativa para determinar status
      const activeReservation = reservations.find(r => {
        const isActive = r.status_reserva === 'Ativo';
        const equipmentMatch = r.equipamento === product.name || 
                              r.equipamento === product.sku ||
                              product.name.includes(r.equipamento) ||
                              r.equipamento.includes(product.name);
        
        return isActive && equipmentMatch;
      });
      
      console.log(`Verificando reservas para ${product.name}:`, {
        totalReservas: equipmentReservations.length,
        reservaAtiva: activeReservation ? 'Sim' : 'Não',
        ultimaReserva: latestReservation ? latestReservation.id : 'Nenhuma'
      });
      
      // Extrair coordenadas das observações da reserva mais recente (ativa ou finalizada)
      let latitude: number;
      let longitude: number;
      let coordenadasEncontradas = false;
      
      if (latestReservation && latestReservation.observacoes) {
        console.log(`🔍 Analisando observações da reserva mais recente ${latestReservation.id}:`, latestReservation.observacoes);
        
        // Procurar por coordenadas em diferentes formatos
        const patterns = [
          // Padrão mais específico primeiro
          /Coordenadas:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/i,
          // Padrão com 6 casas decimais
          /(-?\d+\.\d{6}),\s*(-?\d+\.\d{6})/g,
          // Padrões alternativos
          /lat:\s*(-?\d+\.\d+).*lng:\s*(-?\d+\.\d+)/i,
          /latitude:\s*(-?\d+\.\d+).*longitude:\s*(-?\d+\.\d+)/i,
          // Busca em blocos de dados
          /--- Dados da (?:Reserva|Finalização) ---[\s\S]*?Coordenadas:\s*(-?\d+\.\d{6}),\s*(-?\d+\.\d{6})/i
        ];
        
        let coordMatch = null;
        for (const pattern of patterns) {
          coordMatch = latestReservation.observacoes.match(pattern);
          if (coordMatch) {
            console.log(`✅ Padrão encontrado:`, pattern.toString(), 'Match:', coordMatch);
            break;
          }
        }
        
        if (coordMatch) {
          latitude = parseFloat(coordMatch[1]);
          longitude = parseFloat(coordMatch[2]);
          
          // Validar se as coordenadas são válidas
          if (isNaN(latitude) || isNaN(longitude) || 
              latitude < -90 || latitude > 90 || 
              longitude < -180 || longitude > 180) {
            console.warn(`❌ Coordenadas inválidas extraídas: ${latitude}, ${longitude}`);
            coordenadasEncontradas = false;
          } else {
            coordenadasEncontradas = true;
            console.log(`✅ Coordenadas válidas extraídas da reserva ${latestReservation.id}:`, { 
              latitude, 
              longitude,
              endereco: latestReservation.observacoes.match(/Localização:\s*([^\n\r]+)/)?.[1] || 'Endereço não encontrado',
              equipamento: product.name,
              tipoReserva: latestReservation.status_reserva,
              dataReserva: latestReservation.data_inicio || latestReservation.createdAt
            });
          }
        }
      }
      
      if (!coordenadasEncontradas) {
        // Coordenadas específicas conhecidas para equipamentos (fallback)
        const knownEquipmentCoordinates: Record<string, { lat: number; lng: number }> = {
          'parafuso': { lat: -23.963238, lng: -46.376550 },
          'escavadeira': { lat: -23.972684, lng: -46.370445 },
          'trilho': { lat: -23.972684, lng: -46.370445 },
          // Adicionar mais equipamentos conforme necessário
        };
        
        // Verificar se o equipamento tem coordenadas conhecidas
        const equipmentKey = product.name.toLowerCase();
        const knownCoords = Object.keys(knownEquipmentCoordinates).find(key => 
          equipmentKey.includes(key)
        );
        
        if (knownCoords) {
          latitude = knownEquipmentCoordinates[knownCoords].lat;
          longitude = knownEquipmentCoordinates[knownCoords].lng;
          coordenadasEncontradas = true;
          console.log(`🗺️ Coordenadas conhecidas usadas para ${product.name}:`, { latitude, longitude });
        }
      }
      
      if (!coordenadasEncontradas) {
        // Se não encontrar coordenadas na reserva, usar localização padrão com offset
        const baseLocation = userLocation || { lat: -23.5505, lng: -46.6333 };
        const offsetLat = (Math.random() - 0.5) * 0.01;
        const offsetLng = (Math.random() - 0.5) * 0.01;
        latitude = baseLocation.lat + offsetLat;
        longitude = baseLocation.lng + offsetLng;
        console.log(`🎲 Coordenadas geradas para ${product.name}:`, { latitude, longitude });
      }
      
      // Status baseado na reserva ativa (não na mais recente)
      const status = activeReservation ? 'in_use' : 'available';
      
      console.log(`📍 Equipamento: ${product.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Reserva Ativa: ${activeReservation?.id || 'Nenhuma'}`);
      console.log(`   Última Reserva: ${latestReservation?.id || 'Nenhuma'}`);
      console.log(`   Coordenadas: ${latitude}, ${longitude}`);
      console.log(`   Fonte: ${coordenadasEncontradas ? (latestReservation ? '✅ Extraídas da última reserva' : '🗺️ Coordenadas conhecidas') : '🎲 Geradas automaticamente'}`);
      
      locations.push({
        latitude,
        longitude,
        address: `${product.location.warehouse} - ${product.location.aisle}${product.location.shelf}`,
        equipments: [{
          product,
          reservation: activeReservation, // Usar reserva ativa para status, mas coordenadas da mais recente
          status
        }]
      });
    });
    
    console.log('Localizações processadas:', locations.length);
    console.log('📊 Resumo final das localizações:');
    console.log(`   Total de equipamentos: ${locations.length}`);
    console.log(`   Equipamentos em uso: ${locations.filter(l => l.equipments.some(e => e.status === 'in_use')).length}`);
    console.log(`   Coordenadas extraídas das reservas: ${locations.filter(l => {
      // Verificar se as coordenadas vieram de uma reserva real
      const equipment = l.equipments[0];
      if (!equipment) return false;
      
      // Buscar a reserva mais recente para este equipamento
      const equipmentReservations = reservations.filter(r => {
        const equipmentMatch = r.equipamento === equipment.product.name || 
                              r.equipamento === equipment.product.sku ||
                              equipment.product.name.includes(r.equipamento) ||
                              r.equipamento.includes(equipment.product.name);
        return equipmentMatch;
      });
      
      const latestReservation = equipmentReservations.sort((a, b) => {
        const dateA = a.data_fim || a.data_inicio || a.createdAt;
        const dateB = b.data_fim || b.data_inicio || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })[0];
      
      return latestReservation && latestReservation.observacoes && latestReservation.observacoes.includes('Coordenadas:');
    }).length}`);
    console.log(`   Coordenadas conhecidas: ${locations.filter(l => {
      const equipment = l.equipments[0];
      if (!equipment) return false;
      
      const equipmentKey = equipment.product.name.toLowerCase();
      const knownEquipmentCoordinates = ['parafuso', 'escavadeira', 'trilho'];
      return knownEquipmentCoordinates.some(key => equipmentKey.includes(key));
    }).length}`);
    console.log(`   Coordenadas geradas automaticamente: ${locations.length - locations.filter(l => {
      const equipment = l.equipments[0];
      if (!equipment) return false;
      
      // Verificar se tem reserva com coordenadas
      const equipmentReservations = reservations.filter(r => {
        const equipmentMatch = r.equipamento === equipment.product.name || 
                              r.equipamento === equipment.product.sku ||
                              equipment.product.name.includes(r.equipamento) ||
                              r.equipamento.includes(equipment.product.name);
        return equipmentMatch;
      });
      
      const hasReservationWithCoords = equipmentReservations.some(r => 
        r.observacoes && r.observacoes.includes('Coordenadas:')
      );
      
      // Verificar se tem coordenadas conhecidas
      const equipmentKey = equipment.product.name.toLowerCase();
      const knownEquipmentCoordinates = ['parafuso', 'escavadeira', 'trilho'];
      const hasKnownCoords = knownEquipmentCoordinates.some(key => equipmentKey.includes(key));
      
      return hasReservationWithCoords || hasKnownCoords;
    }).length}`);
    
    return locations;
  };

  // Inicializar Google Maps
  useEffect(() => {
    if (!userLocation || !mapRef.current || !isGoogleMapsScriptLoaded || !window.google || !window.google.maps) return;

    const initializeMap = () => {
      // Verificação adicional para garantir que google.maps está disponível
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API não está disponível');
        return;
      }
      
      console.log('Inicializando Google Maps...');
      
      const mapOptions: window.google.maps.MapOptions = {
        center: userLocation,
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      const googleMap = new window.google.maps.Map(mapRef.current!, mapOptions);
      setMap(googleMap);

      // Adicionar marcador da localização do usuário
      new window.google.maps.Marker({
        position: userLocation,
        map: googleMap,
        title: 'Sua Localização',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="3"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 16)
        }
      });

      // Processar e adicionar marcadores dos equipamentos
      const locations = processEquipmentLocations();
      console.log('Adicionando marcadores para', locations.length, 'localizações');

      // Filtrar localizações baseado no filtro selecionado
      const filteredLocations = locations.filter(location => {
        if (mapFilter === 'all') return true;
        
        const hasActiveReservation = location.equipments.some(eq => eq.status === 'in_use');
        
        if (mapFilter === 'available') return !hasActiveReservation;
        if (mapFilter === 'in_use') return hasActiveReservation;
        
        return true;
      });

      filteredLocations.forEach((location, index) => {
        const hasActiveReservation = location.equipments.some(eq => eq.status === 'in_use');
        const equipment = location.equipments[0]; // Pegar o primeiro equipamento da localização
        const productImage = equipment.product?.images[0];
        const markerColor = hasActiveReservation ? '#EF4444' : '#10B981';
        
        console.log(`Marcador ${index + 1}: ${location.equipments[0].product.name}, Cor: ${markerColor}`);

        // Criar marcador com imagem do produto
        let markerIcon;
        
        if (productImage) {
          // Criar marcador SVG arredondado com imagem do produto
          const svgMarker = `
            <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <clipPath id="roundedClip">
                  <circle cx="18" cy="18" r="15"/>
                </clipPath>
              </defs>
              <circle cx="18" cy="18" r="17" fill="${markerColor}" stroke="white" stroke-width="2"/>
              <image href="${productImage}" x="3" y="3" width="30" height="30" clip-path="url(#roundedClip)" preserveAspectRatio="xMidYMid slice"/>
            </svg>
          `;
          
          markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarker),
            scaledSize: new window.google.maps.Size(36, 36),
            anchor: new window.google.maps.Point(18, 18),
            optimized: false
          };
        } else {
          // Fallback para marcador padrão se não houver imagem
          markerIcon = {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="12" fill="${markerColor}" stroke="white" stroke-width="2"/>
                <circle cx="15" cy="15" r="7" fill="white"/>
                <text x="15" y="18" text-anchor="middle" fill="${markerColor}" font-size="6" font-weight="bold">📦</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(30, 30),
            anchor: new window.google.maps.Point(15, 15)
          };
        }

        const marker = new window.google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: googleMap,
          title: equipment.product?.name || 'Equipamento',
          icon: markerIcon
        });

        // Criar conteúdo do InfoWindow
        const createInfoWindowContent = () => {
          const equipmentsHtml = location.equipments.map(equipment => {
            const { product, reservation, status } = equipment;
            const statusColor = status === 'in_use' ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200';
            const statusText = status === 'in_use' ? 'Em Uso' : 'Disponível';
            const statusIcon = status === 'in_use' ? '🔴' : '🟢';
            
            let operatorInfo = '';
            if (reservation && status === 'in_use') {
              const operatorName = getUserName(reservation.operador);
              const operatorAvatar = getUserAvatar(reservation.operador);
              const startTime = reservation.data_inicio ? safeFormatDate(reservation.data_inicio) : 'N/A';
              const usageTime = reservation.data_inicio ? 
                `${differenceInMinutes(new Date(), reservation.data_inicio)} min` : 'N/A';
              
              operatorInfo = `
                <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div class="flex items-center space-x-2 mb-2">
                    ${operatorAvatar ? 
                      `<img src="${operatorAvatar}" alt="${operatorName}" class="w-6 h-6 rounded-full object-cover border border-blue-300">` :
                      `<div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center border border-blue-300">
                        <span class="text-xs text-blue-600">👤</span>
                      </div>`
                    }
                    <span class="text-sm font-medium text-blue-900">${operatorName}</span>
                  </div>
                  <div class="text-xs text-blue-700 space-y-1">
                    <div>📅 Início: ${startTime}</div>
                    <div>⏱️ Tempo: ${usageTime}</div>
                    ${reservation.motivo_reserva ? `<div>📝 Motivo: ${reservation.motivo_reserva}</div>` : ''}
                  </div>
                  <div class="mt-2 flex space-x-2">
                    <span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Óleo: ${reservation.nivel_oleo}</span>
                    <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Combustível: ${reservation.nivel_combustivel}</span>
                  </div>
                </div>
              `;
            }

            return `
              <div class="border ${statusColor} rounded-lg p-3 mb-3 last:mb-0">
                <div class="flex items-start space-x-3">
                  <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                       onclick="window.showEquipmentDetails('${product.id}')">
                    ${product.images[0] ? 
                      `<img src="${product.images[0]}" alt="${product.name}" class="w-full h-full object-cover">` :
                      `<div class="w-full h-full flex items-center justify-center">
                        <span class="text-gray-400 text-2xl">📦</span>
                      </div>`
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <h4 class="font-semibold text-gray-900 text-sm truncate">${product.name}</h4>
                      <span class="text-lg">${statusIcon}</span>
                    </div>
                    <div class="text-xs text-gray-600 space-y-1">
                      <div>SKU: ${product.sku}</div>
                      <div>📍 ${product.location.warehouse} - ${product.location.aisle}${product.location.shelf}</div>
                    </div>
                    <div class="mt-2">
                      <span class="px-2 py-1 text-xs ${statusColor} rounded-full font-medium">
                        ${statusText}
                      </span>
                    </div>
                  </div>
                </div>
                ${operatorInfo}
                <div class="mt-2 text-center">
                  <button onclick="window.showEquipmentDetails('${product.id}')" 
                          class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    👁️ Visualizar Detalhes
                  </button>
                </div>
              </div>
            `;
          }).join('');

          // Determinar o título baseado no status e usuário
          const getTitleWithUser = () => {
            const equipment = location.equipments[0];
            if (!equipment) return '📍 Localização';
            
            // Se há reserva ativa, mostrar usuário atual
            if (equipment.reservation && equipment.status === 'in_use') {
              const operatorName = getUserName(equipment.reservation.operador);
              return `👤 ${operatorName} - ${equipment.product.name}`;
            }
            
            // Se não há reserva ativa, buscar a última reserva para mostrar último usuário
            const allReservationsForEquipment = reservations.filter(r => {
              const equipmentMatch = r.equipamento === equipment.product.name || 
                                    r.equipamento === equipment.product.sku ||
                                    equipment.product.name.includes(r.equipamento) ||
                                    r.equipamento.includes(equipment.product.name);
              return equipmentMatch;
            });
            
            // Ordenar por data (mais recente primeiro)
            const sortedReservations = allReservationsForEquipment.sort((a, b) => {
              const dateA = a.data_fim || a.data_inicio || a.createdAt;
              const dateB = b.data_fim || b.data_inicio || b.createdAt;
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
            
            if (sortedReservations.length > 0) {
              const lastUser = getUserName(sortedReservations[0].operador);
              return `📍 ${equipment.product.name} - Último: ${lastUser}`;
            }
            
            return `📍 ${equipment.product.name} - Disponível`;
          };
          return `
            <div style="max-width: 300px; max-height: 400px; overflow-y: auto;">
              <div class="p-2">
                <h3 class="font-bold text-gray-900 mb-3 text-center">
                  ${getTitleWithUser()}
                </h3>
                <div class="text-xs text-gray-600 mb-3 text-center">
                  ${location.equipments.length} equipamento(s)
                </div>
                ${equipmentsHtml}
              </div>
            </div>
          `;
        };

        const infoWindow = new window.google.maps.InfoWindow({
          content: createInfoWindowContent()
        });

        marker.addListener('click', () => {
          infoWindow.open(googleMap, marker);
        });
      });

      console.log('Google Maps inicializado com sucesso');
    };

    initializeMap();
  }, [userLocation, products, reservations, userNames, userAvatars, isGoogleMapsScriptLoaded, mapFilter]);

  // Função global para mostrar detalhes do equipamento
  useEffect(() => {
    (window as any).showEquipmentDetails = (productId: string) => {
      console.log('Mostrando detalhes do equipamento:', productId);
      const product = products.find(p => p.id === productId);
      if (product) {
        const reservation = reservations.find(r => 
          r.equipamento === product.name && r.status_reserva === 'Ativo'
        );
        setSelectedEquipment({ product, reservation });
        setShowDetailsModal(true);
      }
    };

    return () => {
      delete (window as any).showEquipmentDetails;
    };
  }, [products, reservations]);

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
    
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} dias`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Alto':
        return 'bg-green-100 text-green-800';
      case 'Médio':
        return 'bg-yellow-100 text-yellow-800';
      case 'Baixo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível':
        return 'bg-green-100 text-green-800';
      case 'Em uso':
        return 'bg-blue-100 text-blue-800';
      case 'Manutenção':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-purple-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Mapa de Equipamentos
            </h3>
            <div className="flex items-center space-x-4">
              {isLoadingLocation && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Navigation className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Obtendo localização...</span>
                </div>
              )}
              {locationError && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Erro de localização</span>
                </div>
              )}
              {userLocation && !isLoadingLocation && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Localização obtida</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Legenda */}
          <div className="flex items-center justify-center space-x-6 p-4 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Equipamentos Disponíveis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Equipamentos Em Uso</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Sua Localização</span>
            </div>
          </div>

          {/* Google Maps Container */}
          <div className="space-y-4">
            <div 
              ref={mapRef}
              id="equipment-map"
              className="w-full h-96 rounded-lg border-2 border-purple-300 shadow-lg"
              style={{ minHeight: '400px' }}
            />
            
            {locationPermission === 'denied' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">Permissão de Localização Negada</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Para uma melhor experiência, permita o acesso à localização nas configurações do navegador.
                      O mapa está usando uma localização padrão.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => setMapFilter('all')}
              className={`bg-white p-4 rounded-lg border border-purple-200 text-center transition-all duration-200 hover:shadow-md hover:scale-105 ${
                mapFilter === 'all' ? 'ring-2 ring-purple-500 bg-purple-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-purple-900">
                {products.filter(p => p.category.name === 'Ativo').length}
              </div>
              <div className="text-sm text-purple-600">Total de Equipamentos</div>
            </button>
            <button
              onClick={() => setMapFilter('available')}
              className={`bg-white p-4 rounded-lg border border-green-200 text-center transition-all duration-200 hover:shadow-md hover:scale-105 ${
                mapFilter === 'available' ? 'ring-2 ring-green-500 bg-green-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-green-700">
                {products.filter(p => p.category.name === 'Ativo').length - 
                 reservations.filter(r => r.status_reserva === 'Ativo').length}
              </div>
              <div className="text-sm text-green-600">Disponíveis</div>
            </button>
            <button
              onClick={() => setMapFilter('in_use')}
              className={`bg-white p-4 rounded-lg border border-red-200 text-center transition-all duration-200 hover:shadow-md hover:scale-105 ${
                mapFilter === 'in_use' ? 'ring-2 ring-red-500 bg-red-50' : ''
              }`}
            >
              <div className="text-2xl font-bold text-red-700">
                {reservations.filter(r => r.status_reserva === 'Ativo').length}
              </div>
              <div className="text-sm text-red-600">Em Uso</div>
            </button>
            <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {Math.round((reservations.filter(r => r.status_reserva === 'Ativo').length / 
                Math.max(products.filter(p => p.category.name === 'Ativo').length, 1)) * 100)}%
              </div>
              <div className="text-sm text-blue-600">Taxa de Uso</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Equipamento */}
      {showDetailsModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Detalhes do Equipamento</h2>
                    <p className="text-gray-600">{selectedEquipment.product.name}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setShowDetailsModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informações do Equipamento */}
                <div className="space-y-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                        <Package className="w-5 h-5 mr-2" />
                        Informações do Equipamento
                      </h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Imagem do Produto */}
                      <div className="flex justify-center">
                        <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-200">
                          {selectedEquipment.product.images[0] ? (
                            <img
                              src={selectedEquipment.product.images[0]}
                              alt={selectedEquipment.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-16 h-16 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-blue-700">Nome</label>
                          <p className="text-blue-900 font-semibold">{selectedEquipment.product.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">SKU</label>
                          <p className="text-blue-900 font-mono">{selectedEquipment.product.sku}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Categoria</label>
                          <p className="text-blue-900">{selectedEquipment.product.category.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Fornecedor</label>
                          <p className="text-blue-900">{selectedEquipment.product.supplier.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Localização</label>
                          <p className="text-blue-900">
                            {selectedEquipment.product.location.warehouse} - 
                            {selectedEquipment.product.location.aisle}{selectedEquipment.product.location.shelf}
                            {selectedEquipment.product.location.position && `-${selectedEquipment.product.location.position}`}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-blue-700">Status</label>
                          <Badge variant={selectedEquipment.product.isActive ? 'success' : 'danger'}>
                            {selectedEquipment.product.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Informações da Reserva */}
                <div className="space-y-4">
                  {selectedEquipment.reservation ? (
                    <Card className="bg-red-50 border-red-200">
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-red-900 flex items-center">
                          <Play className="w-5 h-5 mr-2" />
                          Reserva Ativa
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Informações do Operador */}
                        <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-red-200">
                          {getUserAvatar(selectedEquipment.reservation.operador) ? (
                            <img
                              src={getUserAvatar(selectedEquipment.reservation.operador)!}
                              alt={getUserName(selectedEquipment.reservation.operador)}
                              className="w-12 h-12 rounded-full object-cover border-2 border-red-300"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center border-2 border-red-300">
                              <User className="w-6 h-6 text-red-600" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-red-900">
                              {getUserName(selectedEquipment.reservation.operador)}
                            </h4>
                            <p className="text-sm text-red-700">Operador Responsável</p>
                          </div>
                        </div>

                        {/* Datas e Tempo */}
                        <div className="space-y-3">
                          {selectedEquipment.reservation.data_inicio && (
                            <div>
                              <label className="text-sm font-medium text-red-700">Data de Início</label>
                              <p className="text-red-900">
                                {safeFormatDate(selectedEquipment.reservation.data_inicio)}
                              </p>
                            </div>
                          )}
                          {selectedEquipment.reservation.data_inicio && (
                            <div>
                              <label className="text-sm font-medium text-red-700">Tempo de Uso</label>
                              <p className="text-red-900 font-semibold">
                                {calculateUsageTime(selectedEquipment.reservation.data_inicio)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Níveis */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-red-900">Níveis dos Fluidos</h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Droplets className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700">Óleo</span>
                              </div>
                              <Badge size="sm" className={getLevelColor(selectedEquipment.reservation.nivel_oleo)}>
                                {selectedEquipment.reservation.nivel_oleo}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Fuel className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm text-gray-700">Combustível</span>
                              </div>
                              <Badge size="sm" className={getLevelColor(selectedEquipment.reservation.nivel_combustivel)}>
                                {selectedEquipment.reservation.nivel_combustivel}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Activity className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-gray-700">Poligrama</span>
                              </div>
                              <Badge size="sm" className={getLevelColor(selectedEquipment.reservation.nivel_poligrama)}>
                                {selectedEquipment.reservation.nivel_poligrama}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Status do Equipamento */}
                        <div>
                          <label className="text-sm font-medium text-red-700">Status do Equipamento</label>
                          <div className="mt-1">
                            <Badge size="md" className={getEquipmentStatusColor(selectedEquipment.reservation.status_equipamento)}>
                              <Settings className="w-4 h-4 mr-2" />
                              {selectedEquipment.reservation.status_equipamento}
                            </Badge>
                          </div>
                        </div>

                        {/* Motivos */}
                        {selectedEquipment.reservation.motivo_reserva && (
                          <div>
                            <label className="text-sm font-medium text-red-700">Motivo da Reserva</label>
                            <p className="text-red-900 bg-white p-3 rounded-lg border border-red-200 text-sm">
                              {selectedEquipment.reservation.motivo_reserva}
                            </p>
                          </div>
                        )}

                        {/* Observações */}
                        {selectedEquipment.reservation.observacoes && (
                          <div>
                            <label className="text-sm font-medium text-red-700">Observações</label>
                            <p className="text-red-900 bg-white p-3 rounded-lg border border-red-200 text-sm">
                              {selectedEquipment.reservation.observacoes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-green-900 flex items-center">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Equipamento Disponível
                        </h3>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-green-900 mb-2">
                            Equipamento Disponível para Uso
                          </h4>
                          <p className="text-green-700 mb-4">
                            Este equipamento não possui reserva ativa e está disponível para uso.
                          </p>
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setShowDetailsModal(false)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Reservar Equipamento
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
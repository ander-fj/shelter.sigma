# SIGMA - Sistema Integrado de Gestão de Materiais e Ativos

Sistema completo de gestão de inventário com suporte para aplicativo Android nativo.

## 🚀 Desenvolvimento

### Web (Desenvolvimento)
```bash
npm run dev
```
  
### Android

#### Primeira configuração
```bash
# Instalar dependências
npm install
 
# Inicializar projeto Android
npx cap add android

# Abrir no Android Studio
npm run android:dev
```

#### Desenvolvimento diário
```bash
# Sincronizar alterações com o app
npm run android:sync

# Ou build completo + executar
npm run cap:build:android
```

#### Gerar APK para distribuição
```bash
npm run android:build
```

## 📱 Recursos do Aplicativo Android

- ✅ **Offline First**: Funciona sem internet
- ✅ **Sincronização Automática**: Dados sincronizam quando conectado
- ✅ **Geolocalização**: Rastreamento de localização para inventários
- ✅ **Câmera**: Captura de fotos de produtos
- ✅ **Notificações**: Alertas de estoque e agendamentos
- ✅ **Armazenamento Local**: Dados salvos no dispositivo
- ✅ **Interface Nativa**: Performance otimizada para Android

## 🔧 Configuração do Ambiente Android

### Pré-requisitos
1. **Android Studio** instalado
2. **Java JDK 11+** configurado
3. **Android SDK** atualizado
4. **Dispositivo Android** ou emulador

### Variáveis de Ambiente
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 📋 Comandos Úteis

```bash
# Verificar dispositivos conectados
adb devices

# Instalar APK manualmente
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Ver logs do aplicativo
adb logcat | grep Capacitor

# Limpar cache do projeto
npx cap clean android

# Atualizar plugins do Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/android
```

## 🔄 Fluxo de Desenvolvimento

1. **Fazer alterações** no código web (React/TypeScript)
2. **Sincronizar** com `npm run android:sync`
3. **Testar** no Android Studio ou dispositivo
4. **Repetir** o processo para cada alteração

## 📦 Estrutura do Projeto

```
├── src/                    # Código fonte React
├── android/               # Projeto Android nativo
├── scripts/               # Scripts de build e sincronização
├── capacitor.config.ts    # Configuração do Capacitor
└── package.json          # Dependências e scripts
```

## 🛠️ Troubleshooting

### Erro de Build
```bash
# Limpar e reconstruir
npx cap clean android
npm run build
npx cap sync android
```

### Problemas de Permissão
- Verificar `AndroidManifest.xml`
- Testar em dispositivo físico
- Verificar configurações de desenvolvedor

### Problemas de Rede
- Verificar `network_security_config.xml`
- Testar conectividade Firebase
- Verificar certificados SSL

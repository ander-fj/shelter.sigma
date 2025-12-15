#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Sincronizando alterações com o aplicativo Android...');

try {
  // 1. Build da aplicação web
  console.log('📦 Fazendo build da aplicação web...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Sincronizar com Capacitor
  console.log('🔄 Sincronizando com Capacitor...');
  execSync('npx cap sync android', { stdio: 'inherit' });

  console.log('✅ Sincronização concluída!');
  console.log('');
  console.log('📱 Para ver as alterações no aplicativo:');
  console.log('1. No Android Studio, clique em "Run" novamente');
  console.log('2. Ou use "Hot Reload" se disponível');
  console.log('3. As alterações aparecerão automaticamente no app');
  
} catch (error) {
  console.error('❌ Erro durante sincronização:', error.message);
  process.exit(1);
}
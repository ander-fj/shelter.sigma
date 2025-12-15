#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando desenvolvimento Android...');

try {
  // 1. Build da aplicação web
  console.log('📦 Fazendo build da aplicação web...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Sincronizar com Capacitor
  console.log('🔄 Sincronizando com Capacitor...');
  execSync('npx cap sync android', { stdio: 'inherit' });

  // 3. Abrir Android Studio
  console.log('📱 Abrindo Android Studio...');
  execSync('npx cap open android', { stdio: 'inherit' });

  console.log('✅ Projeto Android aberto no Android Studio!');
  console.log('');
  console.log('📋 Próximos passos:');
  console.log('1. No Android Studio, clique em "Run" ou pressione Shift+F10');
  console.log('2. Selecione um dispositivo Android (emulador ou físico)');
  console.log('3. O aplicativo será instalado e executado automaticamente');
  console.log('');
  console.log('🔄 Para atualizar o app após mudanças:');
  console.log('   npm run sync-android');
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
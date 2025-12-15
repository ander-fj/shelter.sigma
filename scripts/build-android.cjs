#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build do aplicativo Android...');

try {
  // 1. Build da aplicação web
  console.log('📦 Fazendo build da aplicação web...');
  execSync('npm run build', { stdio: 'inherit' });

  // 2. Sincronizar com Capacitor
  console.log('🔄 Sincronizando com Capacitor...');
  execSync('npx cap sync android', { stdio: 'inherit' });

  // 3. Copiar assets adicionais
  console.log('📁 Copiando assets...');
  const publicDir = path.join(__dirname, '..', 'public');
  const androidAssetsDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public');
  
  if (fs.existsSync(publicDir)) {
    if (!fs.existsSync(androidAssetsDir)) {
      fs.mkdirSync(androidAssetsDir, { recursive: true });
    }
    
    // Copiar imagens importantes
    const imagesToCopy = [
      'Imagem do WhatsApp de 2025-07-26 à(s) 19.32.39_72b8171d copy.jpg',
      'Secontaf.png',
      'icone3.png'
    ];
    
    imagesToCopy.forEach(image => {
      const srcPath = path.join(publicDir, image);
      const destPath = path.join(androidAssetsDir, image);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copiado: ${image}`);
      }
    });
  }

  // 4. Build do APK
  console.log('🔨 Fazendo build do APK...');
  process.chdir(path.join(__dirname, '..', 'android'));
  execSync('./gradlew assembleDebug', { stdio: 'inherit' });

  console.log('✅ Build concluído com sucesso!');
  console.log('📱 APK gerado em: android/app/build/outputs/apk/debug/app-debug.apk');
  
} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}
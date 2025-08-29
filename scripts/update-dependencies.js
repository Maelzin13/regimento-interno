#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Atualizando dependências de forma segura...\n');

try {
  // 1. Fazer backup do package.json atual
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJsonBackup = path.join(process.cwd(), 'package.json.backup');
  
  if (fs.existsSync(packageJsonPath)) {
    fs.copyFileSync(packageJsonPath, packageJsonBackup);
    console.log('✅ Backup do package.json criado');
  }

  // 2. Atualizar dependências não críticas primeiro
  console.log('📦 Atualizando dependências não críticas...');
  execSync('npm audit fix', { stdio: 'inherit' });

  // 3. Verificar vulnerabilidades restantes
  console.log('\n🔍 Verificando vulnerabilidades restantes...');
  execSync('npm audit', { stdio: 'inherit' });

  // 4. Atualizar Angular CLI se necessário
  console.log('\n🔄 Verificando versão do Angular CLI...');
  const currentVersion = execSync('ng version', { encoding: 'utf8' });
  console.log('Versão atual:', currentVersion.split('\n')[0]);

  // 5. Atualizar TypeScript se necessário
  console.log('\n📝 Verificando versão do TypeScript...');
  const tsVersion = execSync('npx tsc --version', { encoding: 'utf8' });
  console.log('Versão atual:', tsVersion.trim());

  console.log('\n✅ Atualização concluída!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Teste a aplicação: npm start');
  console.log('2. Execute os testes: npm test');
  console.log('3. Verifique se tudo funciona corretamente');
  console.log('4. Se houver problemas, restaure o backup: cp package.json.backup package.json');

} catch (error) {
  console.error('❌ Erro durante a atualização:', error.message);
  console.log('\n🔄 Restaurando backup...');
  
  const packageJsonBackup = path.join(process.cwd(), 'package.json.backup');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (fs.existsSync(packageJsonBackup)) {
    fs.copyFileSync(packageJsonBackup, packageJsonPath);
    console.log('✅ Backup restaurado');
  }
  
  console.log('\n💡 Dicas para resolver problemas:');
  console.log('- Verifique se há conflitos de versão');
  console.log('- Considere atualizar uma dependência por vez');
  console.log('- Teste cada atualização antes de prosseguir');
}

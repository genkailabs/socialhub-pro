const { copyNextStaticFiles } = require('../lib/prepare-standalone.cjs');

copyNextStaticFiles();
console.log('Arquivos estáticos incluídos no pacote de produção.');

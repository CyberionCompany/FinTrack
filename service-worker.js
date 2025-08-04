// Define um nome e uma versão para o cache
const CACHE_NAME = 'finantrack-cache-v1';

// Lista de ficheiros essenciais para o app funcionar offline
// ATENÇÃO: Verifique se todos os caminhos estão corretos!
// Removi os caminhos para css e js que não aparecem na sua estrutura de arquivos.
// Adicione-os novamente com o caminho correto se eles existirem.
const urlsToCache = [
  '/',
  '/index.html',
  '/src/css/main.css',
  '/src/js/main.js',
  '/logo2-512.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json' // É bom cachear o manifesto também
  // Exemplo: Se seu css estiver na raiz, adicione '/styles.css'
];

// Evento de Instalação: guarda os ficheiros em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: serve os ficheiros do cache primeiro
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o ficheiro estiver no cache, retorna-o
        if (response) {
          return response;
        }
        // Se não, vai buscá-lo à rede
        return fetch(event.request);
      }
    )
  );
});
const CACHE_NAME = 'minha-rotina-cache-v3'; // Mude a versão para forçar a atualização

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/add-task.mp3',
  '/sounds/complete-task.mp3',
  '/sounds/delete-task.mp3'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, adicionando arquivos essenciais.');
        // O `addAll` é atômico. Se um arquivo falhar, a instalação inteira falha.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos em cache com sucesso. Ativando...');
        // Força o novo service worker a se tornar ativo imediatamente.
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Reivindicando clientes...');
        // Garante que o service worker tome controle da página imediatamente.
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET ou que são para a API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    // Deixa a requisição passar para a rede
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Se tiver no cache, retorna do cache. Se não, busca na rede.
        return response || fetch(event.request).then(networkResponse => {
          // Opcional: Salva a nova requisição no cache para uso futuro
          // cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});


// --- LÓGICA DE NOTIFICAÇÃO PUSH (VERSÃO MELHORADA) ---

self.addEventListener('push', event => {
  console.log('Service Worker: Notificação Push recebida.');

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Nova Notificação', body: event.data.text() };
  }

  const title = data.title || 'Minha Rotina';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200], // Vibração mais perceptível
    tag: 'task-notification', // Uma tag para agrupar
    renotify: true,
    // --- MUDANÇA: Adicionando ações para uma melhor experiência no celular ---
    actions: [
      { action: 'explore', title: 'Visualizar Tarefa' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notificação clicada.');
  event.notification.close();

  // Se o usuário clicou no botão de ação 'explore' ou na notificação em si
  if (event.action === 'explore' || !event.action) {
    event.waitUntil(
      clients.openWindow('/') // Abre a página principal
    );
  }
});
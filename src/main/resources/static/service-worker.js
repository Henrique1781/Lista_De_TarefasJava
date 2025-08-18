// Nome e versão do cache. Mude a versão para forçar a atualização do cache se você mudar os arquivos.
const CACHE_NAME = 'minha-rotina-cache-v2'; 

// Lista de arquivos essenciais para o funcionamento offline do app.
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

// Evento 'install': é disparado quando o Service Worker é instalado.
// Usamos para baixar e salvar os arquivos essenciais (urlsToCache) no cache.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, adicionando arquivos essenciais.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Força o novo Service Worker a se tornar ativo imediatamente.
        // Essencial para que as atualizações funcionem sem precisar fechar e abrir a aba.
        console.log('Service Worker: Arquivos em cache com sucesso. Ativando...');
        return self.skipWaiting();
      })
  );
});

// Evento 'activate': é disparado após a instalação, quando o Service Worker se torna ativo.
// Usamos para limpar caches antigos que não são mais necessários.
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Se o nome do cache não for o nosso cache atual, ele é deletado.
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        // Garante que o Service Worker tome controle da página imediatamente.
        console.log('Service Worker: Reivindicando clientes...');
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': intercepta todas as requisições de rede da página.
// Permite que o app funcione offline, servindo arquivos do cache.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET (como POST para a API)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o arquivo existir no cache, retorna ele.
        if (response) {
          return response;
        }
        // Se não, busca na rede.
        return fetch(event.request);
      }
    )
  );
});


// --- LÓGICA DE NOTIFICAÇÃO PUSH (A PARTE MAIS IMPORTANTE) ---

// Evento 'push': é disparado quando uma notificação push é recebida do servidor.
self.addEventListener('push', event => {
  console.log('Service Worker: Notificação Push recebida.');

  let data;
  try {
    // Tenta ler os dados da notificação como JSON.
    data = event.data.json();
  } catch (e) {
    // Se falhar, usa um texto padrão.
    data = {
      title: 'Nova Notificação',
      body: event.data.text(),
    };
  }

  const title = data.title || 'Minha Rotina';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/icons/icon-192x192.png', // Ícone que aparece na notificação
    badge: '/icons/icon-192x192.png', // Ícone pequeno na barra de status (Android)
    vibrate: [200, 100, 200], // Padrão de vibração
    tag: 'minha-rotina-notification', // Agrupa notificações para não lotar a tela
    renotify: true, // Vibra e toca som mesmo se for uma notificação com a mesma tag
  };

  // O 'waitUntil' garante que o Service Worker não será encerrado pelo navegador
  // antes que a notificação seja exibida.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Evento 'notificationclick': é disparado quando o usuário clica na notificação.
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notificação clicada.');

  // Fecha a notificação que foi clicada.
  event.notification.close();

  // Abre a URL do seu aplicativo.
  event.waitUntil(
    clients.openWindow('/') // Abre a página principal do seu site
  );
});
// 缓存名称和版本
const CACHE_NAME = 'hd-collab-cache-v1';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// 安装 Service Worker 并缓存资源
self.addEventListener('install', event => {
  console.log('安装 Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('打开缓存');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 让新的 Service Worker 立即激活
  );
});

// 激活 Service Worker 并清除旧缓存
self.addEventListener('activate', event => {
  console.log('激活 Service Worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('删除旧缓存:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim()) // 让 Service Worker 立即控制所有客户端
  );
});

// 处理请求
self.addEventListener('fetch', event => {
  // 排除飞书 API 请求，仅缓存静态资源和 HTML
  if (event.request.url.includes('/api/') && !event.request.url.endsWith('.html')) {
    return;
  }
  
  event.respondWith(
    // 尝试从缓存中返回
    caches.match(event.request)
      .then(response => {
        // 找到缓存，返回缓存的响应
        if (response) {
          return response;
        }
        
        // 未找到缓存，发起网络请求
        return fetch(event.request)
          .then(response => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 缓存获取的响应（需要克隆，因为响应流只能使用一次）
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('获取资源失败:', error);
            
            // 对于导航请求（如页面加载），返回离线页面
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // 其他请求返回错误
            return new Response('网络连接失败，无法加载资源。', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// 后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'sync-themes') {
    event.waitUntil(syncThemes());
  }
});

// 实现后台同步函数
async function syncThemes() {
  try {
    // 从 IndexedDB 获取待同步的主题
    const themesToSync = await getThemesToSync();
    
    if (themesToSync.length === 0) {
      return;
    }
    
    // 获取访问令牌
    const tokenResponse = await fetch('/api/get-feishu-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!tokenResponse.ok) {
      throw new Error('获取访问令牌失败');
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.tenant_access_token;
    
    // 处理每个待同步的主题
    for (const themeData of themesToSync) {
      const { theme, action, id } = themeData;
      
      switch (action) {
        case 'create':
          await createThemeInFeishu(theme, accessToken);
          break;
        case 'update':
          await updateThemeInFeishu(id, theme, accessToken);
          break;
        case 'delete':
          await deleteThemeFromFeishu(id, accessToken);
          break;
      }
    }
    
    // 清除已同步的主题
    await clearSyncedThemes();
    
    // 通知客户端同步完成
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-complete',
        success: true
      });
    });
    
  } catch (error) {
    console.error('同步主题失败:', error);
    
    // 通知客户端同步失败
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-complete',
        success: false,
        error: error.message
      });
    });
  }
}

// 这些函数需要在主 JS 文件中实现并且与 Service Worker 通信
// 这里仅作为占位符
async function getThemesToSync() {
  return [];
}

async function clearSyncedThemes() {
  return;
}

async function createThemeInFeishu(theme, token) {
  return;
}

async function updateThemeInFeishu(id, theme, token) {
  return;
}

async function deleteThemeFromFeishu(id, token) {
  return;
}

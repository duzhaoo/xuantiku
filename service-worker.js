// 缓存名称和版本
const CACHE_NAME = 'hd-collab-cache-v1';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/idb-helper.js',
  '/manifest.json',
  '/favicon.ico',
  // 只列出确实存在的图标
  '/icons/icon-512x512.png',
  '/icons/icon-96x96.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// 安装事件：缓存资源
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  // 确保Service Worker不会被旧的Service Worker替代，直到缓存完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching all resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Successfully cached resources');
        return self.skipWaiting();
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// 请求拦截：缓存优先策略
self.addEventListener('fetch', event => {
  // 排除对API的请求，让它们直接通过网络
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果在缓存中找到匹配的响应，则返回缓存的版本
        if (cachedResponse) {
          console.log('[Service Worker] Return cached resource', event.request.url);
          return cachedResponse;
        }

        // 如果缓存中没有响应，则尝试从网络获取
        console.log('[Service Worker] Network request for', event.request.url);
        return fetch(event.request)
          .then(response => {
            // 检查是否得到了有效的响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应，因为响应流只能使用一次
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('[Service Worker] Caching new resource', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      }).catch(() => {
        // 如果网络请求失败且没有缓存，则返回离线页面
        console.log('[Service Worker] Fetch failed, returning offline page');
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// 处理后台同步
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync', event.tag);
  if (event.tag === 'sync-themes') {
    event.waitUntil(syncThemes());
  }
});

// 同步主题数据
async function syncThemes() {
  try {
    const themesToSync = await getThemesToSync();
    
    for (const theme of themesToSync) {
      // 根据操作类型同步数据
      if (theme.syncAction === 'create') {
        await createThemeOnServer(theme);
      } else if (theme.syncAction === 'update') {
        await updateThemeOnServer(theme);
      } else if (theme.syncAction === 'delete') {
        await deleteThemeOnServer(theme.id);
      }
      
      // 同步成功后更新本地数据状态
      await markThemeAsSynced(theme.id);
    }
    
    console.log('[Service Worker] Themes synchronized successfully');
    return true;
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    return false;
  }
}

// 以下函数为待实现的辅助函数，应当根据实际情况来实现
async function getThemesToSync() {
  // 这里应该实现获取需要同步的主题
  // 从IndexedDB获取带有syncPending标记的主题
  return [];
}

async function markThemeAsSynced(themeId) {
  // 这里应该实现将主题标记为已同步
  console.log('[Service Worker] Marked theme as synced:', themeId);
}

async function createThemeOnServer(theme) {
  // 实现创建主题到服务器的逻辑
  console.log('[Service Worker] Create theme on server:', theme);
}

async function updateThemeOnServer(theme) {
  // 实现更新服务器上主题的逻辑
  console.log('[Service Worker] Update theme on server:', theme);
}

async function deleteThemeOnServer(themeId) {
  // 实现从服务器删除主题的逻辑
  console.log('[Service Worker] Delete theme from server:', themeId);
}

// IndexedDB 助手类，用于离线数据存储
class IDBHelper {
  constructor(dbName, version, storeName) {
    this.dbName = dbName;
    this.version = version;
    this.storeName = storeName;
    this.db = null;
  }

  // 打开数据库连接
  open() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 创建对象存储，以 id 为主键
          db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // 创建待同步的数据存储
          if (!db.objectStoreNames.contains('sync-queue')) {
            db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
          }
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('打开数据库失败:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // 获取所有主题
  getAllThemes() {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          console.error('获取主题失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 添加或更新主题
  saveTheme(theme) {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(theme);

        request.onsuccess = () => {
          resolve(theme);
        };

        request.onerror = (event) => {
          console.error('保存主题失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 获取特定主题
  getTheme(id) {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          console.error('获取主题失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 删除主题
  deleteTheme(id) {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = (event) => {
          console.error('删除主题失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 添加待同步项
  addToSyncQueue(data) {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction('sync-queue', 'readwrite');
        const store = transaction.objectStore('sync-queue');
        const request = store.add(data);

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          console.error('添加同步项失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 获取所有待同步项
  getAllSyncItems() {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction('sync-queue', 'readonly');
        const store = transaction.objectStore('sync-queue');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (event) => {
          console.error('获取同步项失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }

  // 清空同步队列
  clearSyncQueue() {
    return new Promise((resolve, reject) => {
      this.open().then(db => {
        const transaction = db.transaction('sync-queue', 'readwrite');
        const store = transaction.objectStore('sync-queue');
        const request = store.clear();

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = (event) => {
          console.error('清空同步队列失败:', event.target.error);
          reject(event.target.error);
        };
      }).catch(reject);
    });
  }
}

// 导出 IDBHelper 实例
const dbHelper = new IDBHelper('hd-collab-db', 1, 'themes');

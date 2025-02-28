// 飞书多维表格配置
const FEISHU_CONFIG = {
    APP_TOKEN: "AjgAbpUHQaRXjNsk6WWcC6zxnXe", // 应用 Token
    APP_ID: "cli_a73f58b52cfb100d", // 应用 ID
    TABLE_ID: "tblIR9voTaEa1IsG", // 表格 ID
    VIEW_ID: "vewQXakJpH", // 视图 ID
    // 根据环境选择 API 基础 URL
    API_BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api'
};

// 存储主题的数组
let themes = [];
let currentFilter = 'all';
let isEditing = false;
let editingThemeId = null;
let accessToken = null;
let isOnline = navigator.onLine; // 添加在线状态变量

// IndexedDB支持
let db;
let request = indexedDB.open('themesDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    let objectStore = db.createObjectStore('themes', { keyPath: 'id' });
};

request.onsuccess = function(event) {
    db = event.target.result;
};

request.onerror = function(event) {
    console.error('IndexedDB错误:', event.target.error);
};

// DOM元素
const newThemeForm = document.getElementById('new-theme-form');
const themeTitleInput = document.getElementById('theme-title');
const themeDescriptionInput = document.getElementById('theme-description');
const themeStatusSelect = document.getElementById('theme-status');
const themesList = document.getElementById('themes-list');
const filterButtons = document.querySelectorAll('.ant-radio-button');
const newThemeBtn = document.getElementById('new-theme-btn');
const themeFormModal = document.getElementById('theme-form-modal');
const cancelBtn = document.getElementById('cancel-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const submitBtn = document.getElementById('submit-btn');
const modalTitle = document.getElementById('modal-title');
const themeDetailModal = document.getElementById('theme-detail-modal');
const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
const themeDetailContent = document.getElementById('theme-detail-content');
const editThemeBtn = document.getElementById('edit-theme-btn');
const deleteThemeBtn = document.getElementById('delete-theme-btn');
const detailTitle = document.getElementById('detail-title');

let currentThemeId = null;

// 初始化应用
async function init() {
    try {
        // 检查在线状态
        updateOnlineStatus();
        
        if (isOnline) {
            // 尝试连接飞书API
            await initFeishuConnection();
        } else {
            console.log('离线模式：从IndexedDB加载数据');
            // 从IndexedDB加载主题数据
            themes = await getThemesFromIndexedDB() || [];
            renderThemes();
        }
    } catch (error) {
        console.error('飞书API连接失败，使用本地存储:', error);
        // 尝试从IndexedDB加载主题数据
        themes = await getThemesFromIndexedDB() || [];
        // 如果IndexedDB中没有数据，尝试从localStorage加载
        if (themes.length === 0) {
            themes = JSON.parse(localStorage.getItem('themes')) || [];
            // 将localStorage中的数据存入IndexedDB
            if (themes.length > 0) {
                await saveThemesToIndexedDB(themes);
            }
        }
        renderThemes();
    }
    
    // 设置事件监听器
    setupEventListeners();
    
    // 监听Service Worker消息
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data.type === 'sync-complete') {
                if (event.data.success) {
                    showNotification('数据同步成功', 'success');
                    // 重新加载数据
                    if (isOnline) {
                        fetchThemes();
                    }
                } else {
                    showNotification('数据同步失败: ' + event.data.error, 'error');
                }
            }
        });
    }
    
    // 注册后台同步
    registerBackgroundSync();
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : 
              type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : 
              '<i class="fas fa-info-circle"></i>'}
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    // 2秒后自动移除
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// 更新在线状态
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    console.log('网络状态:', isOnline ? '在线' : '离线');
    
    // 更新UI
    const offlineNotification = document.getElementById('offline-notification');
    if (offlineNotification) {
        offlineNotification.style.display = isOnline ? 'none' : 'block';
    }
    
    // 如果回到在线状态，尝试同步数据
    if (isOnline) {
        registerBackgroundSync();
    }
}

// 注册后台同步
function registerBackgroundSync() {
    if (!isOnline || !navigator.serviceWorker || !('SyncManager' in window)) {
        return;
    }
    
    navigator.serviceWorker.ready.then(registration => {
        registration.sync.register('sync-themes')
            .catch(err => console.error('后台同步注册失败:', err));
    });
}

// 初始化飞书连接
async function initFeishuConnection() {
    // 获取访问令牌
    await getAccessToken();
    
    // 不再尝试获取表格信息，直接使用指定的表格ID
    console.log('使用表格ID:', FEISHU_CONFIG.TABLE_ID);
    
    // 获取主题数据
    await fetchThemes();
}

// 获取访问令牌
async function getAccessToken() {
    try {
        const response = await fetch(`${FEISHU_CONFIG.API_BASE_URL}/get-feishu-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取访问令牌失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(`获取访问令牌失败: ${data.msg}`);
        }
        
        accessToken = data.tenant_access_token;
        console.log('成功获取访问令牌');
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        throw error;
    }
}

// 获取表格信息 - 保留但不再调用此函数
async function getTableInfo() {
    try {
        // 如果已经有表格ID，则跳过
        if (FEISHU_CONFIG.TABLE_ID) {
            return;
        }
        
        const url = `${FEISHU_CONFIG.API_BASE_URL}/feishu/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取表格信息失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0 || !data.data || !data.data.items || data.data.items.length === 0) {
            throw new Error('未找到表格信息');
        }
        
        // 使用第一个表格
        FEISHU_CONFIG.TABLE_ID = data.data.items[0].table_id;
        console.log('成功获取表格ID:', FEISHU_CONFIG.TABLE_ID);
    } catch (error) {
        console.error('获取表格信息失败:', error);
        throw error;
    }
}

// 从飞书多维表格获取主题数据
async function fetchThemes() {
    try {
        // 构建 API 路径
        const apiPath = `bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
        let url = `${FEISHU_CONFIG.API_BASE_URL}/feishu-proxy?path=${encodeURIComponent(apiPath)}`;
        
        // 如果有视图ID，添加到URL
        if (FEISHU_CONFIG.VIEW_ID) {
            url += `&view_id=${FEISHU_CONFIG.VIEW_ID}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        // 添加响应状态日志
        console.log('响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`获取数据失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 添加响应数据日志
        console.log('响应数据:', data);
        
        if (data.code !== 0) {
            throw new Error(`获取数据失败: ${data.msg}`);
        }
        
        // 检查是否有数据
        if (!data.data || !data.data.items) {
            console.log('未找到数据，使用空数组');
            themes = [];
            return;
        }
        
        // 转换飞书数据格式为我们的主题格式
        themes = data.data.items.map(item => {
            const fields = item.fields;
            console.log('记录字段:', fields); // 添加日志查看字段
            
            // 获取状态值
            let status = fields.status || fields.状态 || '待开始';
            
            // 确保状态值是我们支持的状态之一
            if (!['待开始', '进行中', '已发布', '已完成'].includes(status)) {
                // 如果不是，映射到最接近的状态
                if (status.includes('待') || status.includes('计划') || status.includes('立项')) {
                    status = '待开始';
                } else if (status.includes('进行') || status.includes('开发') || status.includes('实施')) {
                    status = '进行中';
                } else if (status.includes('发布')) {
                    status = '已发布';
                } else if (status.includes('完成') || status.includes('结束')) {
                    status = '已完成';
                } else {
                    // 默认状态
                    status = '待开始';
                }
            }
            
            return {
                id: item.record_id,
                title: fields.title || fields.名称 || fields.主题 || '无标题',
                description: fields.description || fields.描述 || fields.内容 || '',
                status: status,
                createdAt: fields.created_at || fields.创建时间 || new Date().toISOString()
            };
        });
        
        console.log('成功获取主题数据，共', themes.length, '条');
        
        // 保存到IndexedDB
        await saveThemesToIndexedDB(themes);
    } catch (error) {
        console.error('获取主题数据失败:', error);
        throw error;
    }
}

// 创建新主题到飞书多维表格
async function createThemeInFeishu(theme) {
    try {
        const url = `${FEISHU_CONFIG.API_BASE_URL}/feishu/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
        
        // 构建字段映射
        const fields = {};
        
        // 尝试多种可能的字段名
        fields.title = theme.title;
        fields.名称 = theme.title;
        fields.主题 = theme.title;
        
        if (theme.description) {
            fields.description = theme.description;
            fields.描述 = theme.description;
            fields.内容 = theme.description;
        }
        
        fields.status = theme.status;
        fields.状态 = theme.status;
        
        fields.created_at = theme.createdAt;
        fields.创建时间 = theme.createdAt;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: fields
            })
        });
        
        if (!response.ok) {
            throw new Error(`创建主题失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(`创建主题失败: ${data.msg}`);
        }
        
        console.log('成功创建主题');
        return data.data.record_id;
    } catch (error) {
        console.error('创建主题失败:', error);
        throw error;
    }
}

// 更新飞书多维表格中的主题
async function updateThemeInFeishu(id, updatedTheme) {
    try {
        const url = `${FEISHU_CONFIG.API_BASE_URL}/feishu/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${id}`;
        
        // 构建字段映射
        const fields = {};
        
        fields.title = updatedTheme.title;
        fields.名称 = updatedTheme.title;
        fields.主题 = updatedTheme.title;
        
        if (updatedTheme.description) {
            fields.description = updatedTheme.description;
            fields.描述 = updatedTheme.description;
            fields.内容 = updatedTheme.description;
        }
        
        fields.status = updatedTheme.status;
        fields.状态 = updatedTheme.status;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: fields
            })
        });
        
        if (!response.ok) {
            throw new Error(`更新主题失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(`更新主题失败: ${data.msg}`);
        }
        
        console.log('成功更新主题');
        return true;
    } catch (error) {
        console.error('更新主题失败:', error);
        throw error;
    }
}

// 删除飞书多维表格中的主题
async function deleteThemeFromFeishu(id) {
    try {
        const url = `${FEISHU_CONFIG.API_BASE_URL}/feishu/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${id}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`删除主题失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(`删除主题失败: ${data.msg}`);
        }
        
        console.log('成功删除主题');
        return true;
    } catch (error) {
        console.error('删除主题失败:', error);
        throw error;
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 提交按钮点击事件
    submitBtn.addEventListener('click', async function() {
        if (newThemeForm.checkValidity()) {
            try {
                if (isEditing) {
                    await updateTheme();
                } else {
                    await addNewTheme();
                }
                hideModal();
            } catch (error) {
                console.error('操作失败:', error);
                alert('操作失败，请重试');
            }
        } else {
            newThemeForm.reportValidity();
        }
    });
    
    // 筛选按钮点击事件
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.status;
            renderThemes();
        });
    });
    
    // 新建主题按钮点击事件
    newThemeBtn.addEventListener('click', function() {
        isEditing = false;
        modalTitle.textContent = '创建新主题';
        showModal();
    });
    
    // 取消按钮点击事件
    cancelBtn.addEventListener('click', hideModal);
    
    // 关闭模态框按钮点击事件
    closeModalBtn.addEventListener('click', hideModal);
    
    // 点击模态框外部关闭
    themeFormModal.addEventListener('click', function(e) {
        if (e.target === themeFormModal || e.target.classList.contains('ant-modal-wrap')) {
            hideModal();
        }
    });
    
    // 关闭详情模态框按钮点击事件
    closeDetailModalBtn.addEventListener('click', hideDetailModal);
    
    // 点击详情模态框外部关闭
    themeDetailModal.addEventListener('click', function(e) {
        if (e.target === themeDetailModal || e.target.classList.contains('ant-modal-wrap')) {
            hideDetailModal();
        }
    });
    
    // 编辑按钮点击事件
    editThemeBtn.addEventListener('click', function() {
        if (currentThemeId) {
            hideDetailModal();
            editTheme(currentThemeId);
        }
    });
    
    // 删除按钮点击事件
    deleteThemeBtn.addEventListener('click', function() {
        if (currentThemeId) {
            deleteTheme(currentThemeId);
            hideDetailModal();
        }
    });
    
    // 键盘事件 - ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (themeFormModal.style.display === 'block') {
                hideModal();
            } else if (themeDetailModal.style.display === 'block') {
                hideDetailModal();
            }
        }
    });
}

// 显示模态框
function showModal() {
    themeFormModal.style.display = 'block';
    themeTitleInput.focus();
    document.body.style.overflow = 'hidden';
}

// 隐藏模态框
function hideModal() {
    themeFormModal.style.display = 'none';
    resetForm();
    document.body.style.overflow = '';
}

// 添加新主题
async function addNewTheme() {
    const title = themeTitleInput.value.trim();
    const description = themeDescriptionInput.value.trim();
    const status = themeStatusSelect.value;
    
    if (!title) return;
    
    const newTheme = {
        title,
        description,
        status,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (accessToken) {
            // 如果有访问令牌，尝试创建到飞书
            const recordId = await createThemeInFeishu(newTheme);
            newTheme.id = recordId;
        } else {
            // 否则使用本地ID
            newTheme.id = Date.now();
        }
        
        // 添加到本地数组
        themes.unshift(newTheme);
        
        // 保存到IndexedDB
        await saveThemesToIndexedDB(themes);
        
        renderThemes();
        resetForm();
    } catch (error) {
        console.error('添加主题失败:', error);
        
        // 如果飞书API失败，使用本地存储
        newTheme.id = Date.now();
        themes.unshift(newTheme);
        await saveThemesToIndexedDB(themes);
        renderThemes();
        resetForm();
        
        throw error;
    }
}

// 更新主题
async function updateTheme() {
    if (!editingThemeId) return;
    
    const themeIndex = themes.findIndex(t => t.id === editingThemeId);
    if (themeIndex === -1) return;
    
    const updatedTheme = {
        title: themeTitleInput.value.trim(),
        description: themeDescriptionInput.value.trim(),
        status: themeStatusSelect.value
    };
    
    try {
        if (accessToken) {
            // 如果有访问令牌，尝试更新到飞书
            await updateThemeInFeishu(editingThemeId, updatedTheme);
        }
        
        // 更新本地数组
        themes[themeIndex].title = updatedTheme.title;
        themes[themeIndex].description = updatedTheme.description;
        themes[themeIndex].status = updatedTheme.status;
        
        // 保存到IndexedDB
        await saveThemesToIndexedDB(themes);
        
        renderThemes();
        isEditing = false;
        editingThemeId = null;
    } catch (error) {
        console.error('更新主题失败:', error);
        
        // 如果飞书API失败，使用本地存储
        themes[themeIndex].title = updatedTheme.title;
        themes[themeIndex].description = updatedTheme.description;
        themes[themeIndex].status = updatedTheme.status;
        await saveThemesToIndexedDB(themes);
        renderThemes();
        isEditing = false;
        editingThemeId = null;
        
        throw error;
    }
}

// 删除主题
async function deleteTheme(id) {
    const themeIndex = themes.findIndex(t => t.id === id);
    
    if (themeIndex === -1) return;
    
    if (confirm(`确定要删除"${themes[themeIndex].title}"吗？`)) {
        try {
            if (accessToken) {
                // 如果有访问令牌，尝试从飞书删除
                await deleteThemeFromFeishu(id);
            }
            
            // 从本地数组删除
            themes.splice(themeIndex, 1);
            
            // 保存到IndexedDB
            await saveThemesToIndexedDB(themes);
            
            renderThemes();
        } catch (error) {
            console.error('删除主题失败:', error);
            
            // 如果飞书API失败，使用本地存储
            themes.splice(themeIndex, 1);
            await saveThemesToIndexedDB(themes);
            renderThemes();
            
            throw error;
        }
    }
}

// 保存主题到IndexedDB
async function saveThemesToIndexedDB(themes) {
    if (!db) return;
    
    const transaction = db.transaction('themes', 'readwrite');
    const objectStore = transaction.objectStore('themes');
    
    themes.forEach(theme => {
        objectStore.put(theme);
    });
    
    await new Promise(resolve => {
        transaction.oncomplete = resolve;
    });
}

// 获取主题从IndexedDB
async function getThemesFromIndexedDB() {
    if (!db) return [];
    
    const transaction = db.transaction('themes', 'readonly');
    const objectStore = transaction.objectStore('themes');
    
    const themes = await new Promise(resolve => {
        const themes = [];
        
        const request = objectStore.openCursor();
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            
            if (cursor) {
                themes.push(cursor.value);
                cursor.continue();
            } else {
                resolve(themes);
            }
        };
    });
    
    return themes;
}

// 渲染主题列表
function renderThemes() {
    themesList.innerHTML = '';
    
    const filteredThemes = currentFilter === 'all' 
        ? themes 
        : themes.filter(theme => theme.status === currentFilter);
    
    if (filteredThemes.length === 0) {
        themesList.innerHTML = '<div class="no-themes">暂无相关主题</div>';
        return;
    }
    
    filteredThemes.forEach(theme => {
        const themeItem = document.createElement('div');
        themeItem.className = 'theme-item';
        themeItem.dataset.id = theme.id;
        
        themeItem.innerHTML = `
            <div class="theme-content">
                <div class="theme-main">
                    <div class="theme-header">
                        <div class="theme-title">${theme.title}</div>
                        <div class="theme-status status-${theme.status}">${theme.status}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加点击事件，打开详情模态框
        themeItem.addEventListener('click', function() {
            showDetailModal(this.dataset.id);
        });
        
        themesList.appendChild(themeItem);
    });
}

// 显示详情模态框
function showDetailModal(id) {
    const theme = themes.find(t => t.id === id);
    if (!theme) return;
    
    currentThemeId = id;
    detailTitle.textContent = theme.title;
    
    // 构建详情内容
    const descriptionHtml = theme.description 
        ? `
            <div class="detail-item">
                <div class="detail-label">描述</div>
                <div class="detail-value">${theme.description}</div>
            </div>
        ` 
        : '';
    
    // 格式化日期
    const createdDate = new Date(theme.createdAt);
    const formattedDate = `${createdDate.getFullYear()}-${(createdDate.getMonth()+1).toString().padStart(2, '0')}-${createdDate.getDate().toString().padStart(2, '0')}`;
    
    themeDetailContent.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">状态</div>
            <div class="detail-value">
                <span class="detail-status status-${theme.status}">${theme.status}</span>
            </div>
        </div>
        ${descriptionHtml}
        <div class="detail-item">
            <div class="detail-label">创建时间</div>
            <div class="detail-value">${formattedDate}</div>
        </div>
    `;
    
    themeDetailModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// 隐藏详情模态框
function hideDetailModal() {
    themeDetailModal.style.display = 'none';
    document.body.style.overflow = '';
    currentThemeId = null;
}

// 编辑主题
function editTheme(id) {
    const theme = themes.find(t => t.id === id);
    
    if (!theme) return;
    
    isEditing = true;
    editingThemeId = id;
    modalTitle.textContent = '编辑主题';
    
    // 填充表单数据
    themeTitleInput.value = theme.title;
    themeDescriptionInput.value = theme.description || '';
    themeStatusSelect.value = theme.status;
    
    showModal();
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init); 
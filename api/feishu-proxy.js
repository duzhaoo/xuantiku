const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    // 设置缓存控制头，允许PWA缓存响应
    res.setHeader('Cache-Control', 'public, max-age=60'); // 允许缓存60秒
    
    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        // 从请求路径中提取飞书 API 路径
        const path = req.query.path;
        
        if (!path) {
            return res.status(400).json({ error: '缺少 path 参数' });
        }
        
        const feishuUrl = `https://open.feishu.cn/open-apis/${path}`;
        console.log('代理请求到:', feishuUrl);
        
        // 构建请求选项
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // 添加授权头
        if (req.headers.authorization) {
            fetchOptions.headers.Authorization = req.headers.authorization;
        }
        
        // 添加请求体（如果不是GET或HEAD请求）
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }
        
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        fetchOptions.signal = controller.signal;
        
        try {
            // 发送请求
            const response = await fetch(feishuUrl, fetchOptions);
            clearTimeout(timeoutId); // 清除超时
            
            // 获取响应
            const data = await response.json();
            
            // 返回响应
            res.status(response.status).json(data);
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                console.error('请求超时:', feishuUrl);
                return res.status(504).json({
                    code: -1,
                    msg: '请求超时，请检查网络连接',
                    error: 'Gateway Timeout'
                });
            }
            
            // 处理网络错误
            console.error('API请求网络错误:', fetchError);
            return res.status(502).json({
                code: -1,
                msg: '无法连接到飞书服务器',
                error: fetchError.message
            });
        }
    } catch (error) {
        console.error('API请求处理错误:', error);
        return res.status(500).json({ 
            code: -1,
            msg: 'API请求处理失败',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
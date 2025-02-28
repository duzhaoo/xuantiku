const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    
    // 设置缓存控制头，允许PWA应用缓存
    res.setHeader('Cache-Control', 'public, max-age=7200'); // 允许缓存2小时
    
    // 处理 OPTIONS 请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    try {
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
            const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "app_id": "cli_a73f58b52cfb100d",
                    "app_secret": "YZAtETOOlJBvfq6lnzMQLF3eGX6Bxk6Z"
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // 清除超时
            
            if (!response.ok) {
                throw new Error(`飞书API返回错误状态: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`飞书API错误: ${data.msg}`);
            }
            
            // 设置一个较长的缓存时间，但要小于令牌的有效期
            const expiresIn = data.expire || 7200;
            res.setHeader('Cache-Control', `public, max-age=${expiresIn - 600}`); // 比过期时间提前10分钟
            
            res.status(200).json(data);
        } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                console.error('获取访问令牌请求超时');
                return res.status(504).json({
                    code: -1,
                    msg: '请求超时，请检查网络连接',
                    error: 'Gateway Timeout'
                });
            }
            
            // 处理网络错误
            console.error('获取访问令牌网络错误:', fetchError);
            return res.status(502).json({
                code: -1,
                msg: '无法连接到飞书服务器',
                error: fetchError.message
            });
        }
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        res.status(500).json({ 
            code: -1,
            msg: '获取访问令牌失败', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
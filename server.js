const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 获取飞书访问令牌
app.post('/api/get-feishu-token', async (req, res) => {
    try {
        const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "app_id": "cli_a73f58b52cfb100d",
                "app_secret": "YZAtETOOlJBvfq6lnzMQLF3eGX6Bxk6Z"
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('获取访问令牌失败:', error);
        res.status(500).json({ error: '获取访问令牌失败', message: error.message });
    }
});

// 代理飞书API请求
app.all('/api/feishu/*', async (req, res) => {
    try {
        // 修复URL构建
        const feishuUrl = `https://open.feishu.cn/open-apis${req.url.replace('/api/feishu', '')}`;
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
        
        console.log('请求选项:', {
            method: fetchOptions.method,
            headers: fetchOptions.headers,
            body: fetchOptions.body
        });
        
        // 发送请求
        const response = await fetch(feishuUrl, fetchOptions);
        console.log('响应状态:', response.status);
        
        // 获取响应
        const data = await response.json();
        console.log('响应数据:', data);
        
        // 返回响应
        res.json(data);
    } catch (error) {
        console.error('API请求失败:', error);
        res.status(500).json({ 
            error: 'API请求失败', 
            message: error.message,
            stack: error.stack
        });
    }
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        error: '服务器错误',
        message: err.message,
        stack: err.stack
    });
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
}); 
# HD协同应用 - PWA版本

这是HD协同应用的PWA增强版本，提供离线访问、本地数据存储和应用安装功能。

## 功能特点

- **离线工作能力**：即使在没有网络连接的情况下，也能查看和编辑主题
- **后台同步**：在恢复网络连接后，自动同步离线期间所做的更改
- **可安装**：可以将应用添加到桌面/主屏幕，提供类似原生应用的体验
- **响应式设计**：适应各种屏幕尺寸和设备
- **暗色模式支持**：自动适应系统的亮/暗色模式设置

## 技术实现

- **Service Worker**：处理资源缓存和离线请求
- **IndexedDB**：提供强大的客户端存储功能
- **Web App Manifest**：定义应用元数据，支持安装到主屏幕
- **后台同步**：使用Background Sync API在网络恢复时同步数据
- **飞书API集成**：使用飞书多维表格作为数据存储和协作平台

## 安装部署

### 本地开发

1. 克隆项目仓库
2. 安装依赖：`npm install`
3. 生成PWA图标（可选）：`node generate-icons.js`
4. 启动开发服务器：`npm start`
5. 访问 http://localhost:3000

### 部署到Vercel

1. 安装Vercel CLI：`npm install -g vercel`
2. 确保已经登录Vercel：`vercel login`
3. 部署应用：`npm run deploy` 或 `vercel --prod`

## 开发指南

### 文件结构

- `index.html` - 应用主页面
- `styles.css` - 样式文件
- `script.js` - 主要JavaScript逻辑
- `service-worker.js` - PWA离线功能和缓存处理
- `manifest.json` - PWA应用清单
- `idb-helper.js` - IndexedDB数据存储助手
- `api/` - Vercel Serverless API函数
  - `get-feishu-token.js` - 获取飞书访问令牌
  - `feishu-proxy.js` - 飞书API代理

### PWA图标

应用需要多个尺寸的图标来支持不同设备。我们提供了两种方式生成图标：

1. 使用`generate-icons.js`脚本自动生成简单的文本图标
2. 使用设计工具创建自定义图标，并放置在`icons/`目录下

生成图标需要安装canvas库：`npm install canvas --save-dev`

### 离线功能开发

如果需要修改或扩展离线功能，可以编辑以下文件：

- `service-worker.js` - 修改缓存策略和离线处理逻辑
- `idb-helper.js` - 调整本地数据存储结构
- `script.js` - 修改离线和在线状态的处理逻辑

## 用户指南

### 安装应用

在支持PWA的浏览器中（如Chrome、Edge、Safari等），访问应用页面后：

1. 等待应用提示"添加到主屏幕"或"安装应用"
2. 点击"安装"按钮
3. 应用将会安装到您的设备上，可以从桌面/主屏幕启动

### 离线使用

1. 首次使用时，应用会缓存必要的资源
2. 离线时，您仍然可以查看已加载的主题
3. 您可以创建、编辑或删除主题，这些更改会保存在本地
4. 当网络恢复时，应用会自动同步这些更改到服务器

## 技术支持与问题反馈

如有问题或建议，请通过以下方式联系我们：

- 提交Issue到项目仓库
- 发送邮件到[support@example.com](mailto:support@example.com)

## 许可证

[MIT License](LICENSE)

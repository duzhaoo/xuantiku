const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// 创建图标目录
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// 图标尺寸
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 生成图标
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景
  ctx.fillStyle = '#4a6cf7';
  ctx.fillRect(0, 0, size, size);
  
  // HD文字
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size / 2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HD', size / 2, size / 2);
  
  // 创建文件流
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  
  console.log(`生成图标: icon-${size}x${size}.png`);
});

console.log('所有PWA图标已生成！');

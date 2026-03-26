import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// 用户提供的图片路径
const inputImage = '/home/tenbox/.copaw/media/om_x100b537d016aecb0b2dc93234718eb0_img_v3_02105_1c210436-9c55-44af-9b91-d309a14386ag.jpg';

// 输出目录
const outputDir = '/var/www/ckanim/public/carousel-images';

async function processCarouselImage() {
  try {
    console.log('📷 处理轮播图...');
    console.log('输入:', inputImage);
    console.log('输出目录:', outputDir);

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('✅ 创建输出目录');
    }

    // 生成文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const baseFilename = `${timestamp}-${randomStr}`;

    // 调整为轮播图尺寸（1200x400）
    const jpgPath = path.join(outputDir, `${baseFilename}.jpg`);
    const webpPath = path.join(outputDir, `${baseFilename}.webp`);

    // 生成 JPG
    await sharp(inputImage)
      .resize(1200, 400, { fit: 'fill' })
      .jpeg({ quality: 85 })
      .toFile(jpgPath);
    
    const jpgStats = fs.statSync(jpgPath);
    console.log(`✅ JPG 生成：${(jpgStats.size / 1024).toFixed(1)} KB`);

    // 生成 WebP
    await sharp(inputImage)
      .resize(1200, 400, { fit: 'fill' })
      .webp({ quality: 75 })
      .toFile(webpPath);
    
    const webpStats = fs.statSync(webpPath);
    console.log(`✅ WebP 生成：${(webpStats.size / 1024).toFixed(1)} KB`);

    // 生成 URL
    const jpgUrl = `https://anick.cn/static/carousel-images/${baseFilename}.jpg`;
    const webpUrl = `https://anick.cn/static/carousel-images/${baseFilename}.webp`;

    console.log('\n📋 轮播图信息:');
    console.log('JPG URL:', jpgUrl);
    console.log('WebP URL:', webpUrl);
    console.log('\n💡 提示：请使用系统管理员账号登录后台，在轮播图管理页面使用 JPG URL 创建轮播图');

  } catch (error) {
    console.error('❌ 处理失败:', error);
    process.exit(1);
  }
}

processCarouselImage();

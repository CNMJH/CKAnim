import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db';
import { requireSystemAdmin } from '../middleware/auth';
import { getUploadToken, getFileUrl } from '../lib/qiniu';
import path from 'path';
import fs from 'fs';

/**
 * 轮播图管理员路由（后台使用）
 * 注册路径：/api/admin/carousels/*
 */
export const carouselRoutes: FastifyPluginAsync = async (server) => {

  /**
   * POST /api/admin/carousels/upload
   * 上传图片（本地存储，避免七牛云认证问题）
   */
  server.post('/upload', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({ 
            error: 'Bad Request',
            message: '未找到上传文件' 
          });
        }
        
        // 验证文件类型
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedMimes.includes(data.mimetype)) {
          return reply.code(400).send({ 
            error: 'Bad Request',
            message: '只支持图片文件（JPG, PNG, WebP, GIF）' 
          });
        }
        
        // 生成文件名
        const timestamp = Date.now();
        const ext = path.extname(data.filename);
        const filename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        
        // 保存到本地
        const uploadDir = '/var/www/ckanim/public/carousel-images';
        const filePath = path.join(uploadDir, filename);
        
        // 确保目录存在
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 保存文件
        await fs.promises.writeFile(filePath, data.file);
        
        // 生成 URL
        const url = `https://anick.cn/static/carousel-images/${filename}`;
        
        return reply.send({ url });
      } catch (error: any) {
        request.log.error('上传图片失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });
  /**
   * GET /api/carousels
   * 获取所有轮播图（支持过滤过期和未激活）
   */
  server.get('/', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const { active, includeExpired } = request.query as any;
        
        const where: any = {};
        
        // 过滤激活状态
        if (active !== undefined) {
          where.active = active === 'true';
        }
        
        // 不过滤过期时间（默认包含所有）
        if (includeExpired !== 'true') {
          where.endTime = { gte: new Date() };
        }
        
        const carousels = await prisma.carousel.findMany({
          where,
          orderBy: [
            { order: 'asc' },
            { createdAt: 'desc' },
          ],
        });
        
        return reply.send({ carousels });
      } catch (error: any) {
        request.log.error('获取轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });
  /**
   * POST /api/carousels
   * 创建新轮播图
   */
  server.post('/', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const body = request.body as any;
        const { title, imageUrl, targetUrl, duration, order = 0, isDefault = false } = body;
        
        // 验证必填字段
        if (!title || !imageUrl) {
          return reply.code(400).send({ 
            error: 'Bad Request',
            message: '标题和图片 URL 为必填项' 
          });
        }
        
        // 计算结束时间
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration || 24) * 60 * 60 * 1000);
        
        // 如果是默认轮播图，取消其他默认轮播图
        if (isDefault) {
          await prisma.carousel.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          });
        }
        
        const carousel = await prisma.carousel.create({
          data: {
            title,
            imageUrl,
            targetUrl: targetUrl || null,
            duration: duration || 24,
            order,
            startTime,
            endTime,
            active: true,
            isDefault,
          },
        });
        
        return reply.code(201).send({ carousel });
      } catch (error: any) {
        request.log.error('创建轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });

  /**
   * PUT /api/carousels/:id
   * 更新轮播图
   */
  server.put('/:id', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const { id } = request.params as any;
        const body = request.body as any;
        const { title, imageUrl, targetUrl, duration, order, active, isDefault } = body;
        
        // 检查轮播图是否存在
        const existing = await prisma.carousel.findUnique({
          where: { id: parseInt(id) },
        });
        
        if (!existing) {
          return reply.code(404).send({ 
            error: 'Not Found',
            message: '轮播图不存在' 
          });
        }
        
        // 如果是默认轮播图，取消其他默认轮播图
        if (isDefault && !existing.isDefault) {
          await prisma.carousel.updateMany({
            where: { 
              isDefault: true,
              id: { not: parseInt(id) },
            },
            data: { isDefault: false },
          });
        }
        
        // 如果修改了时长，重新计算结束时间
        let endTime = existing.endTime;
        if (duration && duration !== existing.duration) {
          endTime = new Date(existing.startTime.getTime() + duration * 60 * 60 * 1000);
        }
        
        const carousel = await prisma.carousel.update({
          where: { id: parseInt(id) },
          data: {
            ...(title !== undefined && { title }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(targetUrl !== undefined && { targetUrl }),
            ...(duration !== undefined && { duration, endTime }),
            ...(order !== undefined && { order }),
            ...(active !== undefined && { active }),
            ...(isDefault !== undefined && { isDefault }),
          },
        });
        
        return reply.send({ carousel });
      } catch (error: any) {
        request.log.error('更新轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });

  /**
   * DELETE /api/carousels/:id
   * 删除轮播图
   */
  server.delete('/:id', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const { id } = request.params as any;
        
        // 检查轮播图是否存在
        const existing = await prisma.carousel.findUnique({
          where: { id: parseInt(id) },
        });
        
        if (!existing) {
          return reply.code(404).send({ 
            error: 'Not Found',
            message: '轮播图不存在' 
          });
        }
        
        // 不允许删除默认轮播图
        if (existing.isDefault) {
          return reply.code(400).send({ 
            error: 'Bad Request',
            message: '不能删除默认轮播图' 
          });
        }
        
        await prisma.carousel.delete({
          where: { id: parseInt(id) },
        });
        
        return reply.code(204).send();
      } catch (error: any) {
        request.log.error('删除轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });

  /**
   * POST /api/carousels/:id/renew
   * 续期轮播图（从当前时间重新计算 duration）
   */
  server.post('/:id/renew', {
    preHandler: [requireSystemAdmin],
    async handler(request, reply) {
      try {
        const { id } = request.params as any;
        const { duration } = request.body as any;
        
        // 检查轮播图是否存在
        const existing = await prisma.carousel.findUnique({
          where: { id: parseInt(id) },
        });
        
        if (!existing) {
          return reply.code(404).send({ 
            error: 'Not Found',
            message: '轮播图不存在' 
          });
        }
        
        const newDuration = duration || existing.duration;
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + newDuration * 60 * 60 * 1000);
        
        const carousel = await prisma.carousel.update({
          where: { id: parseInt(id) },
          data: {
            duration: newDuration,
            startTime,
            endTime,
            active: true,
          },
        });
        
        return reply.send({ carousel });
      } catch (error: any) {
        request.log.error('续期轮播图失败:', error);
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    },
  });
};

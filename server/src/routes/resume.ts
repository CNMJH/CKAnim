import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

// 默认简历内容结构
const defaultContent = {
  personal: {
    name: '',
    phone: '',
    email: '',
    avatar: '',
    location: '',
    website: '',
    summary: '',
  },
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  interests: [],
};

export const resumeRoutes: FastifyPluginAsync = async (server) => {
  // 获取用户所有简历
  server.get('/list', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const resumes = await prisma.resume.findMany({
        where: { userId: request.user!.id },
        orderBy: { updatedAt: 'desc' },
      });
      reply.send(resumes);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to get resumes' });
    }
  });

  // 获取单个简历
  server.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const resume = await prisma.resume.findFirst({
        where: { id: parseInt(id), userId: request.user!.id },
      });
      if (!resume) {
        return reply.code(404).send({ error: 'Resume not found' });
      }
      reply.send(resume);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to get resume' });
    }
  });

  // 创建简历
  server.post('/create', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { name, template, content } = request.body as {
        name: string;
        template?: string;
        content?: string;
      };

      if (!name) {
        return reply.code(400).send({ error: 'Name is required' });
      }

      const resume = await prisma.resume.create({
        data: {
          userId: request.user!.id,
          name,
          template: template || 'modern',
          content: content || JSON.stringify(defaultContent),
        },
      });
      reply.send(resume);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to create resume' });
    }
  });

  // 更新简历
  server.put('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, template, content, isDefault } = request.body as {
        name?: string;
        template?: string;
        content?: string;
        isDefault?: boolean;
      };

      // 检查简历是否属于当前用户
      const existing = await prisma.resume.findFirst({
        where: { id: parseInt(id), userId: request.user!.id },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Resume not found' });
      }

      // 如果设置为默认，先取消其他默认
      if (isDefault) {
        await prisma.resume.updateMany({
          where: { userId: request.user!.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      const resume = await prisma.resume.update({
        where: { id: parseInt(id) },
        data: {
          name: name ?? existing.name,
          template: template ?? existing.template,
          content: content ?? existing.content,
          isDefault: isDefault ?? existing.isDefault,
        },
      });
      reply.send(resume);
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to update resume' });
    }
  });

  // 删除简历
  server.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // 检查是否属于当前用户
      const existing = await prisma.resume.findFirst({
        where: { id: parseInt(id), userId: request.user!.id },
      });

      if (!existing) {
        return reply.code(404).send({ error: 'Resume not found' });
      }

      await prisma.resume.delete({
        where: { id: parseInt(id) },
      });
      reply.send({ message: 'Deleted successfully' });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({ error: 'Failed to delete resume' });
    }
  });

  // 获取模板列表
  server.get('/templates', async (request, reply) => {
    const templates = [
      { id: 'classic', name: 'Classic', category: '传统经典', color: '#333333', description: '简洁黑白，传统布局' },
      { id: 'formal', name: 'Formal', category: '传统经典', color: '#1a365d', description: '正式商务，稳重设计' },
      { id: 'academic', name: 'Academic', category: '传统经典', color: '#2d3748', description: '学术风格，适合论文发表' },
      { id: 'modern', name: 'Modern', category: '现代简约', color: '#3182ce', description: '现代排版，清晰分层' },
      { id: 'minimalist', name: 'Minimalist', category: '现代简约', color: '#000000', description: '极简设计，突出内容' },
      { id: 'clean', name: 'Clean', category: '现代简约', color: '#48bb78', description: '清爽白底，简约线条' },
      { id: 'creative', name: 'Creative', category: '创意设计', color: '#ed8936', description: '大胆配色，个性布局' },
      { id: 'colorful', name: 'Colorful', category: '创意设计', color: '#9f7aea', description: '多彩渐变，视觉冲击' },
      { id: 'bold', name: 'Bold', category: '创意设计', color: '#e53e3e', description: '强调重点，对比强烈' },
      { id: 'developer', name: 'Developer', category: '技术专业', color: '#667eea', description: '技术极简，技能矩阵' },
      { id: 'techblue', name: 'TechBlue', category: '技术专业', color: '#2563eb', description: '科技蓝主题，代码风格' },
      { id: 'onepage', name: 'OnePage', category: '特殊用途', color: '#374151', description: '单页浓缩，信息紧凑' },
      { id: 'english', name: 'English', category: '特殊用途', color: '#1e40af', description: '英文简历样式' },
    ];
    reply.send(templates);
  });
};
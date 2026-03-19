import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

console.log('🏷️  Loading tags routes...');

export const tagRoutes: FastifyPluginAsync = async (server) => {
  console.log('✅ Tags routes registered!');
  
  // 获取所有标签
  server.get('/tags', async (_request, reply) => {
    try {
      const tags = await prisma.videoTag.findMany({
        orderBy: { name: 'asc' },
      });

      reply.send({ tags });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get tags',
      });
    }
  });

  // 创建标签
  server.post(
    '/tags',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { name } = request.body as { name: string };

        if (!name || !name.trim()) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Tag name is required',
          });
        }

        // 检查是否已存在
        const existing = await prisma.videoTag.findUnique({
          where: { name: name.trim() },
        });

        if (existing) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Tag already exists',
          });
        }

        const tag = await prisma.videoTag.create({
          data: { name: name.trim() },
        });

        reply.code(201).send(tag);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create tag',
        });
      }
    }
  );

  // 更新标签
  server.put(
    '/tags/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tagId = parseInt(id);
        const { name } = request.body as { name: string };

        if (!name || !name.trim()) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Tag name is required',
          });
        }

        const tag = await prisma.videoTag.update({
          where: { id: tagId },
          data: { name: name.trim() },
        });

        reply.send(tag);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update tag',
        });
      }
    }
  );

  // 删除标签
  server.delete(
    '/tags/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tagId = parseInt(id);

        await prisma.videoTag.delete({
          where: { id: tagId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete tag',
        });
      }
    }
  );
};

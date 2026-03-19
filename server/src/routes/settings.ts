import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

export const settingsRoutes: FastifyPluginAsync = async (server) => {
  // 获取所有设置（公开 API，前台需要）
  server.get('/settings', async (request, reply) => {
    try {
      const settings = await prisma.siteSettings.findMany({
        orderBy: { key: 'asc' },
      });

      // 转换为键值对格式
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = {
          value: setting.value,
          description: setting.description,
          updatedAt: setting.updatedAt,
        };
        return acc;
      }, {} as any);

      reply.send({ settings: settingsMap });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch settings',
      });
    }
  });

  // 获取单个设置（公开 API）
  server.get('/settings/:key', async (request, reply) => {
    try {
      const { key } = request.params as { key: string };
      
      const setting = await prisma.siteSettings.findUnique({
        where: { key },
      });

      if (!setting) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Setting not found',
        });
      }

      reply.send({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updatedAt,
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch setting',
      });
    }
  });

  // 更新设置（需要认证）
  server.put(
    '/settings/:key',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { key } = request.params as { key: string };
        const { value, description } = request.body as {
          value: string;
          description?: string;
        };

        if (value === undefined) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Value is required',
          });
        }

        const setting = await prisma.siteSettings.upsert({
          where: { key },
          update: { value, description },
          create: { key, value, description: description || '' },
        });

        reply.send({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedAt: setting.updatedAt,
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update setting',
        });
      }
    }
  );

  // 批量更新设置（需要认证）
  server.post(
    '/settings/batch',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { settings } = request.body as {
          settings: Array<{
            key: string;
            value: string;
            description?: string;
          }>;
        };

        if (!settings || !Array.isArray(settings)) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Settings array is required',
          });
        }

        // 使用事务批量更新
        const updatedSettings = await prisma.$transaction(
          settings.map((setting) =>
            prisma.siteSettings.upsert({
              where: { key: setting.key },
              update: { 
                value: setting.value, 
                description: setting.description || '' 
              },
              create: { 
                key: setting.key, 
                value: setting.value, 
                description: setting.description || '' 
              },
            })
          )
        );

        reply.send({
          settings: updatedSettings.map((s) => ({
            key: s.key,
            value: s.value,
            description: s.description,
            updatedAt: s.updatedAt,
          })),
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to batch update settings',
        });
      }
    }
  );

  // 删除设置（需要认证）
  server.delete(
    '/settings/:key',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { key } = request.params as { key: string };

        await prisma.siteSettings.delete({
          where: { key },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete setting',
        });
      }
    }
  );

  // 初始化默认设置（需要认证）
  server.post(
    '/settings/init',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const defaultSettings = [
          {
            key: 'siteName',
            value: 'CKAnim',
            description: '网站名称',
          },
          {
            key: 'siteNamePosition',
            value: 'header', // header, footer, both
            description: '网站名称显示位置',
          },
          {
            key: 'siteFooter',
            value: JSON.stringify({
              text: '© 2026 CKAnim. All rights reserved.',
              links: [
                { text: '关于我们', url: '/about' },
                { text: '联系方式', url: '/contact' },
              ],
            }),
            description: '网站页脚信息（JSON 格式）',
          },
          {
            key: 'siteAnnouncement',
            value: JSON.stringify({
              text: '随机参考，每日一看',
              enabled: true,
              color: '#666',
            }),
            description: '全站公告/提醒（JSON 格式）',
          },
        ];

        const settings = await prisma.$transaction(
          defaultSettings.map((setting) =>
            prisma.siteSettings.upsert({
              where: { key: setting.key },
              update: { 
                value: setting.value, 
                description: setting.description 
              },
              create: { 
                key: setting.key, 
                value: setting.value, 
                description: setting.description 
              },
            })
          )
        );

        reply.send({
          settings: settings.map((s) => ({
            key: s.key,
            value: s.value,
            description: s.description,
            updatedAt: s.updatedAt,
          })),
          message: '默认设置已初始化',
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to initialize settings',
        });
      }
    }
  );
};

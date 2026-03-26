import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  getUploadToken,
  generateFileKey,
  getFileUrl,
  deleteFile,
  extractKeyFromUrl,
} from '../lib/qiniu.js';
import {
  generateThumbnail,
  uploadThumbnailToQiniu,
  cleanupTempFile,
  generateWebpCoverUrl,
} from '../lib/thumbnail.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

export const videoRoutes: FastifyPluginAsync = async (server) => {
  // 获取视频列表（支持多条件筛选）
  server.get('/videos', async (request, reply) => {
    try {
      const { 
        gameId, 
        categoryId,
        characterId,
        actionId,
        published, 
        page = 1, 
        limit = 20 
      } = request.query as unknown as {
        gameId?: string;
        categoryId?: string;
        characterId?: string;
        actionId?: string;
        published?: boolean;
        page?: number;
        limit?: number;
      };

      const where: any = {};
      if (gameId) {
        where.gameId = parseInt(gameId);
      }
      if (published !== undefined) {
        where.published = published;
      }
      
      // 按动作筛选
      if (actionId) {
        where.actionId = parseInt(actionId);
      }
      
      // 按角色筛选（通过动作关联）
      if (characterId && !actionId) {
        // 需要先获取该角色的所有动作，再筛选视频
        const characterActions = await prisma.action.findMany({
          where: { characterId: parseInt(characterId) },
          select: { id: true },
        });
        const actionIds = characterActions.map(a => a.id);
        if (actionIds.length > 0) {
          where.actionId = { in: actionIds };
        } else {
          // 该角色没有动作，返回空结果
          return reply.send({
            videos: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
            },
          });
        }
      }
      
      // 按分类筛选（通过视频 - 分类关联表）
      if (categoryId) {
        where.categories = {
          some: {
            id: parseInt(categoryId),
          },
        };
      }

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: { order: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            action: {
              select: {
                id: true,
                name: true,
                characterId: true,
                character: {
                  select: {
                    id: true,
                    name: true,
                    gameId: true,
                  },
                },
              },
            },
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },

          },
        }),
        prisma.video.count({ where }),
      ]);

      reply.send({
        videos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get videos',
      });
    }
  });

  // 搜索视频（支持按标签搜索）
  server.get('/videos/search', async (request, reply) => {
    try {
      const { q, page = 1, limit = 20 } = request.query as unknown as {
        q?: string;
        page?: number;
        limit?: number;
      };

      const where: any = {
        published: true, // 只搜索已发布的视频
      };

      if (q) {
        // 搜索标题或标签
        const videos = await prisma.video.findMany({
          where: {
            ...where,
            OR: [
              { title: { contains: q } },
              {
                VideoTags: {
                  some: {
                    name: { contains: q },
                  },
                },
              },
            ],
          },
          include: {
            VideoTags: true,
            game: true,
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.video.count({
          where: {
            ...where,
            OR: [
              { title: { contains: q } },
              {
                VideoTags: {
                  some: {
                    name: { contains: q },
                  },
                },
              },
            ],
          },
        });

        reply.send({
          videos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } else {
        // 没有搜索词，返回所有已发布视频
        const videos = await prisma.video.findMany({
          where,
          include: {
            VideoTags: true,
            game: true,
          },
          skip: (page - 1) * limit,
          take: limit,
        });

        const total = await prisma.video.count({ where });

        reply.send({
          videos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search videos',
      });
    }
  });

  // 获取上传凭证
  server.post(
    '/videos/upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { filename, gameId, categoryIds = [], actionId } = request.body as {
          filename: string;
          gameId?: number;
          categoryIds?: number[];
          actionId?: number;
        };

        server.log.info('[Upload Token] 请求参数:', JSON.stringify({
          filename,
          gameId,
          categoryIds,
          actionId,
          categoryIdsLength: categoryIds.length,
          hasActionId: !!actionId,
        }));

        if (!filename) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Filename is required',
          });
        }

        // 如果提供了 actionId，自动获取分类信息
        let finalCategoryIds = categoryIds;
        if (actionId && !categoryIds.length) {
          // 从动作→角色→分类 自动获取
          const action = await prisma.action.findUnique({
            where: { id: actionId },
            include: {
              character: {
                select: {
                  categoryId: true,
                },
              },
            },
          });
          
          server.log.info('[Upload Token] 从 actionId 获取分类:', {
            actionId,
            foundAction: !!action,
            categoryId: action?.character?.categoryId,
          });
          
          if (action && action.character?.categoryId) {
            finalCategoryIds = [action.character.categoryId];
          }
        }

        // 获取分类信息（用于生成文件夹路径）
        let categoryPath = '';
        if (finalCategoryIds.length > 0) {
          const categories = await prisma.gameCategory.findMany({
            where: { id: { in: finalCategoryIds } },
            orderBy: { level: 'asc' },
          });
          
          server.log.info('[Upload Token] 查询分类:', JSON.stringify({
            categoryIds: finalCategoryIds,
            foundCategories: categories.map(c => ({ id: c.id, name: c.name, level: c.level })),
          }));
          
          // 取最高层级的分类作为文件夹路径
          const maxLevelCategory = categories.reduce((max, cat) => 
            cat.level > (max?.level || 0) ? cat : max, null);
          
          if (maxLevelCategory) {
            // 构建完整分类路径（从根到当前层级）
            const pathParts = [];
            let current = maxLevelCategory;
            
            // 向上追溯父分类，构建完整路径
            while (current) {
              pathParts.unshift(current.name);
              if (current.parentId) {
                current = await prisma.gameCategory.findUnique({
                  where: { id: current.parentId },
                });
              } else {
                break;
              }
            }
            
            categoryPath = pathParts.join('/');
          }
        }

        server.log.info('[Upload Token] 生成的分类路径:', JSON.stringify({
          categoryPath,
          finalCategoryIds,
        }));

        // 生成文件 key（带分类路径）
        const key = generateFileKey(filename, gameId, categoryPath);

        server.log.info('[Upload Token] 生成的文件 key: ' + key);
        server.log.info('[Upload Token] 文件 key 详情:', JSON.stringify({
          key,
          gameId,
          categoryPath,
          keyLength: key.length,
        }));

        // 生成上传凭证
        const token = getUploadToken(key);

        server.log.info('[Upload Token] 返回上传凭证:', JSON.stringify({
          key,
          tokenLength: token.length,
        }));

        reply.send({
          token,
          key,
          url: getFileUrl(key),
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate upload token',
        });
      }
    }
  );

  // ===== 获取封面图上传凭证 =====
  server.post(
    '/videos/cover-upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { coverKey } = request.body as { coverKey: string };

        if (!coverKey) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'coverKey is required',
          });
        }

        // 生成上传凭证
        const token = getUploadToken(coverKey);

        reply.send({
          token,
          key: coverKey,
          url: getFileUrl(coverKey),
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate cover upload token',
        });
      }
    }
  );

  // ===== 创建视频记录（上传完成后调用，支持自动生成封面） =====
  server.post(
    '/videos',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const body = request.body as any;
        const {
          title,
          description,
          gameId,
          characterId,
          actionId,
          qiniuKey,
          qiniuUrl,
          duration,
          thumbnail,
          coverUrl,
          categoryIds = [],
          tagIds = [],
          order = 0,
          generateCover = true,
        } = body;

        server.log.info(`[Video Create] Request body:`, JSON.stringify(body, null, 2));
        server.log.info(`[Video Create] title=${title}, gameId=${gameId}, characterId=${characterId}, actionId=${actionId}, qiniuKey=${qiniuKey}`);

        // 必选参数验证
        if (!title || !gameId || !qiniuKey || !qiniuUrl) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Title, gameId, qiniuKey, and qiniuUrl are required',
          });
        }

        // ⭐ 游戏、角色、动作必选验证
        if (!characterId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'characterId is required. Please select a character.',
          });
        }
        if (!actionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'actionId is required. Please select an action.',
          });
        }

        // 使用事务确保视频创建和关联的原子性
        const video = await prisma.$transaction(async (tx) => {
          // 1. 验证游戏
          const game = await tx.game.findUnique({
            where: { id: gameId },
          });

          if (!game) {
            throw new Error('Game not found');
          }

          // 2. 验证角色
          const character = await tx.character.findUnique({
            where: { id: characterId },
          });

          if (!character) {
            throw new Error(`Character ${characterId} not found`);
          }

          // 验证角色属于这个游戏
          if (character.gameId !== gameId) {
            throw new Error(`Character ${characterId} does not belong to game ${gameId}`);
          }

          // 3. 验证动作
          const action = await tx.action.findUnique({
            where: { id: actionId },
          });

          if (!action) {
            throw new Error(`Action ${actionId} not found`);
          }

          // 验证动作属于这个角色
          if (action.characterId !== characterId) {
            throw new Error(`Action ${actionId} does not belong to character ${characterId}`);
          }

          // 验证动作是否已经有视频（1 对 1 关系）
          if (action.video) {
            throw new Error(`Action ${action.name} already has a video. Each action can only have one video.`);
          }

          server.log.info(`[Video Create] Validated: game=${game.name}, character=${character.name}, action=${action.name}`);

          // 4. 生成封面图（JPG + WebP）
          let finalCoverUrl = coverUrl;
          let finalCoverUrlJpg = coverUrl;
          let finalCoverUrlWebp = null;
          
          if (generateCover && !coverUrl) {
            try {
              const tempDir = path.join(os.tmpdir(), 'ckanim-thumbnails');
              const videoFilename = path.basename(qiniuKey);
              const tempVideoPath = path.join(tempDir, videoFilename);

              if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
              }

              const { execSync } = await import('child_process');
              execSync(`curl -s -o "${tempVideoPath}" "${qiniuUrl}"`, {
                stdio: 'pipe',
              });

              // 生成 JPG 和 WebP 两种格式
              const thumbnailPaths = await generateThumbnail(tempVideoPath, tempDir);
              const thumbnailResult = await uploadThumbnailToQiniu(thumbnailPaths, qiniuKey);
              
              finalCoverUrl = thumbnailResult.jpg.url;
              finalCoverUrlJpg = thumbnailResult.jpg.url;
              finalCoverUrlWebp = thumbnailResult.webp.url;

              cleanupTempFile(tempVideoPath);
              cleanupTempFile(thumbnailPaths.jpg);
              cleanupTempFile(thumbnailPaths.webp);
            } catch (err) {
              server.log.error('Failed to generate thumbnail:', err);
              // 封面生成失败不影响视频创建
            }
          }

          // 5. 创建视频记录（关联到动作）
          // 如果没有提供 categoryIds，但有 actionId，自动从动作→角色→分类获取
          let finalCategoryIds = categoryIds;
          if (categoryIds.length === 0 && actionId) {
            const actionForCategory = await tx.action.findUnique({
              where: { id: actionId },
              include: {
                character: {
                  select: {
                    categoryId: true,
                  },
                },
              },
            });
            if (actionForCategory?.character?.categoryId) {
              finalCategoryIds = [actionForCategory.character.categoryId];
            }
          }

          const video = await tx.video.create({
            data: {
              title,
              description,
              gameId,
              qiniuKey,
              qiniuUrl,
              duration,
              thumbnail,
              coverUrl: finalCoverUrl,
              coverUrlJpg: finalCoverUrlJpg,
              coverUrlWebp: finalCoverUrlWebp,
              order,
              published: true, // ⭐ 默认发布，前台可访问
              actionId, // ⭐ 直接关联到动作
              categories: finalCategoryIds.length > 0 ? {
                connect: finalCategoryIds.map((id: number) => ({ id })),
              } : undefined,
              VideoTags: tagIds.length > 0 ? {
                connect: tagIds.map((id: number) => ({ id })),
              } : undefined,
            },
            include: {
              categories: true,
              VideoTags: true,
              action: true,
            },
          });

          server.log.info(`[Video Create] Video created: id=${video.id}, actionId=${actionId}`);

          return video;
        });

        server.log.info(`[Video Create] Completed successfully: id=${video.id}`);

        reply.code(201).send(video);
      } catch (error) {
        server.log.error('[Video Create] Error:', error);
        if (error.code === 'P2002') {
          reply.code(409).send({
            error: 'Conflict',
            message: 'A video with this key already exists',
          });
        } else {
          reply.code(500).send({
            error: 'Internal Server Error',
            message: error.message || 'Failed to create video',
          });
        }
      }
    },
  );

  // 更新视频
  // 替换视频（上传新视频，生成新封面，删除旧文件）
  server.post(
    '/videos/:id/replace',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const videoId = parseInt(id);
        const {
          qiniuKey,
          qiniuUrl,
          duration,
          generateCover = true,
        } = request.body as {
          qiniuKey: string;
          qiniuUrl: string;
          duration?: number;
          generateCover?: boolean;
        };

        // 必选参数验证
        if (!qiniuKey || !qiniuUrl) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'qiniuKey and qiniuUrl are required',
          });
        }

        // 查找原视频
        const oldVideo = await prisma.video.findUnique({
          where: { id: videoId },
          include: {
            action: true,
          },
        });

        if (!oldVideo) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Video not found',
          });
        }

        server.log.info(`[Video Replace] Replacing video ${videoId}, old qiniuKey: ${oldVideo.qiniuKey}`);

        let coverUrl = oldVideo.coverUrl;
        let coverUrlJpg = oldVideo.coverUrlJpg;
        let coverUrlWebp = oldVideo.coverUrlWebp;

        // 生成新封面图
        if (generateCover) {
          try {
            server.log.info('[Video Replace] Generating new thumbnail...');
            
            // 生成缩略图
            const tempThumbnailPath = await generateThumbnail(qiniuUrl, videoId);
            server.log.info('[Video Replace] Thumbnail generated at:', tempThumbnailPath);

            // 上传缩略图到七牛云
            const { key: coverKey, url: coverUploadUrl } = await uploadThumbnailToQiniu(
              tempThumbnailPath,
              oldVideo.gameId,
              oldVideo.title
            );
            server.log.info('[Video Replace] Cover uploaded to Qiniu:', coverKey);

            // 清理临时文件
            await cleanupTempFile(tempThumbnailPath);
            server.log.info('[Video Replace] Temp file cleaned up');

            // 生成封面 URL
            coverUrl = coverUploadUrl;
            coverUrlJpg = coverUploadUrl;
            coverUrlWebp = generateWebpCoverUrl(coverUploadUrl);
            server.log.info('[Video Replace] Cover URLs generated');
          } catch (error: any) {
            server.log.error('[Video Replace] Failed to generate cover:', error.message);
            // 封面生成失败不影响视频替换，继续使用旧封面
          }
        }

        // 删除七牛云上的旧视频文件（如果存在）
        if (oldVideo.qiniuKey) {
          try {
            await deleteFile(oldVideo.qiniuKey);
            server.log.info(`[Video Replace] Deleted old qiniu video: ${oldVideo.qiniuKey}`);
          } catch (err: any) {
            if (err.message.includes('612')) {
              server.log.warn(`[Video Replace] Old qiniu file not found (612), skipping: ${oldVideo.qiniuKey}`);
            } else {
              server.log.error(`[Video Replace] Failed to delete old qiniu video: ${oldVideo.qiniuKey}`, err);
            }
          }
        }

        // 删除七牛云上的旧封面图（如果存在）
        const oldCoverKeysToDelete: string[] = [];
        if (oldVideo.coverUrl) {
          const coverKey = extractKeyFromUrl(oldVideo.coverUrl);
          if (coverKey) oldCoverKeysToDelete.push(coverKey);
        }
        if (oldVideo.coverUrlJpg && oldVideo.coverUrlJpg !== oldVideo.coverUrl) {
          const coverKeyJpg = extractKeyFromUrl(oldVideo.coverUrlJpg);
          if (coverKeyJpg && !oldCoverKeysToDelete.includes(coverKeyJpg)) {
            oldCoverKeysToDelete.push(coverKeyJpg);
          }
        }
        if (oldVideo.coverUrlWebp && oldVideo.coverUrlWebp !== oldVideo.coverUrl) {
          const coverKeyWebp = extractKeyFromUrl(oldVideo.coverUrlWebp);
          if (coverKeyWebp && !oldCoverKeysToDelete.includes(coverKeyWebp)) {
            oldCoverKeysToDelete.push(coverKeyWebp);
          }
        }

        if (oldCoverKeysToDelete.length > 0) {
          for (const coverKey of oldCoverKeysToDelete) {
            try {
              await deleteFile(coverKey);
              server.log.info(`[Video Replace] Deleted old cover: ${coverKey}`);
            } catch (err: any) {
              if (err.message.includes('612')) {
                server.log.warn(`[Video Replace] Old cover not found (612), skipping: ${coverKey}`);
              } else {
                server.log.error(`[Video Replace] Failed to delete old cover: ${coverKey}`, err);
              }
            }
          }
        }

        // 更新视频记录
        const updatedVideo = await prisma.video.update({
          where: { id: videoId },
          data: {
            qiniuKey,
            qiniuUrl,
            duration: duration || oldVideo.duration,
            coverUrl,
            coverUrlJpg,
            coverUrlWebp,
          },
          include: {
            action: {
              select: {
                id: true,
                name: true,
                characterId: true,
                character: {
                  select: {
                    id: true,
                    name: true,
                    gameId: true,
                  },
                },
              },
            },
            game: {
              select: {
                id: true,
                name: true,
              },
            },
            categories: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        });

        server.log.info(`[Video Replace] Video ${videoId} replaced successfully`);

        reply.send(updatedVideo);
      } catch (error: any) {
        server.log.error('[Video Replace] Error:', error.message);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to replace video',
        });
      }
    }
  );

  // 更新视频信息
  server.put(
    '/videos/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const videoId = parseInt(id);
        const {
          title,
          description,
          duration,
          thumbnail,
          order,
          published,
          categoryIds,
          tagIds,
        } = request.body as {
          title?: string;
          description?: string;
          duration?: number;
          thumbnail?: string;
          order?: number;
          published?: boolean;
          categoryIds?: number[];
          tagIds?: number[];
        };

        const video = await prisma.video.findUnique({
          where: { id: videoId },
        });

        if (!video) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Video not found',
          });
        }

        const updatedVideo = await prisma.video.update({
          where: { id: videoId },
          data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(duration !== undefined && { duration }),
            ...(thumbnail !== undefined && { thumbnail }),
            ...(order !== undefined && { order }),
            ...(published !== undefined && { published }),
          },
        });

        // 同步更新 Action 名称（如果更新了 title 且有关联的 Action）
        if (title !== undefined && video.actionId) {
          await prisma.action.update({
            where: { id: video.actionId },
            data: { name: title },
          });
        }

        // 更新分类关联
        if (categoryIds !== undefined) {
          await prisma.video.update({
            where: { id: videoId },
            data: {
              categories: {
                set: categoryIds.map((id) => ({ id })),
              },
            },
          });
        }

        // 更新标签关联
        if (tagIds !== undefined) {
          await prisma.video.update({
            where: { id: videoId },
            data: {
              VideoTags: {
                set: tagIds.map((id) => ({ id })),
              },
            },
          });
        }

        reply.send(updatedVideo);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update video',
        });
      }
    }
  );

  // 删除视频
  server.delete(
    '/videos/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const videoId = parseInt(id);

        const video = await prisma.video.findUnique({
          where: { id: videoId },
          include: {
            action: true,
          },
        });

        if (!video) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Video not found',
          });
        }

        // 删除七牛云上的视频文件（文件不存在时不报错）
        if (video.qiniuKey) {
          try {
            await deleteFile(video.qiniuKey);
            server.log.info(`Deleted qiniu video: ${video.qiniuKey}`);
          } catch (err: any) {
            if (err.message.includes('612')) {
              server.log.warn(`Qiniu file not found (612), skipping: ${video.qiniuKey}`);
            } else {
              server.log.error(`Failed to delete qiniu video: ${video.qiniuKey}`, err);
            }
          }
        }

        // 删除封面图（文件不存在时不报错）
        if (video.coverUrl) {
          const coverKey = video.coverUrl.replace('http://video.jiangmeijixie.com/', '').replace('https://video.jiangmeijixie.com/', '');
          try {
            await deleteFile(coverKey);
            server.log.info(`Deleted qiniu cover: ${coverKey}`);
          } catch (err: any) {
            if (err.message.includes('612')) {
              server.log.warn(`Qiniu file not found (612), skipping: ${coverKey}`);
            } else {
              server.log.error(`Failed to delete qiniu cover: ${coverKey}`, err);
            }
          }
        }

        // 删除视频记录（动作会级联删除）
        await prisma.video.delete({
          where: { id: videoId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete video',
        });
      }
    }
  );
};

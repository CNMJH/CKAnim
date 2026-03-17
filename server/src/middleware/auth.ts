import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      role: string;
    };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await authenticate(request, reply);
  
  if (request.user?.role !== 'admin') {
    reply.code(403).send({ 
      error: 'Forbidden', 
      message: 'Admin access required' 
    });
  }
}

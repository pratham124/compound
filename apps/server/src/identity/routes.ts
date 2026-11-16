import { Me, Profile, ProfileQuery, ProfileUpdate, Unauthenticated, UserId } from '@compound/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import type pg from 'pg';

import type { Auth } from './auth.ts';
import { createProfileStore } from './profileStore.ts';

export async function sessionFor(auth: Auth, request: FastifyRequest) {
  return auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
}

async function signedInUserId(auth: Auth, request: FastifyRequest): Promise<UserId | null> {
  const session = await sessionFor(auth, request);

  return session === null ? null : UserId.parse(session.user.id);
}

export type IdentityOptions = { auth: Auth; apiPool: pg.Pool };

export const identity: FastifyPluginAsync<IdentityOptions> = async (app, { auth, apiPool }) => {
  const profiles = createProfileStore(apiPool);

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const url = new URL(request.url, `${request.protocol}://${request.headers.host}`);
      const headers = fromNodeHeaders(request.headers);

      headers.set('x-forwarded-for', request.ip);

      const init: RequestInit = { method: request.method, headers };

      if (request.body !== undefined) {
        init.body = JSON.stringify(request.body);
      }

      const response = await auth.handler(new Request(url, init));

      reply.status(response.status);
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie' && name !== 'content-length') {
          reply.header(name, value);
        }
      });
      reply.header('set-cookie', response.headers.getSetCookie());

      return reply.send(await response.text());
    },
  });

  app.withTypeProvider<ZodTypeProvider>().get(
    '/me',
    { schema: { response: { 200: Me, 401: Unauthenticated } } },
    async (request, reply) => {
      const session = await sessionFor(auth, request);

      if (session === null) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      const { id, name, email } = session.user;

      return { id: UserId.parse(id), name, email };
    },
  );
  app.withTypeProvider<ZodTypeProvider>().get(
    '/me/profile',
    { schema: { querystring: ProfileQuery, response: { 200: Profile, 401: Unauthenticated } } },
    async (request, reply) => {
      const userId = await signedInUserId(auth, request);

      if (userId === null) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      return profiles.getOrCreate(userId, request.query.timeZone);
    },
  );

  app.withTypeProvider<ZodTypeProvider>().put(
    '/me/profile',
    { schema: { body: ProfileUpdate, response: { 200: Profile, 401: Unauthenticated } } },
    async (request, reply) => {
      const userId = await signedInUserId(auth, request);

      if (userId === null) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      return profiles.setUnits(userId, request.body.units);
    },
  );
};

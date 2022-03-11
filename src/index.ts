import { rest } from 'msw';

type Method = keyof typeof rest;

export type Factories = {
  readonly [path: string]: {
    readonly [method: string]: {
      readonly [code: number]: any;
    };
  };
};

type DenormalizedFactory = {
  readonly path: string;
  readonly method: string;
  readonly responses: readonly {
    readonly status: number;
    readonly json: any;
  }[];
};

type Options = {
  /**
   * return matched response from factory.responses
   * - success: 200 ~ 399
   * - error: 400 ~ 599
   */
  statusCode?: 'success' | 'error' | number;
  baseURL?: string;
};

function getHandler<Factory extends DenormalizedFactory>(
  factory: Factory,
  { statusCode, baseURL = '' }: Options
) {
  const method = factory.method as Method;
  const url = `${baseURL}${factory.path}`;
  return rest[method](url, (_, res, ctx) => {
    const response = factory.responses.find(response => {
      switch (statusCode) {
        case 'success':
          return response.status < 400;
        case 'error':
          return 400 <= response.status;
        default:
          return response.status === statusCode;
      }
    });
    if (!response) {
      return res(
        ctx.status(500),
        ctx.text(`
      undefined statusCode: ${statusCode} on ${factory.method}: ${url}`)
      );
    }
    return res(ctx.status(response.status), ctx.json(response.json));
  });
}

function denormalize<F extends Factories>(
  factories: F
): readonly DenormalizedFactory[] {
  return Object.entries(factories).flatMap(([path, methods]) => {
    return Object.entries(methods).flatMap(([method, codes]) => ({
      path,
      method,
      responses: Object.entries(codes).map(([code, json]) => ({
        status: Number(code),
        json,
      })),
    }));
  });
}

export function getHandlers<F extends Factories>(
  factories: F,
  options: Options = { statusCode: 'success' }
) {
  return denormalize(factories).map(f => getHandler(f, options));
}

export function getHandlersWithKey<F extends Factories>(
  factories: F,
  options: Options = { statusCode: 'success' }
) {
  return getHandlers(factories, options).reduce((accum, current) => {
    const key = `${current.info.method}:${current.info.path}`;

    return {
      ...accum,
      [key]: current,
    };
  }, {});
}

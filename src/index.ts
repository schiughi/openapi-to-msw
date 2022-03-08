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
  case: 'nominal' | 'non-nominal' | number;
};

function getHandler<Factory extends DenormalizedFactory>(
  factory: Factory,
  options: Options
) {
  const method = factory.method as Method;
  return rest[method](factory.path, (_, res, ctx) => {
    const response = factory.responses.find(response => {
      switch (options.case) {
        case 'nominal':
          return response.status < 400;
        case 'non-nominal':
          return 400 <= response.status;
        default:
          return response.status === options.case;
      }
    });
    if (!response) {
      return res(
        ctx.status(500),
        ctx.text(`
      undefined case: ${options.case} on ${factory.method}: ${factory.path}`)
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
  options: Options = { case: 'nominal' }
) {
  return denormalize(factories).map(f => getHandler(f, options));
}

export function getHandlersWithKey<F extends Factories>(
  factories: F,
  options: Options = { case: 'nominal' }
) {
  return getHandlers(factories, options).reduce((accum, current) => {
    const key = `${current.info.method}:${current.info.path}`;

    return {
      ...accum,
      [key]: current,
    };
  }, {});
}

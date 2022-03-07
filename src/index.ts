import { rest } from 'msw';

type Method = keyof typeof rest;

export type Factory = {
  path: string;
  method: string;
  responses: {
    status: number;
    json: any;
  }[];
};

type Options = {
  case: 'nominal' | 'non-nominal' | number;
};

export function getHandler<F extends Factory>(
  factory: F,
  options: Options = { case: 'nominal' }
) {
  const method = factory.method as Method;
  return rest[method](factory.path, (_, res, ctx) => {
    const response = factory.responses.find(response => {
      switch (options.case) {
        case 'nominal':
          return response.status < 400;
        case 'non-nominal':
          return 400 < response.status;
        default:
          return response.status === options.case;
      }
    });
    if (!response) {
      res(
        ctx.status(500),
        ctx.text(`
      undefined case: ${options.case} on ${factory.method}: ${factory.path}`)
      );
      return;
    }
    res(ctx.status(response.status), ctx.json(response.json));
  });
}

export function getHandlers<F extends Factory>(
  factories: F[],
  options: Options
) {
  return factories.map(f => getHandler(f, options));
}

import * as PrismaClientModule from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: any;
}

const PrismaClientCtor = (PrismaClientModule as any).PrismaClient;

export const prisma =
  global.prisma ??
  new PrismaClientCtor({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

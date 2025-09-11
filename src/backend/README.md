# README
DB_URL="file:./dev.db"
SOCKET_PATH=/ws
```


# prisma/schema.prisma
```prisma
generator client {
provider = "prisma-client-js"
}


datasource db {
provider = "sqlite"
url = env("DB_URL")
}


model Plc {
id Int @id @default(autoincrement())
name String
ip String
port Int @default(102)
rack Int @default(0)
slot Int @default(1)
type String // e.g. "S7-1200", "S7-1500"
enabled Boolean @default(true)
tags Tag[]
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}


model Tag {
id Int @id @default(autoincrement())
plcId Int
name String
area String // DB, PE, PA, MK, TM, CT
dbNumber Int?
start Int // byte offset
amount Int // size in bytes or element count
dataType String // e.g. "BOOL", "INT", "DINT", "REAL"
polling Boolean @default(true)
lastValue String? // JSON stringified primitive/array
updatedAt DateTime @updatedAt
plc Plc @relation(fields: [plcId], references: [id])
}
```


---


# src/main.ts
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


async function bootstrap() {
const app = await NestFactory.create(AppModule);
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
const config = app.get(ConfigService);
app.enableCors();
const port = config.get<number>('PORT') ?? 3000;
await app.listen(port);
console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
```
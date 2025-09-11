-- CreateTable
CREATE TABLE "Plc" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 102,
    "rack" INTEGER NOT NULL DEFAULT 0,
    "slot" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "lastError" TEXT,
    "lastErrorAt" DATETIME,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plcId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "dbNumber" INTEGER,
    "start" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "dataType" TEXT NOT NULL,
    "polling" BOOLEAN NOT NULL DEFAULT true,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "quality" TEXT,
    "lastError" TEXT,
    "lastValue" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tag_plcId_fkey" FOREIGN KEY ("plcId") REFERENCES "Plc" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

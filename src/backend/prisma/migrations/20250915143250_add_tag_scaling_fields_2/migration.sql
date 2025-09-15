-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tag" (
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
    "rawMin" REAL DEFAULT 0,
    "rawMax" REAL DEFAULT 100,
    "engMin" REAL DEFAULT 0,
    "engMax" REAL DEFAULT 100,
    "unit" TEXT,
    "formula" TEXT,
    "quality" TEXT,
    "lastError" TEXT,
    "lastValue" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tag_plcId_fkey" FOREIGN KEY ("plcId") REFERENCES "Plc" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tag" ("amount", "area", "dataType", "dbNumber", "engMax", "engMin", "formula", "id", "lastError", "lastValue", "name", "plcId", "polling", "quality", "rawMax", "rawMin", "readOnly", "start", "unit", "updatedAt") SELECT "amount", "area", "dataType", "dbNumber", "engMax", "engMin", "formula", "id", "lastError", "lastValue", "name", "plcId", "polling", "quality", "rawMax", "rawMin", "readOnly", "start", "unit", "updatedAt" FROM "Tag";
DROP TABLE "Tag";
ALTER TABLE "new_Tag" RENAME TO "Tag";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

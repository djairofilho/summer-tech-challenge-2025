-- CreateTable
CREATE TABLE "Receiver" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receiverId" INTEGER NOT NULL,
    "grossValue" REAL NOT NULL,
    "fee" REAL NOT NULL,
    "netValue" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Operation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Receiver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "banner" TEXT,
    "logo" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'pink',
    "returnPolicy" TEXT,
    "deliveryPolicy" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "vacationMode" BOOLEAN NOT NULL DEFAULT false,
    "categories" TEXT,
    "socialLinks" TEXT,
    "operatingHours" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "targetCampus" TEXT,
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ad_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ad_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "minOrder" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryZone_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "minOrder" REAL NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Promotion_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "newOrders" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "reviews" BOOLEAN NOT NULL DEFAULT true,
    "lowStock" BOOLEAN NOT NULL DEFAULT true,
    "vacationMode" BOOLEAN NOT NULL DEFAULT false,
    "storeVisible" BOOLEAN NOT NULL DEFAULT true,
    "autoConfirm" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerSettings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "idFront" TEXT,
    "idBack" TEXT,
    "businessDoc" TEXT,
    "selfie" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerVerification_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "phone" TEXT,
    "method" TEXT NOT NULL DEFAULT 'MPESA',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "campus" TEXT,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "avatar" TEXT,
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "sellerBalance" REAL NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "campus", "createdAt", "email", "id", "isActive", "isVerified", "name", "password", "phone", "role", "updatedAt", "walletBalance") SELECT "avatar", "campus", "createdAt", "email", "id", "isActive", "isVerified", "name", "password", "phone", "role", "updatedAt", "walletBalance" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Store_sellerId_key" ON "Store"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettings_sellerId_key" ON "SellerSettings"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerVerification_sellerId_key" ON "SellerVerification"("sellerId");

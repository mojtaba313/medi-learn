-- DropForeignKey
ALTER TABLE "LessonAnnotation" DROP CONSTRAINT "LessonAnnotation_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "LessonProgress" DROP CONSTRAINT "LessonProgress_moduleId_fkey";

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "html" SET DEFAULT '';

-- AlterTable
ALTER TABLE "LessonAnnotation" DROP COLUMN "moduleId",
ADD COLUMN     "blockId" TEXT;

-- AlterTable
ALTER TABLE "LessonProgress" DROP COLUMN "moduleId";

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'STRUCTURED';

-- AlterTable
ALTER TABLE "ModuleQuestion" ADD COLUMN     "blockId" TEXT;

-- CreateTable
CREATE TABLE "ModuleAsset" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAnnotation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleAsset_moduleId_idx" ON "ModuleAsset"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAsset_moduleId_assetId_key" ON "ModuleAsset"("moduleId", "assetId");

-- CreateIndex
CREATE INDEX "AssetAnnotation_userId_moduleId_idx" ON "AssetAnnotation"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetAnnotation_userId_assetId_blockId_key" ON "AssetAnnotation"("userId", "assetId", "blockId");

-- AddForeignKey
ALTER TABLE "ModuleAsset" ADD CONSTRAINT "ModuleAsset_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAnnotation" ADD CONSTRAINT "AssetAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAnnotation" ADD CONSTRAINT "AssetAnnotation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ModuleAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateTable
CREATE TABLE `TaskRequest` (
    `id` CHAR(36) NOT NULL,
    `taskId` CHAR(36) NOT NULL,
    `requesterId` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskRequest_taskId_status_createdAt_idx`(`taskId`, `status`, `createdAt`),
    INDEX `TaskRequest_requesterId_status_createdAt_idx`(`requesterId`, `status`, `createdAt`),
    UNIQUE INDEX `TaskRequest_taskId_requesterId_status_key`(`taskId`, `requesterId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskRequest` ADD CONSTRAINT `TaskRequest_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskRequest` ADD CONSTRAINT `TaskRequest_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

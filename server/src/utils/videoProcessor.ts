import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

const execPromise = promisify(exec);

/**
 * Get the duration of a video file in seconds using ffprobe.
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:noclose=1 "${filePath}"`
    );
    const duration = parseFloat(stdout.trim());
    return isNaN(duration) ? 0 : Math.round(duration);
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 0;
  }
}

/**
 * Capture a frame of the video to use as a thumbnail.
 */
export async function generateThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
  try {
    // Attempt to capture frame at 1s
    await execPromise(`ffmpeg -ss 00:00:01 -i "${videoPath}" -vframes 1 -q:v 2 "${thumbnailPath}" -y`);
  } catch (error) {
    console.warn('ffmpeg thumbnail at 1s failed, falling back to 0s:', error);
    try {
      // Fallback to 0s if video is shorter than 1s
      await execPromise(`ffmpeg -ss 00:00:00 -i "${videoPath}" -vframes 1 -q:v 2 "${thumbnailPath}" -y`);
    } catch (err2) {
      console.error('ffmpeg thumbnail fallback failed:', err2);
      throw err2;
    }
  }
}

/**
 * Convert an MP4 or other video format to HLS stream format (.m3u8 playlist + .ts chunks).
 */
export async function convertToHls(videoPath: string, outputDir: string): Promise<void> {
  const playlistPath = path.join(outputDir, 'playlist.m3u8');
  // Transcode to libx264 (H.264) video and aac audio, which is highly compatible.
  await execPromise(
    `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 6 -hls_list_size 0 -f hls "${playlistPath}" -y`
  );
}

/**
 * Process uploaded video asynchronously in the background.
 */
export async function processVideoInBackground(
  videoId: string,
  videoFilename: string,
  uploadsDir: string,
  targetStatus: 'PUBLISHED' | 'UNLISTED' | 'PRIVATE'
): Promise<void> {
  const videoFilePath = path.join(uploadsDir, videoFilename);
  const ext = path.extname(videoFilename);
  const baseName = path.basename(videoFilename, ext);

  const thumbnailFilename = `${baseName}-thumb.jpg`;
  const thumbnailPath = path.join(uploadsDir, thumbnailFilename);

  const hlsDirName = `${baseName}-hls`;
  const hlsOutputDir = path.join(uploadsDir, hlsDirName);

  console.log(`[Processor] Starting background processing for video: ${videoId}`);

  try {
    // 1. Get duration
    const duration = await getVideoDuration(videoFilePath);
    console.log(`[Processor] Extracted duration: ${duration}s`);

    // 2. Generate thumbnail
    await generateThumbnail(videoFilePath, thumbnailPath);
    console.log(`[Processor] Generated thumbnail: ${thumbnailFilename}`);

    // 3. Convert to HLS
    if (!fs.existsSync(hlsOutputDir)) {
      fs.mkdirSync(hlsOutputDir, { recursive: true });
    }
    await convertToHls(videoFilePath, hlsOutputDir);
    console.log(`[Processor] Transcoded to HLS under: ${hlsDirName}`);

    // 4. Double check the video record still exists (e.g. wasn't cancelled/deleted by user in mid-upload)
    const existing = await prisma.video.findUnique({ where: { id: videoId } });
    if (!existing) {
      console.log(`[Processor] Video ${videoId} was deleted before processing could finish.`);
      // Clean up files
      try {
        if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
        if (fs.existsSync(hlsOutputDir)) fs.rmSync(hlsOutputDir, { recursive: true, force: true });
      } catch (err) {
        console.error('[Processor] Error cleaning up orphaned files:', err);
      }
      return;
    }

    // 5. Update status and metadata in Database
    const updated = await prisma.video.update({
      where: { id: videoId },
      data: {
        duration,
        thumbnailUrl: `/uploads/${thumbnailFilename}`,
        hlsUrl: `/uploads/${hlsDirName}/playlist.m3u8`,
        status: targetStatus,
        publishedAt: targetStatus === 'PRIVATE' ? null : new Date(),
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    });

    console.log(`[Processor] DB records updated successfully. Status: ${targetStatus}`);

    // 6. Notify subscribers if video is PUBLISHED
    if (targetStatus === 'PUBLISHED') {
      const subscribers = await prisma.subscription.findMany({
        where: { channelId: updated.userId },
        select: { subscriberId: true },
      });

      if (subscribers.length > 0) {
        const creatorName = updated.user.displayName || updated.user.username;
        const notificationsData = subscribers.map(sub => ({
          userId: sub.subscriberId,
          actorId: updated.userId,
          type: 'NEW_VIDEO' as const,
          title: 'New video published',
          message: `${creatorName} uploaded: ${updated.title}`,
          link: `/watch/${updated.id}`,
          imageUrl: `/uploads/${thumbnailFilename}`,
          isRead: false,
        }));

        await prisma.notification.createMany({
          data: notificationsData,
        });

        console.log(`[Processor] Sent notifications to ${subscribers.length} subscribers.`);
      }
    }
  } catch (err) {
    console.error(`[Processor] Failed to process video ${videoId}:`, err);
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'BLOCKED' },
      });
    } catch (dbErr) {
      console.error('[Processor] Failed to mark video status as BLOCKED on error:', dbErr);
    }
  }
}

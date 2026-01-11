// utils/soundCache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const CACHE_DIR_NAME = "sound_cache";
const DOWNLOADED_SOUNDS_KEY = "@downloaded_sounds";

interface CachedSound {
  id: number;
  localUri: string;
  downloadedAt: number;
  originalUrl: string;
}

class SoundCacheManager {
  private downloadedSounds: Map<number, CachedSound> = new Map();
  private initialized = false;
  private downloadQueue: Set<number> = new Set();
  private downloadStartTimes: Map<number, number> = new Map(); // Track when downloads started
  private cacheDir: Directory | null = null;
  private downloadCallbacks: Map<
    number,
    ((soundId: number, success: boolean) => void)[]
  > = new Map();
  private maxDownloadDuration = 45000; // 45 seconds max per download

  async initialize() {
    if (this.initialized) return;

    try {
      // Skip initialization on web
      if (Platform.OS === "web") {
        console.log("📦 Sound cache not available on web");
        this.initialized = true;
        return;
      }

      // Create cache directory if it doesn't exist
      this.cacheDir = new Directory(Paths.cache, CACHE_DIR_NAME);

      // Check if directory exists, create if not
      if (!this.cacheDir.exists) {
        await this.cacheDir.create();
        console.log("📦 Sound cache directory created");
      }

      // Load cached sounds metadata from AsyncStorage
      const stored = await AsyncStorage.getItem(DOWNLOADED_SOUNDS_KEY);
      if (stored) {
        const cachedSoundsArray: CachedSound[] = JSON.parse(stored);

        // Verify each cached file still exists
        for (const cached of cachedSoundsArray) {
          try {
            const file = new File(cached.localUri);
            if (file.exists) {
              this.downloadedSounds.set(cached.id, cached);
            } else {
              console.log(
                `📦 Cached file missing for sound ${cached.id}, will re-download`
              );
            }
          } catch (err) {
            console.log(`📦 Error checking cached file for sound ${cached.id}`);
          }
        }

        console.log(`📦 Loaded ${this.downloadedSounds.size} cached sounds`);
      }

      this.initialized = true;

      // Start watchdog to detect stuck downloads
      this.startStuckDownloadWatchdog();
    } catch (error) {
      console.error("📦 Error initializing sound cache:", error);
      this.initialized = true; // Continue anyway
    }
  }

  // Detect and clean up downloads stuck for too long
  private startStuckDownloadWatchdog() {
    setInterval(() => {
      const now = Date.now();
      const stuckSounds: number[] = [];

      for (const [soundId, startTime] of this.downloadStartTimes.entries()) {
        const duration = now - startTime;
        if (duration > this.maxDownloadDuration) {
          stuckSounds.push(soundId);
          console.warn(
            `⚠️  Download for sound ${soundId} stuck for ${Math.round(
              duration / 1000
            )}s, cleaning up...`
          );
        }
      }

      // Clean up stuck downloads
      for (const soundId of stuckSounds) {
        this.downloadQueue.delete(soundId);
        this.downloadStartTimes.delete(soundId);

        // Notify callbacks of failure so UI stops loading
        console.log(
          `📦 Notifying of stuck download failure for sound ${soundId}`
        );
        this.notifyDownloadComplete(soundId, false);
      }
    }, 10000); // Check every 10 seconds
  }

  async saveCacheMetadata() {
    try {
      const cachedSoundsArray = Array.from(this.downloadedSounds.values());
      await AsyncStorage.setItem(
        DOWNLOADED_SOUNDS_KEY,
        JSON.stringify(cachedSoundsArray)
      );
    } catch (error) {
      console.error("📦 Error saving cache metadata:", error);
    }
  }

  async downloadSound(
    soundId: number,
    remoteUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<string | null> {
    // Skip on web
    if (Platform.OS === "web") {
      return null;
    }

    if (!this.cacheDir) {
      console.error("📦 Cache directory not initialized");
      return null;
    }

    // Check if already downloaded
    if (this.downloadedSounds.has(soundId)) {
      const cached = this.downloadedSounds.get(soundId)!;
      try {
        const file = new File(cached.localUri);
        if (file.exists) {
          console.log(`📦 Sound ${soundId} already cached`);
          return cached.localUri;
        }
      } catch (err) {
        // File doesn't exist, continue with download
      }
    }

    // Check if already in download queue
    if (this.downloadQueue.has(soundId)) {
      console.log(`📦 Sound ${soundId} already downloading`);
      return null;
    }

    this.downloadQueue.add(soundId);
    this.downloadStartTimes.set(soundId, Date.now()); // Track download start time

    try {
      const fileName = `sound_${soundId}.mp3`;
      const filePath = `${this.cacheDir.uri}/${fileName}`;

      console.log(`📦 Downloading sound ${soundId} from ${remoteUrl}`);

      // Use expo-file-system's downloadAsync with timeout
      // This is the proper React Native way to download files
      const downloadPromise = FileSystem.downloadAsync(remoteUrl, filePath);

      // Add 30-second timeout to prevent indefinite hanging
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Download timeout - 30 seconds exceeded")),
          30000
        )
      );

      try {
        await Promise.race([downloadPromise, timeoutPromise]);
        console.log(`📦 Sound ${soundId} download completed`);
      } catch (downloadError) {
        if (
          downloadError instanceof Error &&
          downloadError.message.includes("timeout")
        ) {
          console.error(`📦 Sound ${soundId} download timed out`);
          throw downloadError;
        }
        throw downloadError;
      }

      // Verify file exists after download
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists || !fileInfo.isDirectory === false) {
        throw new Error(`Downloaded file does not exist at ${filePath}`);
      }

      // File was downloaded successfully
      const cached: CachedSound = {
        id: soundId,
        localUri: filePath,
        downloadedAt: Date.now(),
        originalUrl: remoteUrl,
      };

      this.downloadedSounds.set(soundId, cached);
      await this.saveCacheMetadata();

      console.log(`📦 Sound ${soundId} cached successfully at ${filePath}`);

      // Notify any listeners that download is complete (success)
      this.notifyDownloadComplete(soundId, true);

      return filePath;
    } catch (error) {
      console.error(`📦 Error downloading sound ${soundId}:`, error);

      // Clean up partial file on failure
      try {
        const fileName = `sound_${soundId}.mp3`;
        const filePath = `${this.cacheDir.uri}/${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(filePath);
          console.log(`📦 Cleaned up failed download for sound ${soundId}`);
        }
      } catch (cleanupError) {
        console.log(`📦 Could not clean up failed download: ${cleanupError}`);
      }

      // IMPORTANT: Still notify callbacks even on failure so UI doesn't hang
      // This prevents the forever-loading state
      console.log(
        `📦 Notifying listeners of download failure for sound ${soundId}`
      );
      this.notifyDownloadComplete(soundId, false);

      return null;
    }
  }

  isDownloaded(soundId: number): boolean {
    return this.downloadedSounds.has(soundId);
  }

  isDownloading(soundId: number): boolean {
    return this.downloadQueue.has(soundId);
  }

  // Explicitly trigger a download - used by "Save for Offline" button
  async initiateDownload(soundItem: any): Promise<boolean> {
    if (this.downloadedSounds.has(soundItem.id)) {
      console.log(`📦 Sound ${soundItem.id} already downloaded`);
      return true;
    }

    if (this.downloadQueue.has(soundItem.id)) {
      console.log(`📦 Sound ${soundItem.id} already downloading`);
      return false; // Already in progress
    }

    console.log(`📦 User initiated download for sound ${soundItem.id}`);

    try {
      const result = await this.downloadSound(soundItem.id, soundItem.source);
      return result !== null;
    } catch (error) {
      console.error(`📦 Download failed for sound ${soundItem.id}:`, error);
      return false;
    }
  }

  onDownloadComplete(
    soundId: number,
    callback: (soundId: number, success: boolean) => void
  ) {
    if (!this.downloadCallbacks.has(soundId)) {
      this.downloadCallbacks.set(soundId, []);
    }
    this.downloadCallbacks.get(soundId)!.push(callback);
  }

  private notifyDownloadComplete(soundId: number, success: boolean = true) {
    const callbacks = this.downloadCallbacks.get(soundId);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(soundId, success);
        } catch (err) {
          console.error(
            `📦 Error calling download callback for sound ${soundId}:`,
            err
          );
        }
      });
      this.downloadCallbacks.delete(soundId);
    }

    // Always ensure sound is removed from downloading queue and timing map
    this.downloadQueue.delete(soundId);
    this.downloadStartTimes.delete(soundId);
  }

  getCachedUri(soundId: number): string | null {
    const cached = this.downloadedSounds.get(soundId);
    return cached ? cached.localUri : null;
  }

  private verifyCacheFile(soundId: number, cachedUri: string): void {
    // Fire-and-forget file verification
    try {
      const file = new File(cachedUri);
      if (!file.exists) {
        console.log(
          `📦 Sound ${soundId}: Cache file no longer exists, removing`
        );
        this.downloadedSounds.delete(soundId);
        this.saveCacheMetadata().catch((err) =>
          console.log(`📦 Error saving cache metadata: ${err}`)
        );
      }
    } catch (err) {
      // Ignore errors
    }
  }

  private checkAndCacheInBackground(
    soundItem: any,
    autoDownload: boolean,
    prioritize: boolean
  ): void {
    // Fire-and-forget background cache checking
    (async () => {
      try {
        // Check AsyncStorage for recently downloaded files
        const stored = await AsyncStorage.getItem(DOWNLOADED_SOUNDS_KEY);
        if (stored) {
          const cachedSoundsArray: CachedSound[] = JSON.parse(stored);
          const found = cachedSoundsArray.find((s) => s.id === soundItem.id);
          if (found) {
            try {
              const file = new File(found.localUri);
              if (file.exists) {
                // Found a newly downloaded file, update memory cache
                console.log(
                  `✅ Sound ${soundItem.id}: Background check found cached file`
                );
                this.downloadedSounds.set(soundItem.id, found);
                return; // Don't need to download
              }
            } catch (err) {
              // File doesn't exist
            }
          }
        }

        // No cached file found, initiate background download if needed
        if (autoDownload && !this.downloadQueue.has(soundItem.id)) {
          console.log(
            `📦 Sound ${soundItem.id}: Starting background cache download...`
          );
          this.downloadSound(soundItem.id, soundItem.source).catch((err) => {
            console.log(`📦 Sound ${soundItem.id}: Download failed: ${err}`);
          });
        }
      } catch (err) {
        // Ignore all errors in background task
      }
    })();
  }

  async getSource(
    soundItem: any,
    autoDownload: boolean = true,
    prioritize: boolean = false
  ): Promise<any> {
    // For local sounds, return the required asset directly
    if (soundItem.isLocal) {
      console.log(`📦 Sound ${soundItem.id}: Using local source`);
      return soundItem.source;
    }

    // For web, always use remote URL (no caching)
    if (Platform.OS === "web") {
      console.log(`📦 Sound ${soundItem.id}: Web platform, streaming`);
      return { uri: soundItem.source };
    }

    console.log(
      `📦 Sound ${soundItem.id}: Getting source (prioritize=${prioritize})...`
    );

    // FAST PATH: Check in-memory cache first (< 1ms)
    const cachedUri = this.getCachedUri(soundItem.id);
    if (cachedUri) {
      console.log(
        `✅ Sound ${soundItem.id}: Instant cache hit, using ${cachedUri}`
      );
      // Verify file exists in background (don't block)
      this.verifyCacheFile(soundItem.id, cachedUri);
      return { uri: cachedUri };
    }

    // Return streaming URL immediately - DON'T BLOCK
    console.log(
      `🌐 Sound ${soundItem.id}: No in-memory cache, returning streaming URL`
    );

    // Start cache checks in background (fire-and-forget)
    this.checkAndCacheInBackground(soundItem, autoDownload, prioritize);

    // Return streaming URL immediately for playback
    return { uri: soundItem.source };
  }

  private verifyCacheFile(soundId: number, cachedUri: string): void {
    // Fire-and-forget file verification
    try {
      const file = new File(cachedUri);
      if (!file.exists) {
        console.log(
          `📦 Sound ${soundId}: Cache file no longer exists, removing`
        );
        this.downloadedSounds.delete(soundId);
        this.saveCacheMetadata().catch((err) =>
          console.log(`📦 Error saving cache metadata: ${err}`)
        );
      }
    } catch (err) {
      // Ignore errors
    }
  }

  private checkAndCacheInBackground(
    soundItem: any,
    autoDownload: boolean,
    prioritize: boolean
  ): void {
    // Fire-and-forget background cache checking
    (async () => {
      try {
        // Check AsyncStorage for recently downloaded files
        const stored = await AsyncStorage.getItem(DOWNLOADED_SOUNDS_KEY);
        if (stored) {
          const cachedSoundsArray: CachedSound[] = JSON.parse(stored);
          const found = cachedSoundsArray.find((s) => s.id === soundItem.id);
          if (found) {
            try {
              const file = new File(found.localUri);
              if (file.exists) {
                // Found a newly downloaded file, update memory cache
                console.log(
                  `✅ Sound ${soundItem.id}: Background check found cached file`
                );
                this.downloadedSounds.set(soundItem.id, found);
                return; // Don't need to download
              }
            } catch (err) {
              // File doesn't exist
            }
          }
        }

        // No cached file found, initiate background download if needed
        if (autoDownload && !this.downloadQueue.has(soundItem.id)) {
          console.log(
            `📦 Sound ${soundItem.id}: Starting background cache download...`
          );
          this.downloadSound(soundItem.id, soundItem.source).catch((err) => {
            console.log(`📦 Sound ${soundItem.id}: Download failed: ${err}`);
          });
        }
      } catch (err) {
        // Ignore all errors in background task
      }
    })();
  }

  async clearCache(): Promise<void> {
    try {
      if (this.cacheDir && this.cacheDir.exists) {
        await this.cacheDir.delete();
        // Recreate directory
        await this.cacheDir.create();
      }

      this.downloadedSounds.clear();
      await AsyncStorage.removeItem(DOWNLOADED_SOUNDS_KEY);

      console.log("📦 Sound cache cleared");
    } catch (error) {
      console.error("📦 Error clearing cache:", error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      let totalSize = 0;
      for (const cached of this.downloadedSounds.values()) {
        try {
          const file = new File(cached.localUri);
          // Use size property directly if available
          if (file.exists) {
            // File size calculation would need additional API - for now return count
            totalSize += 1;
          }
        } catch {
          // Skip this file
        }
      }
      return totalSize;
    } catch (error) {
      console.error("📦 Error calculating cache size:", error);
      return 0;
    }
  }

  getDownloadedSoundIds(): number[] {
    return Array.from(this.downloadedSounds.keys());
  }
}

export const soundCache = new SoundCacheManager();

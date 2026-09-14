import https from 'https'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { UpdateInfo, UpdateProgress, ProxyConfig } from './types'
import { Logger } from './logger'

export class UpdateManager {
  private currentVersion: string
  private repoOwner = 'guidegram'
  private repoName = 'guidegram'
  private timer: NodeJS.Timeout | null = null

  constructor(currentVersion?: string) {
    this.currentVersion = currentVersion || app.getVersion() || '1.0.0'
  }

  /**
   * Check for latest release on GitHub
   */
  public async checkForUpdates(proxy?: ProxyConfig): Promise<UpdateInfo | null> {
    try {
      Logger.info(`[UpdateManager] Checking for updates (current: v${this.currentVersion})...`)
      const releaseData = await this.fetchLatestRelease(proxy)
      if (!releaseData) return null

      const tagName: string = releaseData.tag_name || ''
      const latestVer = tagName.replace(/^v/, '').trim()
      const hasUpdate = this.compareSemver(latestVer, this.currentVersion) > 0

      // Find Windows zip asset
      let downloadUrl: string | undefined
      if (Array.isArray(releaseData.assets)) {
        const zipAsset = releaseData.assets.find((a: any) =>
          a.name?.toLowerCase().endsWith('.zip')
        )
        if (zipAsset) {
          downloadUrl = zipAsset.browser_download_url
        }
      }

      // Security and Minor/Major version classification
      const notesLower = (releaseData.body || '').toLowerCase()
      const tagLower = tagName.toLowerCase()

      const hasSecurityKeyword =
        notesLower.includes('security') ||
        notesLower.includes('critical') ||
        notesLower.includes('mandatory') ||
        notesLower.includes('vulnerability') ||
        notesLower.includes('breaking') ||
        tagLower.includes('sec') ||
        tagLower.includes('crit')

      const curParts = this.currentVersion.split('.').map((n) => parseInt(n, 10) || 0)
      const latParts = latestVer.split('.').map((n) => parseInt(n, 10) || 0)
      const isMajorBump = latParts[0] > curParts[0]
      const isMinorBump = latParts[0] === curParts[0] && latParts[1] > curParts[1]

      // Security updates or major/minor version bumps (e.g. 5.6.0 or 5.6) require mandatory download
      const isMandatory = hasUpdate && (isMajorBump || isMinorBump || hasSecurityKeyword)
      const isSecurityUpdate = hasUpdate && hasSecurityKeyword
      const severity: 'critical' | 'normal' = isMandatory ? 'critical' : 'normal'

      const updateInfo: UpdateInfo = {
        currentVersion: this.currentVersion,
        latestVersion: latestVer,
        releaseNotes: releaseData.body || 'No release notes provided.',
        downloadUrl,
        publishedAt: releaseData.published_at,
        hasUpdate,
        isMandatory,
        isSecurityUpdate,
        severity,
      }

      Logger.info(
        `[UpdateManager] Update check completed. Latest: v${latestVer}, Has update: ${hasUpdate}`
      )
      return updateInfo
    } catch (err: any) {
      Logger.warn('[UpdateManager] Check for updates failed:', err)
      return null
    }
  }

  /**
   * Start hourly background updater
   */
  public startHourlyCheck(
    callback: (info: UpdateInfo) => void,
    getProxy?: () => ProxyConfig | undefined
  ): void {
    if (this.timer) clearInterval(this.timer)

    // Initial check after 15 seconds
    setTimeout(async () => {
      const info = await this.checkForUpdates(getProxy?.())
      if (info && info.hasUpdate) {
        callback(info)
      }
    }, 15000)

    // Check every 1 hour (3600000 ms)
    this.timer = setInterval(async () => {
      Logger.info('[UpdateManager] Running hourly update check...')
      const info = await this.checkForUpdates(getProxy?.())
      if (info && info.hasUpdate) {
        callback(info)
      }
    }, 3600000)
  }

  public stopHourlyCheck(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Compare two semver strings: a > b -> 1, a < b -> -1, a == b -> 0
   */
  private compareSemver(a: string, b: string): number {
    const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
    const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0
      const nb = pb[i] || 0
      if (na > nb) return 1
      if (na < nb) return -1
    }
    return 0
  }

  /**
   * Fetch latest release JSON from GitHub API (supports proxy fallback & semver sorting)
   */
  private async fetchLatestRelease(proxy?: ProxyConfig): Promise<any> {
    return new Promise((resolve) => {
      const makeRequest = (pathUrl: string, isFallback = false) => {
        const options: https.RequestOptions = {
          hostname: 'api.github.com',
          path: pathUrl,
          method: 'GET',
          headers: {
            'User-Agent': 'Guidegram-Desktop-App',
            Accept: 'application/vnd.github.v3+json',
          },
          timeout: 12000,
        }

        const req = https.request(options, (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(body)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  // Filter non-draft releases and sort descending by semver
                  const nonDraft = parsed.filter((r: any) => !r.draft)
                  nonDraft.sort((a: any, b: any) => {
                    const verA = (a.tag_name || '').replace(/^v/, '').trim()
                    const verB = (b.tag_name || '').replace(/^v/, '').trim()
                    return this.compareSemver(verB, verA)
                  })
                  resolve(nonDraft[0] || parsed[0])
                  return
                } else if (parsed && typeof parsed === 'object') {
                  resolve(parsed)
                  return
                }
              } catch (_) {
                // Ignore parse error and proceed to fallback
              }
            }

            if (!isFallback) {
              makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
            } else {
              resolve(null)
            }
          })
        })

        req.on('error', () => {
          if (!isFallback) {
            makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
          } else {
            resolve(null)
          }
        })

        req.on('timeout', () => {
          req.destroy()
          if (!isFallback) {
            makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases/latest`, true)
          } else {
            resolve(null)
          }
        })

        req.end()
      }

      makeRequest(`/repos/${this.repoOwner}/${this.repoName}/releases`)
    })
  }

  /**
   * Seamless Portable Update without Data Corruption
   * Downloads the update zip, writes a self-executing PowerShell helper, quits the app,
   * extracts files over application dir (excluding data/), and restarts Guidegram.
   */
  /**
   * Seamless Lightning Portable Update without Data Loss
   * Downloads the update zip, writes a self-executing atomic PowerShell helper,
   * cleanly terminates processes with taskkill /T, rapidly syncs files via robocopy,
   * generates an update completion marker, and relaunches Guidegram in < 2 seconds.
   */
  public async performPortableUpdate(
    downloadUrl: string,
    appInstallDir: string,
    dataDir: string,
    targetVersion?: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      Logger.info(`[UpdateManager] Starting lightning portable update from: ${downloadUrl}`)
      const tempDir = path.join(dataDir, 'temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      const zipPath = path.join(tempDir, 'update.zip')
      const downloaded = await this.downloadFile(downloadUrl, zipPath, onProgress)
      if (!downloaded) {
        return { success: false, error: 'Failed to download update package.' }
      }

      if (onProgress) {
        onProgress({
          percent: 100,
          transferredBytes: 0,
          totalBytes: 0,
          stage: 'extracting',
        })
      }

      const scriptPath = path.join(tempDir, 'apply_update.ps1')
      const batPath = path.join(tempDir, 'apply_update.bat')
      const exePath = app.getPath('exe')
      const resolvedTargetVer = targetVersion || 'latest'

      const psScript = `
$tempDir = '${tempDir.replace(/'/g, "''")}'
$zipFile = '${zipPath.replace(/'/g, "''")}'
$targetDir = '${appInstallDir.replace(/'/g, "''")}'
$exe = '${exePath.replace(/'/g, "''")}'
$stagedDir = Join-Path $tempDir 'staged_update'
$logFile = Join-Path $tempDir 'update_process.log'
$markerFile = Join-Path $tempDir 'update_completed.json'

Add-Content -Path $logFile -Value "=========================================="
Add-Content -Path $logFile -Value "Starting Lightning Guidegram Portable Update at $(Get-Date)"
Add-Content -Path $logFile -Value "Target Directory: $targetDir"
Add-Content -Path $logFile -Value "Executable: $exe"

# 1. Instant process tree termination (kills lingering helper/GPU processes in < 200ms)
Add-Content -Path $logFile -Value "Terminating all Guidegram processes immediately..."
& taskkill.exe /F /IM Guidegram.exe /T 2>&1 | Out-Null
Start-Sleep -Milliseconds 300

# 2. Extract update into clean staging folder with per-file retry (zero file locks)
try {
    if (Test-Path $stagedDir) {
        Remove-Item -Recurse -Force $stagedDir -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $stagedDir -Force | Out-Null

    Add-Content -Path $logFile -Value "Extracting $zipFile into staging directory $stagedDir..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipFile)
    foreach ($entry in $zip.Entries) {
        if ($entry.FullName -like "data/*" -or $entry.FullName -like "data\\*") { continue }
        $destPath = Join-Path $stagedDir $entry.FullName
        $destParent = [System.IO.Path]::GetDirectoryName($destPath)
        if (-not (Test-Path $destParent)) { New-Item -ItemType Directory -Path $destParent -Force | Out-Null }
        if (-not [string]::IsNullOrEmpty($entry.Name)) {
            $extracted = $false
            $retry = 0
            while (-not $extracted -and $retry -lt 5) {
                try {
                    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destPath, $true)
                    $extracted = $true
                } catch {
                    Start-Sleep -Milliseconds 100
                    $retry++
                }
            }
        }
    }
    $zip.Dispose()
    Add-Content -Path $logFile -Value "Staging extraction completed."
} catch {
    Add-Content -Path $logFile -Value "STAGING EXTRACTION FAILED: $($_.Exception.ToString())"
    Start-Process -FilePath $exe -WorkingDirectory $targetDir
    exit 1
}

# 3. Detect true source directory (handle zip root wrappers if present)
$sourceDir = $stagedDir
$nestedExe = Get-ChildItem -Path $stagedDir -Filter "Guidegram.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($nestedExe -and $nestedExe.DirectoryName -ne $stagedDir) {
    $sourceDir = $nestedExe.DirectoryName
    Add-Content -Path $logFile -Value "Detected nested application directory: $sourceDir"
}

# Strict Data Shield: Never overwrite user data folder
if (Test-Path (Join-Path $sourceDir "data")) {
    Remove-Item -Recurse -Force (Join-Path $sourceDir "data") -ErrorAction SilentlyContinue
    Add-Content -Path $logFile -Value "Data Shield: Removed data/ directory from source payload."
}

# 4. Rapid atomic synchronization from staging to target (Robocopy with PowerShell fallback)
Add-Content -Path $logFile -Value "Applying update files from $sourceDir to $targetDir..."
$copySuccess = $false

try {
    $roboOut = & robocopy $sourceDir $targetDir /E /XD "data" /R:2 /W:1 /NP /NFL /NDL /NJH /NJS 2>&1
    $roboExit = $LASTEXITCODE
    if ($roboExit -ge 0 -and $roboExit -le 7) {
        $copySuccess = $true
        Add-Content -Path $logFile -Value "Robocopy applied files successfully (ExitCode: $roboExit)."
    } else {
        Add-Content -Path $logFile -Value "Robocopy exit code $roboExit. Falling back to PowerShell copy..."
    }
} catch {
    Add-Content -Path $logFile -Value "Robocopy invocation failed: $($_.Exception.Message). Falling back..."
}

if (-not $copySuccess) {
    try {
        Get-ChildItem -Path $sourceDir -Recurse | Where-Object { $_.FullName -notmatch '\\\\data(\\\\.*)?$' } | ForEach-Object {
            $rel = $_.FullName.Substring($sourceDir.Length).TrimStart('\\\\')
            $dest = Join-Path $targetDir $rel
            if ($_.PSIsContainer) {
                if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
            } else {
                $parent = [System.IO.Path]::GetDirectoryName($dest)
                if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
                Copy-Item -Path $_.FullName -Destination $dest -Force
            }
        }
        $copySuccess = $true
        Add-Content -Path $logFile -Value "PowerShell fallback copy completed successfully."
    } catch {
        Add-Content -Path $logFile -Value "FALLBACK COPY ERROR: $($_.Exception.ToString())"
    }
}

# 5. Write success marker for What's New celebration modal
if ($copySuccess) {
    $markerJson = '{"status":"success","version":"' + '${resolvedTargetVer}' + '","timestamp":' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '}'
    [System.IO.File]::WriteAllText($markerFile, $markerJson, (New-Object System.Text.UTF8Encoding($false)))
    Add-Content -Path $logFile -Value "Update completion marker generated successfully."
}

# 6. Clean up temporary files in background
Remove-Item -Recurse -Force $stagedDir -ErrorAction SilentlyContinue
Remove-Item -Force $zipFile -ErrorAction SilentlyContinue

# 7. Relaunch Guidegram immediately
Add-Content -Path $logFile -Value "Relaunching $exe with WorkingDirectory $targetDir"
Start-Process -FilePath $exe -WorkingDirectory $targetDir
`
      await fs.promises.writeFile(scriptPath, psScript, 'utf-8')

      // Create a batch launcher to cleanly break away from Chromium Job Object on Windows
      const batScript = `@echo off\r\nstart "" /b powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"\r\n`
      await fs.promises.writeFile(batPath, batScript, 'utf-8')
      Logger.info(`[UpdateManager] Lightning update script generated at: ${scriptPath}`)

      if (onProgress) {
        onProgress({
          percent: 100,
          transferredBytes: 0,
          totalBytes: 0,
          stage: 'restarting',
        })
      }

      // Spawn detached process outside Chromium Job Object
      const { spawn } = await import('child_process')
      const child = spawn(
        'cmd.exe',
        ['/c', 'start', '""', '/min', 'powershell.exe', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        }
      )
      child.unref()

      setTimeout(() => {
        app.exit(0)
      }, 400)

      return { success: true }
    } catch (err: any) {
      Logger.error('[UpdateManager] Lightning portable update failed:', err)
      return { success: false, error: err.message || 'Update error' }
    }
  }

  private downloadFile(
    url: string,
    destPath: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(destPath)
      let transferredBytes = 0
      let totalBytes = 0

      const request = (targetUrl: string) => {
        https
          .get(targetUrl, { headers: { 'User-Agent': 'Guidegram-Desktop-App' } }, (res) => {
            // Handle redirects (GitHub release downloads redirect to AWS S3)
            if (
              res.statusCode &&
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              request(res.headers.location)
              return
            }

            if (res.statusCode !== 200) {
              file.close()
              fs.unlink(destPath, () => {})
              resolve(false)
              return
            }

            const headerLen = res.headers['content-length']
            if (headerLen) {
              totalBytes = parseInt(headerLen, 10) || 0
            }

            res.on('data', (chunk: Buffer) => {
              transferredBytes += chunk.length
              if (onProgress && totalBytes > 0) {
                const percent = Math.min(99, Math.round((transferredBytes / totalBytes) * 100))
                onProgress({
                  percent,
                  transferredBytes,
                  totalBytes,
                  stage: 'downloading',
                })
              }
            })

            res.pipe(file)
            file.on('finish', () => {
              file.close(() => {
                if (onProgress) {
                  onProgress({
                    percent: 100,
                    transferredBytes,
                    totalBytes: totalBytes || transferredBytes,
                    stage: 'extracting',
                  })
                }
                resolve(true)
              })
            })
          })
          .on('error', (err) => {
            Logger.error('[UpdateManager] Download file error:', err)
            file.close()
            fs.unlink(destPath, () => {})
            resolve(false)
          })
      }

      request(url)
    })
  }
}

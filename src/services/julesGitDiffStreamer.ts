/**
 * Guidegram Master Hardening - Phase 137
 * Google Jules Live Git Diff Streaming & Virtual Patch Engine Protocol
 * 
 * Production-grade unified git diff parser, chunked streaming patch processor,
 * and virtual in-memory filesystem tree builder. Allows real-time inspection
 * of diffs streaming from Google Jules swarm agents without requiring disk I/O.
 */

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: Array<{
    type: 'add' | 'delete' | 'context';
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
  }>;
}

export interface FileDiff {
  oldPath: string;
  newPath: string;
  isNew: boolean;
  isDeleted: boolean;
  hunks: DiffHunk[];
  additionsCount: number;
  deletionsCount: number;
}

export interface VirtualFileEntry {
  path: string;
  content: string;
  lastUpdated: number;
  patchAppliedCount: number;
}

export class JulesGitDiffStreamer {
  private rawBuffer: string = '';
  private parsedDiffs: Map<string, FileDiff> = new Map();
  private virtualTree: Map<string, VirtualFileEntry> = new Map();
  private maxBufferSize: number = 2 * 1024 * 1024; // 2MB stream safety window

  constructor(maxBufferSize: number = 2 * 1024 * 1024) {
    this.maxBufferSize = maxBufferSize;
  }

  /**
   * Appends incoming streaming diff chunk and parses completed file diffs.
   */
  public streamChunk(chunk: string): FileDiff[] {
    this.rawBuffer += chunk;
    if (this.rawBuffer.length > this.maxBufferSize) {
      // Retain last 256KB to avoid buffer overflow if malformed input arrives
      this.rawBuffer = this.rawBuffer.slice(-256 * 1024);
    }

    const diffs = this.parseUnifiedDiff(this.rawBuffer);
    for (const diff of diffs) {
      this.parsedDiffs.set(diff.newPath || diff.oldPath, diff);
    }
    return diffs;
  }

  /**
   * Parses full unified git diff string into structured FileDiff models.
   */
  public parseUnifiedDiff(diffText: string): FileDiff[] {
    const lines = diffText.split(/\r?\n/);
    const files: FileDiff[] = [];
    let currentFile: FileDiff | null = null;
    let currentHunk: DiffHunk | null = null;
    let oldLinePtr = 0;
    let newLinePtr = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // File header detection
      if (line.startsWith('diff --git ')) {
        if (currentHunk && currentFile) {
          currentFile.hunks.push(currentHunk);
          currentHunk = null;
        }
        if (currentFile) {
          files.push(currentFile);
        }
        const parts = line.split(' ');
        const oldP = parts[2]?.replace(/^[ab]\//, '') || '';
        const newP = parts[3]?.replace(/^[ab]\//, '') || '';
        currentFile = {
          oldPath: oldP,
          newPath: newP,
          isNew: false,
          isDeleted: false,
          hunks: [],
          additionsCount: 0,
          deletionsCount: 0,
        };
        continue;
      }

      if (!currentFile) {
        if (line.startsWith('--- a/')) {
          currentFile = {
            oldPath: line.replace('--- a/', ''),
            newPath: '',
            isNew: false,
            isDeleted: false,
            hunks: [],
            additionsCount: 0,
            deletionsCount: 0,
          };
        }
        continue;
      }

      if (line.startsWith('--- ')) {
        const p = line.slice(4).trim();
        if (p === '/dev/null') {
          currentFile.isNew = true;
        } else {
          currentFile.oldPath = p.replace(/^[ab]\//, '');
        }
        continue;
      }

      if (line.startsWith('+++ ')) {
        const p = line.slice(4).trim();
        if (p === '/dev/null') {
          currentFile.isDeleted = true;
        } else {
          currentFile.newPath = p.replace(/^[ab]\//, '');
        }
        continue;
      }

      // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
      if (hunkMatch) {
        if (currentHunk && currentFile) {
          currentFile.hunks.push(currentHunk);
        }
        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = hunkMatch[4] !== undefined ? parseInt(hunkMatch[4], 10) : 1;
        oldLinePtr = oldStart;
        newLinePtr = newStart;

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          header: line,
          lines: [],
        };
        continue;
      }

      // Lines inside hunk
      if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.lines.push({
            type: 'add',
            content: line.slice(1),
            newLineNumber: newLinePtr++,
          });
          currentFile.additionsCount++;
        } else if (line.startsWith('-')) {
          currentHunk.lines.push({
            type: 'delete',
            content: line.slice(1),
            oldLineNumber: oldLinePtr++,
          });
          currentFile.deletionsCount++;
        } else if (line.startsWith(' ') || line === '') {
          currentHunk.lines.push({
            type: 'context',
            content: line.startsWith(' ') ? line.slice(1) : '',
            oldLineNumber: oldLinePtr++,
            newLineNumber: newLinePtr++,
          });
        }
      }
    }

    if (currentHunk && currentFile) {
      currentFile.hunks.push(currentHunk);
    }
    if (currentFile && !files.includes(currentFile)) {
      files.push(currentFile);
    }

    return files;
  }

  /**
   * Applies the parsed file diffs directly onto an in-memory virtual tree.
   * Base content can be provided or initialized as empty for new files.
   */
  public applyVirtualPatch(filePath: string, baseContent: string = ''): VirtualFileEntry {
    const diff = this.parsedDiffs.get(filePath);
    if (!diff) {
      const entry: VirtualFileEntry = {
        path: filePath,
        content: baseContent,
        lastUpdated: Date.now(),
        patchAppliedCount: 0,
      };
      this.virtualTree.set(filePath, entry);
      return entry;
    }

    if (diff.isDeleted) {
      const entry: VirtualFileEntry = {
        path: filePath,
        content: '',
        lastUpdated: Date.now(),
        patchAppliedCount: 1,
      };
      this.virtualTree.delete(filePath);
      return entry;
    }

    // Apply hunks sequentially
    const originalLines = baseContent.split(/\r?\n/);
    const patchedLines: string[] = [];
    let origIdx = 0;

    for (const hunk of diff.hunks) {
      // Copy unchanged lines leading up to hunk oldStart (1-based)
      const targetOldStart = Math.max(0, hunk.oldStart - 1);
      while (origIdx < targetOldStart && origIdx < originalLines.length) {
        patchedLines.push(originalLines[origIdx++]);
      }

      // Process hunk lines
      for (const hLine of hunk.lines) {
        if (hLine.type === 'context') {
          origIdx++;
          patchedLines.push(hLine.content);
        } else if (hLine.type === 'delete') {
          origIdx++;
        } else if (hLine.type === 'add') {
          patchedLines.push(hLine.content);
        }
      }
    }

    // Copy any remaining lines after all hunks
    while (origIdx < originalLines.length) {
      patchedLines.push(originalLines[origIdx++]);
    }

    const finalContent = patchedLines.join('\n');
    const prev = this.virtualTree.get(filePath);
    const entry: VirtualFileEntry = {
      path: filePath,
      content: finalContent,
      lastUpdated: Date.now(),
      patchAppliedCount: (prev?.patchAppliedCount || 0) + 1,
    };
    this.virtualTree.set(filePath, entry);
    return entry;
  }

  /**
   * Returns current parsed diffs map.
   */
  public getParsedDiffs(): Map<string, FileDiff> {
    return new Map(this.parsedDiffs);
  }

  /**
   * Returns in-memory virtual filesystem snapshot.
   */
  public getVirtualTreeSnapshot(): Record<string, VirtualFileEntry> {
    const snapshot: Record<string, VirtualFileEntry> = {};
    for (const [k, v] of this.virtualTree.entries()) {
      snapshot[k] = { ...v };
    }
    return snapshot;
  }

  /**
   * Resets stream buffer, diff models, and virtual filesystem.
   */
  public reset(): void {
    this.rawBuffer = '';
    this.parsedDiffs.clear();
    this.virtualTree.clear();
  }
}

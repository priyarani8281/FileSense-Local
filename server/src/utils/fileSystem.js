import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { config } from '../config.js';

/**
 * Validate that a directory is safe to index (not a forbidden system or root dir)
 * @param {string} dirPath
 * @returns {{isValid: boolean, reason?: string, resolvedPath?: string}}
 */
export function validateDirectory(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') {
    return { isValid: false, reason: 'Invalid directory path provided.' };
  }

  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved)) {
    return { isValid: false, reason: 'Directory does not exist on disk.' };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { isValid: false, reason: 'Path is not a directory.' };
  }

  const normalized = resolved.toLowerCase();

  // Root drive protection (e.g. C:\)
  if (/^[a-zA-Z]:\\?$/.test(resolved) || resolved === '/' || resolved === '\\') {
    return {
      isValid: false,
      reason: 'Indexing an entire drive root is not allowed for privacy, performance, and safety. Please choose a specific user folder (such as Documents, Notes, or Projects).'
    };
  }

  // System directories check
  for (const blocked of config.blockedDirectories) {
    if (normalized.includes(blocked)) {
      return {
        isValid: false,
        reason: `Cannot index protected system or dependency directory: "${blocked}".`
      };
    }
  }

  return { isValid: true, resolvedPath: resolved };
}

/**
 * Open a document using the operating system's default handler
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export function openInDefaultApp(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('File does not exist on disk.'));
    }

    // Windows start command
    const platform = process.platform;
    let cmd = '';

    if (platform === 'win32') {
      cmd = `start "" "${filePath}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${filePath}"`;
    } else {
      cmd = `xdg-open "${filePath}"`;
    }

    exec(cmd, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * List subdirectories inside a directory for the in-app folder picker
 * @param {string} targetDir
 * @returns {Array<{name: string, path: string, isAccessible: boolean}>}
 */
export function listSubdirectories(targetDir) {
  const current = targetDir ? path.resolve(targetDir) : path.resolve(process.env.USERPROFILE || 'C:\\Users');

  if (!fs.existsSync(current)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const subdirs = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const full = path.join(current, entry.name);
        const lower = entry.name.toLowerCase();
        if (config.blockedDirectories.some(b => lower === b)) continue;

        subdirs.push({
          name: entry.name,
          path: full,
          isAccessible: true
        });
      }
    }

    return subdirs.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn('[FS] Error listing subdirectories:', err.message);
    return [];
  }
}

/**
 * Launch native OS folder dialog (Windows PowerShell FolderBrowserDialog)
 * @returns {Promise<string|null>}
 */
export function openNativeFolderDialog() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(null);
    }

    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
      $dialog.Description = "Select a folder to index in FileSense Local"
      $dialog.ShowNewFolderButton = $false
      if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $dialog.SelectedPath
      }
    `;

    exec(`powershell -NoProfile -Command "${script.replace(/\r?\n/g, '; ')}"`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

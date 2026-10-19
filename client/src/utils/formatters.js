export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  if (isNaN(date.getTime())) return String(timestamp);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function cleanPath(filePath) {
  if (!filePath) return '';
  // Normalize Windows slashes
  const norm = filePath.replace(/\\/g, '/');
  const parts = norm.split('/');
  if (parts.length <= 3) return norm;
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`;
}

export function getFileCategory(ext) {
  const clean = (ext || '').toLowerCase().replace(/^\./, '');
  if (['pdf'].includes(clean)) return 'pdf';
  if (['docx', 'doc'].includes(clean)) return 'docx';
  if (['md', 'markdown'].includes(clean)) return 'md';
  if (['txt', 'text'].includes(clean)) return 'txt';
  return 'doc';
}

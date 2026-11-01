/**
 * Saves a generated file. On phones the share sheet is used (Save to Files / Drive / Messenger…),
 * which works reliably in an installed app; elsewhere it's a normal download.
 * Returns 'cancelled' if the user closed the share sheet.
 */
export async function saveFile(name: string, content: string, type: string): Promise<'saved' | 'cancelled'> {
  const file = new File([content], name, { type });
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'saved';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Sharing failed for another reason: fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

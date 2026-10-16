export type MergeIconName = 'undo' | 'redo' | 'import' | 'download' | 'copy' | 'edit' | 'check' | 'reorder' | 'restore'
const paths: Record<MergeIconName, string> = {
  undo: 'M8 4 3 9l5 5M3 9h10a6 6 0 0 1 0 12',
  redo: 'm16 4 5 5-5 5m5-5H11a6 6 0 0 0 0 12',
  import: 'M12 16V3m-5 5 5-5 5 5M4 14v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6',
  download: 'M12 3v13m-5-5 5 5 5-5M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  copy: 'M8 8h12v13H8ZM16 8V3H3v13h5',
  edit: 'm14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z',
  check: 'm5 12 4 4L19 6',
  reorder: 'M4 5h11M4 10h8M4 15h5M4 20h8m6-12v12m-3-3 3 3 3-3',
  restore: 'M3 4v6h6M3 10a9 9 0 1 1 0 6M12 7v6l4 2',
}
export function MergeIcon({ name }: { name: MergeIconName }) {
  return <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round'><path d={paths[name]} /></svg>
}

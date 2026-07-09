import { cn } from '@/lib/utils';
import { UploadIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const renderBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) { size /= 1024; unitIndex++; }
  return `${size.toFixed(1)}${units[unitIndex]}`;
};

export function Dropzone({
  src = [],
  onDrop,
  onRemove,
  className,
  accept,
  maxSize,
  maxFiles = 10,
  minSize,
  disabled,
  children,
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    minSize,
    disabled,
    onDropRejected: () => {},
  });

  const hasFiles = src.length > 0;

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
          isDragActive
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50',
          hasFiles ? 'py-4 px-4' : 'py-10 px-6 cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {children || (
          <div className="flex flex-col items-center text-center">
            <div className={cn('rounded-full bg-slate-100 dark:bg-slate-700 p-3 mb-3 transition-colors', isDragActive && 'bg-emerald-100')}>
              <UploadIcon className={cn('h-6 w-6 transition-colors', isDragActive ? 'text-emerald-600' : 'text-slate-400 dark:text-slate-500')} />
            </div>
            {isDragActive ? (
              <p className="text-sm font-semibold text-emerald-600">Drop files here...</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drag & drop or click to browse</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {accept ? Object.values(accept).flat().join(', ') : 'Images & PDFs'} — Max {maxFiles} files
                  {maxSize ? ` (${renderBytes(maxSize)} each)` : ''}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {hasFiles && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {src.map((file, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 group">
              {file.type?.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs font-medium p-1 text-center break-all">
                  {file.name}
                </div>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

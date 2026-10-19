import { MAX_PLACED_IMAGE_SIDE } from './factory';

export interface PickedImage {
  name: string;
  url: string;
  /** size to place it at: natural aspect ratio, longest side capped */
  width: number;
  height: number;
}

/**
 * Opens the system file picker straight away. Must be called from a user gesture
 * (e.g. a menu click). Resolves null if the picker is dismissed or the file isn't an image.
 */
export function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    const done = (value: PickedImage | null) => {
      input.remove();
      resolve(value);
    };

    input.addEventListener('cancel', () => done(null));
    input.addEventListener('change', () => {
      const file = input.files ? input.files[0] : undefined;
      if (!file || !file.type.startsWith('image/')) {
        done(null);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => done(null);
      reader.onload = () => {
        const url = String(reader.result);
        const img = new Image();
        img.onerror = () => done(null);
        img.onload = () => {
          const naturalW = img.naturalWidth || 1;
          const naturalH = img.naturalHeight || 1;
          const scale = Math.min(1, MAX_PLACED_IMAGE_SIDE / Math.max(naturalW, naturalH));
          done({
            name: file.name.replace(/\.[^.]+$/, '') || 'New Image',
            url,
            width: Math.max(8, Math.round(naturalW * scale)),
            height: Math.max(8, Math.round(naturalH * scale)),
          });
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });

    input.click();
  });
}

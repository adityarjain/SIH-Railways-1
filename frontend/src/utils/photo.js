/**
 * Shrinks a camera photo in the browser before it is sent: longest side
 * 1600 px, JPEG at 0.8. A phone photo drops from several MB to a few hundred
 * KB, well under the API's 3 MB limit.
 */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export const shrinkPhoto = (file, maxSide = 1600, quality = 0.8) =>
  new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Choose an image file')); return; }
    if (file.size > MAX_INPUT_BYTES) { reject(new Error('Photo is larger than 20 MB')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', dataUrl: canvas.toDataURL('image/jpeg', quality) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });

// Each nonzero RGB integer stores one plus the sector's density in hab./km².
export async function sectorStencil() {
  const source = new Image();
  source.src = new URL('setores-2010.png', import.meta.url);
  await source.decode();

  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  canvas.setAttribute('role', 'img');
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(source, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = frame.data;
  const pixels = new Int32Array(canvas.width * canvas.height);
  for (let i = 0; i < pixels.length; i++) {
    const j = 4 * i;
    pixels[i] = ((rgba[j] << 16) | (rgba[j + 1] << 8) | rgba[j + 2]) - 1;
    rgba[j] = 20;
    rgba[j + 1] = 23;
    rgba[j + 2] = 22;
  }

  function draw(cutoff) {
    for (let i = 0; i < pixels.length; i++) {
      rgba[4 * i + 3] = pixels[i] >= cutoff ? 255 : 0;
    }
    ctx.putImageData(frame, 0, 0);
    canvas.setAttribute('aria-label', 'Setores de São Paulo com pelo menos ' +
      cutoff.toLocaleString('pt-BR') + ' habitantes por km² em 2010.');
  }
  return {canvas, pixels, draw};
}

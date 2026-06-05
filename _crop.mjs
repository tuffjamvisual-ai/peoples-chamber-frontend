import sharp from 'sharp';
const img = sharp('public/pca-art.webp');
const meta = await img.metadata();
console.log('art size:', meta.width, 'x', meta.height);
// issue hotspot: x 5.5%, y 7.2%, w 16.5%, h 9.5% — crop a bit wider for context
const x = Math.round(meta.width * 0.03), y = Math.round(meta.height * 0.05);
const w = Math.round(meta.width * 0.22), h = Math.round(meta.height * 0.14);
await sharp('public/pca-art.webp').extract({ left:x, top:y, width:w, height:h }).resize({ width: 600 }).png().toFile('/tmp/issue-crop.png');
console.log('crop region px:', {x,y,w,h});

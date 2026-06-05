import sharp from 'sharp';
// candidate clean-paper regions near the box (box ~ x56-225, y111-257)
const cands = {
  below:  { left:56,  top:262, width:170, height:30 },
  inside_top: { left:70, top:120, width:140, height:22 },
  right_of_box: { left:235, top:120, width:60, height:120 },
};
for (const [k,r] of Object.entries(cands)) {
  await sharp('public/pca-art.webp').extract(r).resize({width:300}).png().toFile(`/tmp/sw-${k}.png`);
}
console.log('saved swatches');

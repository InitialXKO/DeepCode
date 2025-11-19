const icongen = require('icon-gen');
const png2icons = require('png2icons');
const fs = require('fs');

async function generateIcons() {
  try {
    // Generate .ico and .icns from the original image
    await icongen('/tmp/file_attachments/1731207544_4d487566b5a94c8f9592872ec725dc2a.png', 'desktop-ui/src-tauri/icons', { report: true });

    // Generate .png files from the original image
    const input = fs.readFileSync('/tmp/file_attachments/1731207544_4d487566b5a94c8f9592872ec725dc2a.png');

    // 32x32.png
    let output = png2icons.createICO(input, png2icons.BILINEAR, 0, false, true, [32]);
    fs.writeFileSync('desktop-ui/src-tauri/icons/32x32.png', output);

    // 128x128.png
    output = png2icons.createICO(input, png2icons.BILINEAR, 0, false, true, [128]);
    fs.writeFileSync('desktop-ui/src-tauri/icons/128x128.png', output);

    // 128x128@2x.png
    output = png2icons.createICO(input, png2icons.BILINEAR, 0, false, true, [256]);
    fs.writeFileSync('desktop-ui/src-tauri/icons/128x128@2x.png', output);

    console.log('Icons generated successfully!');
  } catch (err) {
    console.error(err);
  }
}

generateIcons();

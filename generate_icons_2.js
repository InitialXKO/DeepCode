const png2icons = require('png2icons');
const fs = require('fs');

async function generateIcons() {
  try {
    const input = fs.readFileSync('/tmp/file_attachments/1731207544_4d487566b5a94c8f9592872ec725dc2a.png');

    // Generate icon.ico
    let icoOutput = png2icons.createICO(input, png2icons.BILINEAR, 0, false, false);
    fs.writeFileSync('desktop-ui/src-tauri/icons/icon.ico', icoOutput);

    // Generate icon.icns
    let icnsOutput = png2icons.createICNS(input, png2icons.BILINEAR, 0);
    fs.writeFileSync('desktop-ui/src-tauri/icons/icon.icns', icnsOutput);

    console.log('Icons generated successfully!');
  } catch (err) {
    console.error(err);
  }
}

generateIcons();

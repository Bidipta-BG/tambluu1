const fs = require('fs');
const path = require('path');

const fileToDelete = path.join(__dirname, 'app', 'admin', 'page.tsx');

if (fs.existsSync(fileToDelete)) {
  fs.unlinkSync(fileToDelete);
  console.log('Deleted app/admin/page.tsx');
} else {
  console.log('File not found.');
}

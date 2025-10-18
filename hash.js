const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'Admin123';
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hash generado:', hash);
}

generateHash();

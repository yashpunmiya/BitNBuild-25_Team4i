const fs = require('fs');

// Simple base58 encoder (without external dependencies)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes) {
  if (bytes.length === 0) return '';
  
  let digits = [0];
  
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  
  // Handle leading zeros
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros++;
  }
  
  let result = '';
  for (let i = 0; i < leadingZeros; i++) {
    result += BASE58_ALPHABET[0];
  }
  
  for (let i = digits.length - 1; i >= 0; i--) {
    result += BASE58_ALPHABET[digits[i]];
  }
  
  return result;
}

try {
  // Read and convert fee-payer keypair
  const feePayerKeypair = JSON.parse(fs.readFileSync('fee-payer.json'));
  const feePayerBase58 = base58Encode(new Uint8Array(feePayerKeypair));
  
  // Read and convert collection-authority keypair
  const collectionAuthorityKeypair = JSON.parse(fs.readFileSync('collection-authority.json'));
  const collectionAuthorityBase58 = base58Encode(new Uint8Array(collectionAuthorityKeypair));
  
  console.log('Fee Payer Base58:');
  console.log(feePayerBase58);
  console.log('');
  console.log('Collection Authority Base58:');
  console.log(collectionAuthorityBase58);
  console.log('');
  console.log('Public Keys:');
  console.log('Fee Payer Public Key: 4Eoeq4SPSevhrGokGiVdpvooDZ474GX4gTmAis5YUqWC');
  console.log('Collection Authority Public Key: ES5a4uW4kbb2p8XiX481rDAWFMYxDr7ms8YLH1DcX9ZL');
  
} catch (error) {
  console.error('Error:', error.message);
}
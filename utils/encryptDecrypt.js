var aes = require('crypto-js/aes');
var CryptoJS = require('crypto-js');
var config = require('../config');

var secretKey = "";
var encryptionText = "";
var decryptionText = "";

var encryptedText = aes.encrypt(encryptionText, secretKey).toString();
var decryptedText = aes.decrypt(encryptedText, secretKey).toString(CryptoJS.enc.Utf8);

console.log("Encrypted : " + encryptedText);
console.log("Decrypted : " + decryptedText);
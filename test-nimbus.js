import axios from 'axios';

async function testAuth() {
  const email = "neonxpro30@gmail.com";
  const password = "yFFqijTctW0DiCNAHkN5VwFR8zvT-N34"; 
  const key = "npk_cdd9a290b185ff59";

  const payloadFormats = [
    { email: email, password: password },
    { email: email, password: "Priyanshu@966" },
    { key: key, secret: password },
    { api_key: key, api_secret: password }
  ];

  for (let payload of payloadFormats) {
    try {
      console.log('Testing login payload:', JSON.stringify(payload));
      let res = await axios.post('https://api.nimbuspost.com/v1/users/login', payload);
      console.log('Login Success:', res.data);
      return;
    } catch(e) {
      console.log('Login failed:', e.response?.data?.message || e.message);
    }
  }

  // test generateToken endpoint
  for (let payload of payloadFormats) {
    try {
      console.log('Testing generateToken payload:', JSON.stringify(payload));
      let res = await axios.post('https://api.nimbuspost.com/v1/users/generateToken', payload);
      console.log('Login Success:', res.data);
      return;
    } catch(e) {
      console.log('Login failed:', e.response?.data?.message || e.message);
    }
  }
}
testAuth();

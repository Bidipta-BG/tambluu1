const fetch = require('node-fetch'); // or native fetch in newer node

async function testFetch() {
  const url = 'http://192.168.1.17:3001/api/starttambola/tenants/811db196-a1fe-44a7-a174-582356172be7/games/ffe39476-a75c-4b40-9c21-1a8921edddee/dividends';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // won't be present in pure node run without dotenv, let's hardcode for test or just run without auth first
  
  console.log("Fetching: " + url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}

testFetch();

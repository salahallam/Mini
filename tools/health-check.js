fetch("http://localhost:3000/api/health")
  .then(async r => console.log(await r.json()))
  .catch(() => {
    console.error("Chatter API is not reachable on http://localhost:3000");
    process.exit(1);
  });

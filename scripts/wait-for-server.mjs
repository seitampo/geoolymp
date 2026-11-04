const url = "http://localhost:3000/login";
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if ((await fetch(url)).ok) {
      ready = true;
      break;
    }
  } catch {
    /* Server is starting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready)
  throw new Error("Local application did not become ready within 60 seconds.");
console.log("Local application is ready.");

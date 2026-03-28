import app from "./app.js";
import { config } from "./config.js";

app.listen(config.app.port, () => {
  console.log(`S3 server running on ${process.env.PUBLIC_BASE_URL}`);
});

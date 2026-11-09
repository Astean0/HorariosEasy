const path = require("node:path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, "public");

app.disable("x-powered-by");
app.use(express.json());

app.get("/config.js", (_request, response) => {
  const config = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  };

  response.type("application/javascript").send(
    `window.HORARIOS_CONFIG = ${JSON.stringify(config)};`
  );
});

app.use(express.static(publicDirectory));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "horarios-easy" });
});

app.use((_request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

app.listen(port, () => {
  console.log(`HorariosEasy disponible en http://localhost:${port}`);
});

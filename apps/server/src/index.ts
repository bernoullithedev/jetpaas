import cors from "cors";
import express from "express";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  console.log("Client Connection");
  res.setHeader("Content-Type","text/event-stream")
  res.setHeader("Access-Control-Allow-Origin", "*")

  const intervalId = setInterval(()=>{
    const date = new Date().toLocaleString()
    res.write(`data: ${date}\n\n`)
  },1000)

  res.on("close", ()=>{
    console.log("Client closed connection")
    clearInterval(intervalId)
    res.end()
  })
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from Jetpaas API" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

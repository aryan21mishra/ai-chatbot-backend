import express, { json } from "express";
import { generate } from "./chatbot.js";
import cors from "cors";
const app = express();
const port = 5000;

app.use(express.json());
app.use(cors());
app.get("/", (req, res) => {
  res.send("Welcome to ChatBot");
});

app.post("/chat", async (req, res) => {
  const { message, id } = req.body;
  console.log("message", req.body);

  if (!message || !id) {
    res.json({ message: "Please provide the all field!" });
    return;
  }

  const result = await generate(message, id);

  res.json({ message: "ok!", response: result });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

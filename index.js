require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

const { MONGODB_URI, PORT = 3000 } = process.env;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "routewise",
  })
  .then(() => console.log("MongoDB Atlas bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

app.use(cors());
app.use(express.json({ limit: "350mb" }));
app.use(express.urlencoded({ limit: "350mb", extended: true }));

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(err.status || 500).json({ message: err.message });
});

const AuthCrud = require("./Authentication/Crud");
const OpenAI = require("./openai/openAIWhisper");
app.use("/", AuthCrud, OpenAI);

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(err.status || 500).json({ message: err.message });
});

const server = http.createServer(app);
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    var ClientSendedObject = {payload:{message:"Payload sunucu tarafından iletildi."}, trustedDevices: {}};
    try {
      var data = JSON.parse(msg);

      if(!Object.keys(data).length) {
        ws.send(JSON.stringify(ClientSendedObject));
      }
    } catch (error) {
      console.error("Mesaj parse hatası:", error);
    }
    ws.send(JSON.stringify(ClientSendedObject));
  });
});


server.listen(PORT, () => {
  console.log("SERVER başlatıldı.");
});
module.exports = app;
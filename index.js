require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");

const User = require("./Schemas/User");

const { MONGODB_URI, PORT = 3000 } = process.env;

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "routewise",
  })
  .then(() => console.log("MongoDB Atlas bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));


var devOrigins = ['http://localhost:8100', 'http://192.168.1.105:8100', 'http://192.168.1.100:8100'];
var prodOrigins = [
    'capacitor://localhost',
    'ionic://localhost',
    'android-app://com.yusufberkankaymaz.routewise'
];

const allowedOrigins = process.env.NODE_ENV === 'production' ? prodOrigins : devOrigins;

var corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bu kaynağın CORS politikası tarafından erişimine izin verilmiyor.'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
};

app.use(cors(corsOptions));
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

app.use(express.static('public'));

const server = http.createServer(app);
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    var ClientSendedObject = {payload:{}, trustedDevices: {}};
    try {
      var data = JSON.parse(msg);

      if (data.UserData && data.UserData._id) {
        ws.userId = data.UserData._id.toString();
      }

      if(!Object.keys(data).length) {
        ws.send(JSON.stringify(ClientSendedObject));
      }
    } catch (error) {
      console.error("Mesaj parse hatası:", error);
    }
    ws.send(JSON.stringify(ClientSendedObject));
  });
});

const userChangeStream = User.watch();

userChangeStream.on("change", (change) => {
  var changedUserId = change.documentKey._id.toString();
  wss.clients.forEach((client) => {
    var ChangedAuthFields = change.updateDescription.updatedFields;
    
    if(ChangedAuthFields.ProfileImage) ChangedAuthFields.ProfileImage = aes256Decrypt(ChangedAuthFields.ProfileImage);
    
    if ( client.readyState === WebSocket.OPEN && client.userId === changedUserId) {
      client.send(JSON.stringify({ type: "UserUpdate", payload: ChangedAuthFields }));
    }
  });
});

server.listen(PORT, () => {
  console.log("SERVER başlatıldı.");
});
module.exports = app;
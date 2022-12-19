/* A quite detailed WebSockets example */
import uWs from "uWebSockets.js";
import path from "path";
import dotenv from "dotenv";
import queryService from "./services/query.service.js";

const __dirname = path.resolve();
const mode = process.env.NODE_ENV;

dotenv.config({
  path: path.join(__dirname, ".env"),
});
dotenv.config({
  path: path.join(__dirname, `.env.${mode}`),
});

const port = Number(process.env.PORT) || 3000;
const backpressure = 1024;
const app = uWs
  ./*SSL*/ App({
    key_file_name: "misc/key.pem",
    cert_file_name: "misc/cert.pem",
    passphrase: "1234",
  })
  .ws("/*", {
    /* Options */
    compression: uWs.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 32,
    /* Handlers */
    upgrade: (res, req, context) => {
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      /* This immediately calls open handler, you must not use res after this call */
      res.upgrade(
        {
          url: req.getUrl(),
          id: req.getQuery("id"),
          uuid: req.getQuery("uuid"),
          server: req.getQuery("server"),
          channel: req.getQuery("channel"),
          socketIp: req.getQuery("socketIp"),
          socketPort: req.getQuery("socketPort"),
          publisherIp: req.getQuery("publisherIp"),
          publisherPort: req.getQuery("publisherPort"),
        },
        /* Spell these correctly */
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context
      );
    },
    open: (ws) => {
      console.log("A WebSocket connected with URL: " + ws.url);
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        if (ws.getBufferedAmount() < backpressure) {
          // ws.send("This is a message, let's call it " + messageNumber);
          // do something
        }
      } else {
        // type별 분기
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
      // 로그아웃
    },
  })
  .post("/attach", (res, req) => {
    getBody(res, (json) => {
      console.log(json);
      queryService
        .attach({
          body: json,
        })
        .then((result) => {
          res.end(JSON.stringify(result));
        });
    });
  })
  .post("/login", (res, req) => {
    res.end("Nothing to see here!");
  })
  // .post("/logout", (res, req) => {
  //   res.end("Nothing to see here!");
  // })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

function getBody(res, cb) {
  let buffer;
  /* Register data cb */
  res.onData((ab, isLast) => {
    let chunk = Buffer.from(ab);
    if (isLast) {
      let json;
      if (buffer) {
        try {
          json = JSON.parse(Buffer.concat([buffer, chunk]));
        } catch (e) {
          /* res.close calls onAborted */
          res.close();
          return;
        }
        cb(json);
      } else {
        try {
          json = JSON.parse(chunk);
        } catch (e) {
          /* res.close calls onAborted */
          res.close();
          return;
        }
        cb(json);
      }
    } else {
      if (buffer) {
        buffer = Buffer.concat([buffer, chunk]);
      } else {
        buffer = Buffer.concat([chunk]);
      }
    }
  });

  /* Register error cb */
  res.onAborted(() => {
    /* Request was prematurely aborted or invalid or missing, stop reading */
    console.log("Invalid JSON or no data at all!");
  });
}

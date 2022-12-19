import mariaConf from "./maria.conf.js";
import mysql2 from "mysql2";

let conn = null;

function getConnection() {
  conn = mysql2.createConnection(mariaConf);
  conn.on("connect", (err) => {
    if (err) {
    }
    console.log("connection");
  });
  conn.on("error", (err) => {
    getConnection();
  });
}
getConnection();

export { conn as sql };

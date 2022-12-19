import dotenv from "dotenv";
import path from "path";

const __dirname = path.resolve();
const mode = process.env.NODE_ENV;
console.log(mode)
dotenv.config({
  path: path.join(__dirname, ".env"),
});
dotenv.config({
  path: path.join(__dirname, `.env.${mode}`),
});

export default {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
};

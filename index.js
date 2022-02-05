import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import pg from "pg";
import jsSHA from 'jssha';

const app = express();
const { Pool } = pg;
const pgConnectionConfigs = {
  user: "postgres",
  host: "localhost",
  database: "birding",
  port: 5432,
};

const pool = new Pool(pgConnectionConfigs);

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.post("/signup", (request, response) => {
  const { email, password } = request.body;

  const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
  shaObj.update(password);
  const hashedPassword = shaObj.getHash('HEX');

  const sqlQuery = `INSERT INTO users (email, password) VALUES ('${email}', '${hashedPassword}')`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    console.log("User added");
    response.render("signup");
  });
});

app.get("/signup", (request, response) => {
  response.render("signup");
});

app.post("/login", (request, response) => {
  const { email, password } = request.body;

  const sqlQuery = `SELECT COUNT(*) FROM users WHERE email = '${email}' AND password = '${password}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    if (result.rowCount === 1) {
      console.log("User found");
    } else {
      console.log("User not found");
    }
    response.render("login");
  });
});

app.get("/login", (request, response) => {
  response.render("login");
});

app.listen(3004);

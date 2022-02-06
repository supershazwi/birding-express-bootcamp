import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import pg from "pg";
import jsSHA from 'jssha';
import e from "express";

const app = express();
const { Pool } = pg;
const pgConnectionConfigs = {
  user: "postgres",
  host: "localhost",
  database: "birding",
  port: 5432,
};

const pool = new Pool(pgConnectionConfigs);
const SALT = 'bananas are delicious';

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get('/note', (request, response) => {
  if (request.cookies.userId !== undefined) {
    const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
    const unhashedCookieString = `${request.cookies.userId}-${SALT}`;
    shaObj.update(unhashedCookieString);
    const hashedCookieString = shaObj.getHash('HEX');

    if (hashedCookieString === request.cookies.loggedInHash) {
      const data = {
        userId: request.cookies.userId
      }
      response.render('admin', data);
    } else {
      response.redirect('/login');
    }
  } else {
    response.redirect('/login');
  }
});

app.get('/admin', (request, response) => {
  if (request.cookies.userId !== undefined) {
    const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
    const unhashedCookieString = `${request.cookies.userId}-${SALT}`;
    shaObj.update(unhashedCookieString);
    const hashedCookieString = shaObj.getHash('HEX');

    if (hashedCookieString === request.cookies.loggedInHash) {
      const data = {
        userId: request.cookies.userId
      }
      response.render('admin', data);
    } else {
      response.redirect('/login');
    }
  } else {
    response.redirect('/login');
  }
})

app.delete('/logout', (request, response) => {
  response.clearCookie("userId");
  response.clearCookie("loggedInHash");
  response.redirect('/login');
});

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

    response.render("signup");
  });
});

app.get("/signup", (request, response) => {
  response.render("signup");
});

app.post("/login", (request, response) => {
  const { email, password } = request.body;

  const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
  shaObj.update(password);
  const hashedPassword = shaObj.getHash('HEX');

  const sqlQuery = `SELECT * FROM users WHERE email = '${email}' AND password = '${hashedPassword}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    if (result.rows[0] !== undefined) {
      const shaObj2 = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
      const user = result.rows[0];
      const unhashedCookieString = `${user.id}-${SALT}`;
      shaObj2.update(unhashedCookieString);
      const hashedCookieString = shaObj2.getHash('HEX');

      response.cookie('loggedInHash', hashedCookieString);
      response.cookie('userId', user.id);
      response.redirect("/admin");

    } else {
      response.redirect("/login");
    }
  });
});

app.get("/login", (request, response) => {
  if (request.cookies.userId !== undefined) {
    response.redirect('/admin');
  } else {
    const data = {
      userId: request.cookies.userId
    }
    response.render("login", data);
  }
});

app.listen(3004);

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import pg from "pg";
import jsSHA from 'jssha';
import moment from "moment";

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

app.get("/users/:id", (request, response) => {
  const sqlQuery = `SELECT notes.id, notes.behavior, notes.flock_size, notes.date_time, notes.user_id, users.email FROM notes INNER JOIN users ON notes.user_id = users.id WHERE user_id = ${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const data = {
      notes: result.rows,
    };

    data.notes.forEach((note, index) => {
      data.notes[index].flockSize = data.notes[index].flock_size;
      data.notes[index].dateTime = data.notes[index].date_time;
      delete data.notes[index]["flock_size"];
      delete data.notes[index]["date_time"];
    });

    data.userId = request.cookies.userId;

    console.log(data);

    response.render("notes", data);
  });
});

app.get("/", (request, response) => {
  const sqlQuery = `SELECT notes.id, notes.behavior, notes.flock_size, notes.date_time, notes.user_id, users.email FROM notes INNER JOIN users ON notes.user_id = users.id`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const data = {
      notes: result.rows,
    };

    data.notes.forEach((note, index) => {
      data.notes[index].flockSize = data.notes[index].flock_size;
      data.notes[index].dateTime = data.notes[index].date_time;
      delete data.notes[index]["flock_size"];
      delete data.notes[index]["date_time"];
    });

    data.userId = request.cookies.userId;

    response.render("notes", data);
  });
});

// NOTES //

app.get("/note/:id/edit", (request, response) => {
  const sqlQuery = `SELECT * FROM notes WHERE id = '${request.params.id}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }
    const data = result.rows[0];
    data.flockSize = data.flock_size;
    data.dateTime = moment(data.date_time).format().slice(0,16);
    data.userId = request.cookies.userId;

    response.render("editNote", data);
  });
});

app.get("/note/:id", (request, response) => {
  const sqlQuery = `SELECT notes.id, notes.behavior, notes.flock_size, notes.date_time, notes.user_id, users.email FROM notes INNER JOIN users ON notes.user_id = users.id WHERE notes.id = ${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const data = result.rows[0];
    data.flockSize = data.flock_size;
    data.dateTime = data.date_time;
    delete data["flock_size"];
    delete data["date_time"];
    data.userId = request.cookies.userId;

    console.log(data);

    response.render("viewNote", data);
  });
});

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
      response.render('addNote', data);
    } else {
      response.redirect('/login');
    }
  } else {
    response.redirect('/login');
  }
});

app.post("/note", (request, response) => {
  const behavior = request.body.behavior;
  const flockSize = request.body.flockSize;
  const dateTime = request.body.dateTime;

  const sqlQuery = `INSERT INTO notes (behavior, flock_size, date_time, user_id) VALUES ('${behavior}', '${flockSize}', '${dateTime}', ${request.cookies.userId}) RETURNING id`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

  response.redirect(`/note/${result.rows[0].id}`);
  });
});

app.put("/note/:id/edit", (request, response) => {
  const sqlQuery = `UPDATE notes SET behavior = '${request.body.behavior}', flock_size = '${request.body.flockSize}', date_time = '${request.body.dateTime}' WHERE id=${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    response.redirect(`/note/${request.params.id}`);
  });
});

app.delete("/note/:id/delete", (request, response) => {
  const sqlQuery = `DELETE FROM notes WHERE id=${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    response.redirect(`/`);
  });
});

// CREDENTIALS // 

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
});

app.get("/signup", (request, response) => {
  if (request.cookies.userId !== undefined) {
    response.redirect('/admin');
  } else {
    const data = {
      userId: request.cookies.userId
    }
    response.render("signup", data);
  }
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

    response.redirect('/login');
  });

});

app.delete('/logout', (request, response) => {
  response.clearCookie("userId");
  response.clearCookie("loggedInHash");
  response.redirect('/login');
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

app.listen(3004);
    


import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import pg from "pg";

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

app.get("/note/:id", (request, response) => {
  const sqlQuery = `SELECT * FROM notes WHERE id = '${request.params.id}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    console.log(result.rows[0]);

    const data = result.rows[0];
    data.flockSize = data.flock_size;
    data.dateTime = data.date_time;
    delete data["flock_size"];
    delete data["date_time"];

    response.render("viewNote", data);
  });
});

app.get("/note", (request, response) => {
  response.render("addNote");
});

app.post("/note", (request, response) => {
  const behavior = request.body.behavior;
  const flockSize = request.body.flockSize;
  const dateTime = request.body.dateTime;

  const sqlQuery = `INSERT INTO notes (behavior, flock_size, date_time) VALUES ('${behavior}', '${flockSize}', '${dateTime}') RETURNING id`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    console.log("Inserted row");
    response.redirect(`/note/${result.rows[0].id}`);
  });
});

app.get("/", (request, response) => {
  const sqlQuery = `SELECT * FROM notes`;

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

    response.render("notes", data);
  });
});

app.listen(3004);

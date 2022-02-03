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

app.post("/register", (request, response) => {
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

app.get("/register", (request, response) => {
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

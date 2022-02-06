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

    const sqlQuery2 = `SELECT * FROM comments WHERE user_id = ${request.params.id}`;

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
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
      data.comments = result2.rows;

      response.render("viewUser", data);
    });
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

// SPECIES // 

app.get("/species/all", (request, response) => {
  const sqlQuery = `SELECT * FROM species`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const data = {
      species: result.rows,
      userId: request.cookies.userId
    };

    response.render("species", data);
  });
});

app.get("/species/:id/edit", (request, response) => {
  const sqlQuery = `SELECT * FROM species WHERE id = '${request.params.id}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }
    const data = result.rows[0];
    data.scientificName = data.scientific_name;
    data.userId = request.cookies.userId;

    response.render("editSpecies", data);
  });
});

app.put("/species/:id/edit", (request, response) => {
  const sqlQuery = `UPDATE species SET name = '${request.body.name}', scientific_name = '${request.body.scientificName}' WHERE id=${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    response.redirect(`/species/${request.params.id}`);
  });
});

app.delete("/species/:id/delete", (request, response) => {
  // delete notes with the species first
  // get notes with species id first
  const sqlQuery = `SELECT notes.id FROM notes INNER JOIN notes_species ON notes.id = notes_species.notes_id WHERE notes_species.species_id = ${request.params.id};`

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    let queryDoneCounter = 0;

    result.rows.forEach(note => {
      const sqlQuery2 = `DELETE FROM notes WHERE id = ${note.id}`;
      
      pool.query(sqlQuery2, (error2, result2) => {
        if (error2) {
          console.log("Error executing query", error2.stack);
          return;
        }

        queryDoneCounter += 1;

        if (queryDoneCounter === result.rows.length) {
          // done with deleting notes

            // delete from many to many table
          const sqlQuery3 = `DELETE FROM notes_species WHERE species_id = ${request.params.id}`;

          pool.query(sqlQuery3, (error3, result3) => {
            if (error3) {
              console.log("Error executing query", error3.stack);
              return;
            }

            // done deleting from many to many table
            const sqlQuery4 = `DELETE FROM species WHERE id = ${request.params.id}`;

            pool.query(sqlQuery4, (error4, result4) => {
              if (error4) {
                console.log("Error executing query", error4.stack);
                return;
              }

              response.redirect('/species/all');
            });
          });

        }
      })
    });
    
    // delete notes
     
  });
});

app.get("/species/:id", (request, response) => {
  const sqlQuery = `SELECT * FROM species WHERE species.id = ${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const sqlQuery2 = `SELECT notes.id FROM notes INNER JOIN notes_species ON notes.id = notes_species.notes_id WHERE notes_species.species_id = ${request.params.id};`

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
        return;
      }
      
      const data = {
        species: result.rows[0],
        userId: request.cookies.userId,
        notes: result2.rows
      };

      data.species.scientificName = data.species.scientific_name;

      response.render("viewSpecies", data);
    });
  });
});

app.get("/species", (request, response) => {
  if (request.cookies.userId !== undefined) {
    const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
    const unhashedCookieString = `${request.cookies.userId}-${SALT}`;
    shaObj.update(unhashedCookieString);
    const hashedCookieString = shaObj.getHash('HEX');

    if (hashedCookieString === request.cookies.loggedInHash) {
      const data = {
        userId: request.cookies.userId
      }
      response.render('addSpecies', data);
    } else {
      response.redirect('/login');
    }
  } else {
    response.redirect('/login');
  }
});

app.post("/species", (request, response) => {
  const name = request.body.name;
  const scientificName = request.body.scientificName;

  const sqlQuery = `INSERT INTO species (name, scientific_name) VALUES ('${name}', '${scientificName}') RETURNING id`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

  response.redirect(`/species/${result.rows[0].id}`);
  });
});

// NOTES //

app.get("/note/:id", (request, response) => {
  const sqlQuery = `SELECT notes.id, notes.behavior, notes.flock_size, notes.date_time, notes.user_id, users.email FROM notes INNER JOIN users ON notes.user_id = users.id WHERE notes.id = ${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const sqlQuery2 = `SELECT species.id, species.name FROM species INNER JOIN notes_species ON species.id = notes_species.species_id WHERE notes_species.notes_id = ${request.params.id}`;

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
        return;
      }

      const sqlQuery3 = `SELECT users.email, comments.comment, comments.created_at FROM comments INNER JOIN users ON comments.user_id = users.id WHERE note_id = ${request.params.id}`;

      pool.query(sqlQuery3, (error3, result3) => {
        if (error3) {
          console.log("Error executing query", error3.stack);
          return;
        }

        
        const data = result.rows[0];
        data.flockSize = data.flock_size;
        data.dateTime = data.date_time;
        delete data["flock_size"];
        delete data["date_time"];
        data.userId = request.cookies.userId;
        data.noteId = request.params.id;
        data.species = result2.rows;
        data.comments = result3.rows;

        console.log(data.comments);
        
        response.render("viewNote", data);
      });
    });
  });
});

app.get('/note', (request, response) => {
  if (request.cookies.userId !== undefined) {
    const shaObj = new jsSHA('SHA-512', 'TEXT', {encoding: 'UTF8'});
    const unhashedCookieString = `${request.cookies.userId}-${SALT}`;
    shaObj.update(unhashedCookieString);
    const hashedCookieString = shaObj.getHash('HEX');

    if (hashedCookieString === request.cookies.loggedInHash) {
      const sqlQuery = `SELECT * FROM species`;

      pool.query(sqlQuery, (error, result) => {
        if (error) {
          console.log("Error executing query", error.stack);
          return;
        }

        const data = {
          species: result.rows,
          userId: request.cookies.userId
        }
        
        response.render('addNote', data);
      });
      
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
  let speciesIds = request.body.speciesIds;

  if (typeof(speciesIds) === 'string') {
    speciesIds = [speciesIds];
  }

  const sqlQuery = `INSERT INTO notes (behavior, flock_size, date_time, user_id) VALUES ('${behavior}', '${flockSize}', '${dateTime}', ${request.cookies.userId}) RETURNING id`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    let queryDoneCounter = 0;

    speciesIds.forEach((speciesId) => {
      const sqlQuery2 = `INSERT into notes_species (notes_id, species_id) VALUES (${result.rows[0].id}, ${speciesId})`;

      pool.query(sqlQuery2, (error2, result2) => {
        if (error2) {
          console.log("Error executing query", error2.stack);
          return;
        }

        queryDoneCounter += 1;

        if (queryDoneCounter === speciesIds.length) {
          response.redirect(`/note/${result.rows[0].id}`);
        }
      })
    });
  });
});

app.get("/note/:id/edit", (request, response) => {
  const sqlQuery = `SELECT * FROM notes WHERE id = '${request.params.id}'`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const sqlQuery2 = `SELECT * FROM species`;

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
        return;
      }

      const sqlQuery3 = `SELECT species.id, species.name FROM species INNER JOIN notes_species ON species.id = notes_species.species_id WHERE notes_species.notes_id = ${request.params.id}`;

      pool.query(sqlQuery3, (error3, result3) => {
        if (error3) {
          console.log("Error executing query", error3.stack);
          return;
        }

        const data = result.rows[0];
        data.flockSize = data.flock_size;
        data.dateTime = moment(data.date_time).format().slice(0,16);
        data.userId = request.cookies.userId;
        data.species = result2.rows;
        data.speciesIds = [];

        result3.rows.forEach((row) => data.speciesIds.push(row.id));

        response.render("editNote", data);
      });
    });
  });
});

app.put("/note/:id/edit", (request, response) => {
  let speciesIds = request.body.speciesIds;

  if (typeof(speciesIds) === 'string') {
    speciesIds = [speciesIds];
  }

  const sqlQuery = `UPDATE notes SET behavior='${request.body.behavior}', flock_size='${request.body.flockSize}', date_time='${request.body.dateTime}' WHERE id=${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const sqlQuery2 = `DELETE FROM notes_species WHERE notes_id=${request.params.id}`;

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
        return;
      }

      let queryDoneCounter = 0;

      speciesIds.forEach((speciesId) => {
        const sqlQuery3 = `INSERT into notes_species (notes_id, species_id) VALUES (${request.params.id}, ${speciesId})`;

        pool.query(sqlQuery3, (error3, result3) => {
          if (error3) {
            console.log("Error executing query", error3.stack);
            return;
          }

          queryDoneCounter += 1;

          if (queryDoneCounter === speciesIds.length) {
            response.redirect(`/note/${request.params.id}`);
          }
        })
      });

    })
  });
});

app.delete("/note/:id/delete", (request, response) => {
  const sqlQuery = `DELETE FROM notes WHERE id=${request.params.id}`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    const sqlQuery2 = `DELETE FROM notes_species WHERE notes_id=${request.params.id}`;

    pool.query(sqlQuery2, (error2, result2) => {
      if (error2) {
        console.log("Error executing query", error2.stack);
        return;
      }

      const sqlQuery3 = `DELETE FROM comments WHERE notes_id=${request.params.id}`;

      pool.query(sqlQuery3, (error3, result3) => {
        if (error3) {
          console.log("Error executing query", error3.stack);
          return;
        }

        response.redirect(`/`);
      });
    });
  });
});

app.post("/note/:id/comment", (request, response) => {
  const comment = request.body.comment;
  const createdAt = new Date();
  const userId = request.cookies.userId;
  const noteId = request.params.id;

  const sqlQuery = `INSERT INTO comments (comment, user_id, note_id) VALUES ('${comment}', ${userId}, ${noteId})`;

  pool.query(sqlQuery, (error, result) => {
    if (error) {
      console.log("Error executing query", error.stack);
      return;
    }

    response.redirect(`/note/${request.params.id}`);
  })
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
    


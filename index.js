import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "World",
  password: process.env.PASSWORD_DB,
  port: 5432,
});

db.connect();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set("view engine", "ejs");
let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  )

  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
async function checkCurrentUser(){
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return  users.find((user) => user.id == currentUserId);
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await checkCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser ? currentUser.color : "grey",
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await checkCurrentUser();
  try {
    const result = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%'; ", [input.toLowerCase()]
  );
  if(result.rows.length > 0){
    const countryCode = result.rows[0].country_code;
    try {
      await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)", [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (error) {
      console.log("Error inserting visited country:", error);
      res.status(500).send("Error inserting visited country");
    }
  } else{
    res.status(404).send("Country not found");
  }
  } catch (error) {
    console.log("Error querying country", error);
    res.status(500).send("Error querying country");
  }
});
app.post("/user", async (req, res) => {
 try {
  if(req.body.add === "new"){
    res.render("new.ejs");
  }else{
    currentUserId = req.body.user;
    res.redirect("/");
  }
 } catch (error) {
  console.log("Error fetching user data:", error);
  res.status(500).send("Error fetching user data");
 }
});

app.post("/new", async (req, res) => {
  const newUser = req.body["name"];
  const newUserColor = req.body["color"]
  try {
    const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING * ;", [newUser, newUserColor]);
    const newUserData = result.rows[0];
    users.push(newUserData);
    currentUserId = newUserData.id;
    res.redirect("/");
  } catch (error) {
    console.log("Error adding new user", error);
    res.status(500).send("Error adding new user");
  }
 
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

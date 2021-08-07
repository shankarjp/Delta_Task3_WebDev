const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/votingdb", {useNewUrlParser: true});

const userSchema = {
  username: String,
  role: String,
  password: String
};
const pollSchema = {
  id: Number,
  title: String,
  choices: Array,
};

const User = mongoose.model("User", userSchema);
const Poll = mongoose.model("Poll", pollSchema);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  User.find({username: req.body.username, role: req.body.role, password: req.body.password}, (err, docs) => {
    if(err) {
      console.log(err);
      res.redirect("/login");
    } else {
      if(docs.length !== 0) {
        res.render("dashboard");
      } else {
        console.log("Try Again!");
        res.redirect("/login");
      };
    };
  });
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  if(req.body.confirmpassword === req.body.password) {
    let user = new User({
      username: req.body.username,
      role: req.body.role,
      password: req.body.password
    });
    user.save();
    console.log("User successfully added!");
    res.render("dashboard");
  } else {
    console.log("Try Again!");
    res.redirect("/register");
  };
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Database Setup
mongoose.connect("mongodb://localhost:27017/votingdb", { useNewUrlParser: true, useUnifiedTopology: true });

const optionSchema = new mongoose.Schema({
  option: String,
  votes: {
    type: Number,
    default: 0
  }
});

const pollSchema = new mongoose.Schema({
  user: String,
  question: String,
  options: [optionSchema],
  created: {
    type: Date,
    default: Date.now
  },
  teamname: String
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  polls: [pollSchema],
  teams: [{
    teamname: String
  }]
});

const teamSchema = new mongoose.Schema({
  teamname: {
    type: String,
    required: true
  },
  members: [userSchema],
  admins: [userSchema]
});

const Team = mongoose.model('Team', teamSchema);
const User = mongoose.model('User', userSchema);
const Option = mongoose.model('Option', optionSchema);
const Poll = mongoose.model('Poll', pollSchema);

//localStorage Setup
if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}
localStorage.setItem('user', 'null');

//Login Page
app.post("/login", (req, res) => {
  if(localStorage.getItem('user') === null) {
    User.find({username: req.body.username, password: req.body.password}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        if(docs.length !== 0) {
          console.log("Successful Login!");
          localStorage.setItem('user', req.body.username);
        } else {
          console.log("Try Again!");
        };
      };
    });
  } else {
    console.log("Successful Login!");
  };
});

//Register Page
app.post("/register", (req, res) => {
  if(req.body.confirmpassword === req.body.password) {
    let user = new User({
      username: req.body.username,
      password: req.body.password
    });
    user.save();
    console.log("User successfully added!");
    localStorage.setItem('user', req.body.username);
  } else {
    console.log("Try Again!");
  };
});

//Logout page
app.get("/logout", (req, res) => {
  localStorage.setItem('user', null);
  console.log("Logout Successful!");
})

//Create Team Page
app.post("/createteam", (req, res) => {
  console.log(localStorage.getItem('user'));
  if(localStorage.getItem('user') !== 'null') {
    // User.findOne({username: localStorage.getItem('user')}, (err, docs) => {
    User.findOne({username: req.body.username}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        let team = new Team({
          teamname: req.body.teamname,
          members: [],
          admins: [docs]
        });
        team.save();
        console.log("Team Successfully Created!");
      };
    });
  } else {
    res.send("Permission Denied!");
  }
});

//Add Members page
app.post("/addmember/:team", (req, res) => {
  if(localStorage.getItem('user') === 'null') {
    User.findOne({username: req.body.username}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        if(docs.length !== 0) {
          Team.updateOne({teamname: req.params.team}, {'$push': {members: docs}}, (err, result) => {
            if(err) {
              console.log(err)
            };
          });
        } else {
          console.log("No User Found!");
        };
      };
    });
  } else {
    res.send("Permission Denied!");
  }
});


//Add Admins page
app.post("/addadmin/:team", (req, res) => {
  if(localStorage.getItem('user') !== null) {
    User.findOne({username: req.body.username}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        if(docs.length !== 0) {
          Team.updateOne({teamname: req.params.team}, {'$push': {admins: docs}}, (err, result) => {
            if(err) {
              console.log(err)
            };
          });
        } else {
          console.log("No User Found!");
        };
      };
    });
  } else {
    res.send("Permission Denied!");
  }
});


//Create Poll page
app.post("/createpoll", (req, res) => {
  if(localStorage.getItem('user') === 'null') {
    console.log(req.body);
    Team.findOne({teamname: req.body.teamname}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        if(docs.length !== 0) {
          let poll = new Poll({
            // user: localStorage.getItem('user'),
            user: req.body.user,
            question: req.body.question,
            options: req.body.options.map(option => ({
              option,
              votes: 0
            })),
            teamname: req.body.teamname
          });
          poll.save();
          console.log("Poll successfully added!");
        } else {
          console.log("No Team Found!");
        };
      };
    });
  } else {
    res.send("Permission Denied!");
  };
});

//View All Polls Team Dashboard
app.get("/viewpoll/:team", (req, res) => {
  if(localStorage.getItem('user') !== null) {
    Poll.find({teamname: req.params.team}, (err, docs) => {
      if(err) {
        console.log(err);
      } else {
        console.log("Query Recieved!");
        res.json(docs);
      };
    });
  } else {
    res.send("Permission Denied!");
  };
});

//View User Created Polls
app.get("/createdpolls", (req, res) => {
  if(localStorage.getItem('user') !== null) {
    Poll.find({user: req.body.username}, (err, docs) => {
      User.updateOne({username: req.body.username}, {'$set': {polls: docs}}, (err, result) => {
        if(err) {
          console.log(err);
        };
        console.log(result);
      });
    });
    console.log("User Updated");
  } else {
    res.send("Permission Denied!");
  };

  // User.findOne({username: req.params.user}, (err, user) => {
  //   if(err) {
  //     console.log(err);
  //   } else {
  //     Poll.find({user: req.params.user}, (err, docs) => {
  //       for(var i=0; i<docs.length; i++) {
  //         let poll = {
  //           question: docs[i].question,
  //           options: docs[i].options,
  //           voted: docs[i].voted,
  //           created: docs[i].created
  //         };
  //         console.log(poll);
  //         user.polls = user.polls.push(poll);
  //         console.log(user.polls);
  //       };
  //     });
  //   };
  //   console.log(user);
  // });

  // let pollarray = []
  // Poll.find({user: req.params.user}, (err, docs) => {
  //   if(err) {
  //     console.log(err);
  //   } else {
  //     pollarray = docs;
  //   };
  // });
  // User.updateOne({username: req.params.user}, { $set: {polls: pollarray} }, (err, docs) => {
  //   if(err) {
  //     console.log(err);
  //   } else {
  //     console.log("Updated document: ", docs);
  //   };
  // });
});

app.get("/", (req, res) => {
  if(localStorage.getItem('user') !== null) {
    res.send("Hello World!");
  } else {
    res.send("Permission Denied!");
  };
});

//Voting page


app.listen(4000, () => {
  console.log("Server running on port 4000");
});

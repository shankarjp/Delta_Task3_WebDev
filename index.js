const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//Database Setup
mongoose.connect("mongodb://localhost:27017/votingdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
  voted: Array,
  created: {
    type: Date,
    default: Date.now
  },
  teamname: String,
  active: Boolean,
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
  admins: [userSchema],
  polls: [pollSchema]
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
app.get("/login", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    res.redirect("/");
  } else {
    res.render("login");
  };
});

app.post("/login", (req, res) => {
  User.find({
    username: req.body.username,
    password: req.body.password
  }, (err, docs) => {
    if (err) {
      console.log(err);
    } else {
      if (docs.length !== 0) {
        localStorage.setItem('user', req.body.username);
        res.redirect("/");
      } else {
        console.log("Try Again!");
        res.redirect("/login");
      };
    };
  });
});

//Register Page
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  if (req.body.confirmpassword === req.body.password) {
    let user = new User({
      username: req.body.username,
      password: req.body.password
    });
    user.save();
    console.log("User successfully added!");
    res.redirect("/");
    localStorage.setItem('user', req.body.username);
  } else {
    console.log("Try Again!");
    res.redirect("/register");
  };
});

//Logout page
app.get("/logout", (req, res) => {
  localStorage.setItem('user', null);
  console.log("Logout Successful!");
  res.redirect("/login");
})

//Create Team Page
app.get("/createteam", (req, res) => {
  console.log(`Logged in as ${localStorage.getItem('user')}`);
  if (localStorage.getItem('user') !== 'null') {
    res.render("createteam");
  } else {
    res.redirect("/login");
  };
})

app.post("/createteam", (req, res) => {
  Team.find({
    teamname: req.body.teamname
  }, (err, team) => {
    if (err) {
      console.log(err);
    } else {
      if (team.length === 0) {
        User.findOne({
          username: localStorage.getItem('user')
        }, (err, docs) => {
          if (err) {
            console.log(err);
          } else {
            let team = new Team({
              teamname: req.body.teamname,
              members: [],
              admins: [docs],
              polls: []
            });
            team.save();
            console.log("Team Successfully Created!");
          };
        });
        User.updateOne({
          username: localStorage.getItem('user')
        }, {
          '$push': {
            teams: {
              teamname: req.body.teamname
            }
          }
        }, (err, result) => {
          if (err) {
            console.log(err);
          };
        });
      } else {
        console.log("Team Already Exists!");
      };
    };
  });
  res.redirect("/");
});

//Add Members page
app.get("/addmember/:team", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    res.render("addmember", {
      team: req.params.team
    });
  } else {
    res.redirect("/login");
  };
});

app.post("/addmember/:team", (req, res) => {
  User.find({
    username: req.body.username
  }, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      if (info.length !== 0) {
        teamlist = [];
        for (let j = 0; j < info[0].teams.length; j++) {
          teamlist.push(info[0].teams[j].teamname);
        };
        if (teamlist.includes(req.params.team)) {
          console.log("User Already part of Team!");
        } else {
          let adminlist = [];
          Team.findOne({
            teamname: req.params.team
          }, (err, docs) => {
            for (let i = 0; i < docs.admins.length; i++) {
              adminlist.push(docs.admins[i].username);
            };
            if (adminlist.includes(localStorage.getItem('user'))) {
              User.findOne({
                username: req.body.username
              }, (err, user) => {
                Team.updateOne({
                  teamname: req.params.team
                }, {
                  '$push': {
                    members: user
                  }
                }, (err, result) => {
                  if (err) {
                    console.log(err);
                  };
                });
              })
              User.updateOne({
                username: req.body.username
              }, {
                '$push': {
                  teams: {
                    teamname: req.params.team
                  }
                }
              }, (err, result) => {
                if (err) {
                  console.log(err);
                };
              });
              console.log("Member Successfully Added!");
            } else {
              console.log("Permission Denied!");
            };
          });
        }
      } else {
        console.log("User Not Found!");
      };
    };
  });
  res.redirect("/");
});


//Add Admins page
app.get("/addadmin/:team", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    res.render("addadmin", {
      team: req.params.team
    });
  } else {
    res.redirect("/login");
  }
})

app.post("/addadmin/:team", (req, res) => {
  User.find({
    username: req.body.username
  }, (err, info) => {
    if (err) {
      console.log(err);
    } else {
      if (info.length !== 0) {
        teamlist = [];
        for (let j = 0; j < info[0].teams.length; j++) {
          teamlist.push(info[0].teams[j].teamname);
        };
        if (teamlist.includes(req.params.team)) {
          console.log("User Already part of Team!");
        } else {
          let adminlist = [];
          Team.findOne({
            teamname: req.params.team
          }, (err, docs) => {
            for (let i = 0; i < docs.admins.length; i++) {
              adminlist.push(docs.admins[i].username);
            };
            if (adminlist.includes(localStorage.getItem('user'))) {
              User.findOne({
                username: req.body.username
              }, (err, user) => {
                Team.updateOne({
                  teamname: req.params.team
                }, {
                  '$push': {
                    admins: user
                  }
                }, (err, result) => {
                  if (err) {
                    console.log(err);
                  };
                });
              })
              User.updateOne({
                username: req.body.username
              }, {
                '$push': {
                  teams: {
                    teamname: req.params.team
                  }
                }
              }, (err, result) => {
                if (err) {
                  console.log(err);
                };
              });
              console.log("Admin Successfully Added!");
            } else {
              console.log("Permission Denied!");
            };
          });
        }
      } else {
        console.log("User Not Found!");
      };
    };
  });
  res.redirect("/");
});


//Create Poll page
let optionNumber = 1;
app.get("/createpoll/:team", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    optionNumber = 1;
    res.render("createpoll", {
      team: req.params.team,
      n: optionNumber
    });
  } else {
    res.redirect("/login");
  };
});

app.post("/createpoll/:team", (req, res) => {
  console.log(req.body);
  if (req.body.action === "add") {
    optionNumber++;
    res.render("createpoll", {
      team: req.params.team,
      n: optionNumber
    });
  } else {
    Team.findOne({
      teamname: req.params.team
    }, (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        if (docs.length !== 0) {
          let poll = new Poll({
            user: localStorage.getItem('user'),
            question: req.body.question,
            options: req.body.options.map(option => ({
              option,
              votes: 0
            })),
            voted: [],
            teamname: req.params.team,
            active: true
          });
          poll.save();
          console.log("Poll successfully added!");
          Team.updateOne({
            teamname: req.params.team
          }, {
            '$push': {
              polls: poll
            }
          }, (err, result) => {
            if (err) {
              console.log(err);
            };
          });
          User.updateOne({
            username: localStorage.getItem('user')
          }, {
            '$push': {
              polls: poll
            }
          }, (err, result) => {
            if (err) {
              console.log(err);
            };
          });
        } else {
          console.log("No Team Found!");
        };
      };
    });
  };
  res.redirect("/");
});

//View All Polls Team Dashboard
app.get("/viewpoll/:team", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    Poll.find({
      teamname: req.params.team,
      active: true
    }, (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.render("viewpoll", {
          docs: docs,
          teamname: req.params.team
        });
      };
    });
  } else {
    res.redirect("/login");
  };
});

app.post("/viewpoll/:team", (req, res) => {
  let questionid = null;
  let targetoption = null;
  let currentvotes = null;
  Poll.findOne({_id: req.body.action.slice(0,-1)}, (err, docs) => {
    if(err) {
      console.log(err);
    } else {
      console.log(req.body);
      console.log(docs);
      console.log(req.body.action.slice(0,-1));
      console.log(req.body.action[req.body.action.length - 1]);
      questionid = req.body.action.slice(0,-1);
      targetoption = req.body.action[req.body.action.length - 1];
      currentvotes = parseInt(docs.options[targetoption].votes);
      console.log(currentvotes);
      currentvotes += 1;
      console.log(currentvotes);
      Poll.updateOne({
        _id: questionid
      }, {
        '$set': {
          [`options.${targetoption}.votes`]: currentvotes
        }
      }, (err, result) => {
        if (err) {
          console.log(err);
        };
        console.log("Inside the Update Block");
        console.log(result);
      });
      Poll.updateOne({
        _id: questionid,
      }, {'$push': { voted: localStorage.getItem('user') }}, (err, result) => {
        if(err) {
          console.log(err);
        } else {
          console.log(result);
        };
      });
    }
  })

  // Poll.find({
  //   teamname: req.params.team
  // }, (err, docs) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log(req.body);
  //     console.log(docs);
  //     console.log(req.body.action.slice(0,-1));
  //     console.log(req.body.action[req.body.action.length - 1]);
  //     questionid = req.body.action.slice(0,-1);
  //     targetoption = req.body.action[req.body.action.length - 1];
  //     currentvotes = parseInt(docs[req.body.action[0]].options[req.body.action[1]].votes);
  //     console.log(currentvotes);
  //     currentvotes += 1;
  //     console.log(currentvotes);
  //     Poll.updateOne({
  //       _id: questionid
  //     }, {
  //       '$set': {
  //         [`options.${req.body.action[1]}.votes`]: currentvotes
  //       }
  //     }, (err, result) => {
  //       if (err) {
  //         console.log(err);
  //       };
  //       console.log("Inside the Update Block");
  //       console.log(result);
  //     });
  //     Poll.updateOne({
  //       _id: questionid,
  //     }, {'$push': { voted: localStorage.getItem('user') }}, (err, result) => {
  //       if(err) {
  //         console.log(err);
  //       } else {
  //         console.log(result);
  //       };
  //     });
  //   };
  // });
  res.redirect("/");
});

//View User Created Polls
app.get("/createdpolls", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    Poll.find({
      user: localStorage.getItem('user')
    }, (err, docs) => {
      User.updateOne({
        username: localStorage.getItem('user')
      }, {
        '$set': {
          polls: docs
        }
      }, (err, result) => {
        if (err) {
          console.log(err);
        };
      });
    });
    User.findOne({
      username: localStorage.getItem('user')
    }, (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.render("createdpolls", {
          docs: docs
        });
      };
    });
    console.log("User Updated");
  } else {
    res.send("Permission Denied!");
  };
});

app.post("/createdpolls", (req, res) => {
  console.log(req.body);
  User.findOne({
    username: localStorage.getItem('user')
  }, (err, user) => {
    if (err) {
      console.log(err);
    } else {
      console.log(user.polls[req.body.action]._id);
      Poll.updateOne({
        _id: user.polls[req.body.action]._id
      }, {
        '$set': {
          active: false
        }
      }, (err, result) => {
        if (err) {
          console.log(err);
        } else {
          console.log(result);
        };
      });
    };
  });
  res.redirect("/");
});

//Home Page
app.get("/", (req, res) => {
  if (localStorage.getItem('user') !== 'null') {
    User.findOne({
      username: localStorage.getItem('user')
    }, (err, docs) => {
      if (err) {
        console.log(err);
      } else {
        res.render("home", {
          docs: docs
        });
      };
    });
    console.log(`Logged in as ${localStorage.getItem('user')}`);
  } else {
    console.log("Permission Denied!");
    res.redirect("/register");
  };
});

//Voting page


app.listen(3000, () => {
  console.log("Server running on port 3000");
});

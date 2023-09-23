const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");
const jsonMiddleware = express.json();
app.use(jsonMiddleware);
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http:/localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
  }
};
initializeDBAndServer();
//authentication
function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        // request.username = payload.username;
        next();
      }
    });
  }
}

const conObject = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

const conObject1 = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

const conObject2 = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.likes,
    replies: dbObject.replies,
    dateTime: dbObject.date_time,
  };
};

//Get API-1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  console.log(username, password, name, gender);
  const a = ` SELECT * FROM user          
        WHERE 
            username = '${username}';`;
  const arr = await db.get(a);
  if (arr !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      console.log(password.length);
      response.status(400);
      response.send("Password is too short");
    } else {
      const getQuery = `
        INSERT INTO user (username,password,name,gender)
        VALUES
        (
            '${username}',
            '${password}',
            '${name}',
            '${gender}'
        )
        ;`;
      const Array = await db.run(getQuery);
      const id = Array.lastID;
      response.send("User created successfully");
    }
  }
});
//API-2
app.post("/login/", authenticateToken, async (request, response) => {
  const { username, password } = request.body;
  const getA1 = `SELECT * from tweet natural join user where username='${username}';`;
  const dbUser = await db.get(getA1);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
//API-3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const selectDuaDateQuery = `
        SELECT * from tweet natural join user order by username desc limit 4
        ;`;
  const arr = await db.all(selectDuaDateQuery);
  response.send(arr.map((each) => conObject(each)));
});
//API-4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const sel = `
        SELECT distinct(name) from user u,follower f where f.following_user_id=u.user_id 
        ;`;

  const arr = await db.all(sel);
  const name = arr.name;
  // console.log({ name });
  response.send(arr.map((each) => conObject1(each)));
});
//API-5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const sel = `
        SELECT distinct(name) from user u,follower f where f.follower_user_id=u.user_id 
        ;`;

  const arr = await db.all(sel);
  const name = arr.name;
  // console.log({ name });
  response.send(arr.map((each) => conObject1(each)));
});

// API-6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const sel = `
        SELECT * from tweet t,user u where tweet_id='${tweetId}' and u.user_id=t.user_id
        ;`;

  const arr = await db.all(sel);
  const name = arr.name;
  // console.log({ name });
  response.send(arr.map((each) => conObject2(each)));
});
module.exports = app;
